import type { Response, NextFunction } from "express";
import { streamText, convertToModelMessages, stepCountIs, type UIMessage } from "ai";
import { buildAnalystTools, resolveReportMatches, type ReportMatch } from "./analyst.tools.js";
import {
  filterFromScope,
  inferSinglePeriodFromText,
  lastUserText,
  looksLikeVatPeriodQuestion,
  type KnownPeriod,
} from "./analyst.attach.js";
import { storageRepository } from "../data/storage.repository.js";
import type { AuthRequest } from "../../middlewares/auth.js";
import { ok } from "../../shared/response.js";
import { analystService } from "./analyst.service.js";
import { conversationRepository } from "./analyst.repository.js";
import { AppError } from "../../shared/errors.js";
import type {
  StreamAnalystInput,
  CreateConversationInput,
  RenameConversationInput,
  AddMessagesInput,
  AnalystMode,
} from "./analyst.dto.js";

/** Express types repeated params as an array; conversations only ever take one. */
function paramId(value: string | string[] | undefined): string {
  const id = Array.isArray(value) ? value[0] : value;
  if (!id) throw new AppError("Conversation not found", 404);
  return id;
}

/** How many recent messages actually go to the model per request; see the note in `stream`. */
const MAX_HISTORY_MESSAGES_SENT = 16;

type StreamMetadata = Awaited<ReturnType<typeof analystService.prepareStream>>["metadata"] & {
  reportMatches: ReportMatch[];
};

function sourcesAsPeriods(metadata: StreamMetadata): KnownPeriod[] {
  const out: KnownPeriod[] = [];
  for (const s of metadata.sources ?? []) {
    if (!s.payload) continue;
    out.push({
      label: s.period,
      fileType: s.payload.fileType,
      year: s.payload.year,
      month: s.payload.month,
      quarter: s.payload.quarter,
    });
  }
  return out;
}

export class AnalystController {
  listConversations = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      res.json(ok(await conversationRepository.list(req.user!.id)));
    } catch (e) {
      next(e);
    }
  };

  getConversation = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const found = await conversationRepository.get(req.user!.id, paramId(req.params.id));
      if (!found) throw new AppError("Conversation not found", 404);
      res.json(ok(found));
    } catch (e) {
      next(e);
    }
  };

  createConversation = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { title, mode } = req.body as CreateConversationInput;
      res.json(ok(await conversationRepository.create(req.user!.id, title, mode)));
    } catch (e) {
      next(e);
    }
  };

  renameConversation = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { title } = req.body as RenameConversationInput;
      const done = await conversationRepository.rename(req.user!.id, paramId(req.params.id), title);
      if (!done) throw new AppError("Conversation not found", 404);
      res.json(ok({ id: paramId(req.params.id), title }));
    } catch (e) {
      next(e);
    }
  };

  deleteConversation = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const done = await conversationRepository.remove(req.user!.id, paramId(req.params.id));
      if (!done) throw new AppError("Conversation not found", 404);
      res.json(ok({ id: paramId(req.params.id) }));
    } catch (e) {
      next(e);
    }
  };

  addMessages = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { messages } = req.body as AddMessagesInput;
      const updated = await conversationRepository.addMessages(
        req.user!.id,
        paramId(req.params.id),
        messages.map((m) => ({ ...m, metadataJson: m.metadataJson ?? null })),
      );
      if (!updated) throw new AppError("Conversation not found", 404);
      res.json(ok(updated));
    } catch (e) {
      next(e);
    }
  };

  quota = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      res.json(ok(await analystService.quota(req.user!.id)));
    } catch (e) {
      next(e);
    }
  };

  stream = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { messages, language, mode, scope } = req.body as StreamAnalystInput;
    try {
      // The client keeps and persists full history (up to 60 messages) for the
      // History drawer, but only the tail actually needs to reach the model —
      // cost grows linearly with what we resend, and answers rarely depend on
      // anything past a handful of turns back. Trimming here doesn't touch what
      // gets shown or saved; it only shrinks what's sent to Gemini per request.
      const recentMessages = (messages as UIMessage[]).slice(-MAX_HISTORY_MESSAGES_SENT);
      const userText = lastUserText(recentMessages);

      // Sellers often leave Strategy selected, then ask "jan 2026 summary".
      // That must hit VAT-data (tools + report cards), not the strategy template.
      let effectiveMode: AnalystMode = mode ?? "vat-data";
      if (
        effectiveMode === "ecommerce-strategy" &&
        looksLikeVatPeriodQuestion(userText)
      ) {
        const periods = await storageRepository.listProcessedPeriods(req.user!.email);
        if (periods.length) effectiveMode = "vat-data";
      }

      const prepared = await analystService.prepareStream(
        req.user!.id,
        req.user!.email,
        language,
        effectiveMode,
        scope,
      );
      const { model, system } = prepared;
      const metadata: StreamMetadata = {
        ...prepared.metadata,
        reportMatches: prepared.metadata.reportMatches ?? [],
      };

      // Deterministic attach for single-period questions ("January summary") so
      // download cards do not depend on the model remembering findReports. Never
      // invent files — resolveReportMatches only returns formats that exist on disk.
      if (effectiveMode === "vat-data" && metadata.reportMatches.length === 0) {
        const filter =
          filterFromScope(scope ?? { type: "all" }) ||
          inferSinglePeriodFromText(userText, sourcesAsPeriods(metadata));
        if (filter) {
          metadata.reportMatches = (
            await resolveReportMatches(req.user!.email, filter)
          ).matches;
        }
      }

      // NOTE on explicit Gemini context caching (cachedContent): deliberately not
      // wired up. Google's API rejects any GenerateContent request that combines
      // cachedContent with system_instruction, tools, or tool_config in the same
      // call (confirmed against a live report: https://github.com/vercel/ai/issues/3333) —
      // and this route uses both `system` and `tools` together, which is exactly
      // the combination that request rejects. The documented fix is to bake
      // system_instruction and tools into the CachedContent object itself at
      // creation time and stop sending them per-request, which means bypassing
      // the AI SDK's tools abstraction for a hand-rolled tool loop against the
      // raw @google/generative-ai client — a real rewrite, not a config change.
      // Worth revisiting once volume justifies it; until then this route relies
      // on Gemini's automatic *implicit* caching, which needs no code changes —
      // it discounts a request automatically when its prefix matches a recent
      // prior request byte-for-byte. `system` is built the same deterministic
      // way from the same data on every turn of a conversation, so it already
      // qualifies as long as the two requests land inside Google's short caching
      // window; compactForPrompt (analyst.summary.ts) exists partly to make that
      // stable prefix smaller and cheaper even before any caching discount lands.
      const result = streamText({
        model,
        system,
        messages: await convertToModelMessages(recentMessages),
        // Report lookup is only meaningful against the seller's own figures.
        tools: effectiveMode === "vat-data" ? buildAnalystTools(req.user!.email) : undefined,
        // Room to inspect two periods and then answer, e.g. a comparison.
        stopWhen: stepCountIs(5),
        // Strategy answers are longer and more discursive than a figure lookup.
        temperature: effectiveMode === "ecommerce-strategy" ? 0.7 : 0.4,
        maxOutputTokens: effectiveMode === "ecommerce-strategy" ? 1200 : 768,
        onStepFinish: async ({ toolResults }) => {
          // Prefer the tool's confirmed matches when findReports ran; also attach
          // when detail/insights grounded the answer in exactly one period.
          const periods = new Map<string, PeriodKey>();
          let fromFindReports: ReportMatch[] | null = null;

          for (const tr of toolResults) {
            if (tr.toolName === "findReports") {
              const out = tr.output as { matches?: ReportMatch[] } | undefined;
              if (Array.isArray(out?.matches)) fromFindReports = out.matches;
              continue;
            }
            if (tr.toolName !== "getPeriodDetail" && tr.toolName !== "getInsightsSummary") {
              continue;
            }
            const out = tr.output as
              | { found?: boolean; period?: PeriodKey }
              | undefined;
            if (!out?.found || !out.period) continue;
            const key = periodKey(out.period);
            periods.set(key, out.period);
          }

          if (fromFindReports) {
            metadata.reportMatches = fromFindReports;
            return;
          }
          if (metadata.reportMatches.length > 0) return;
          if (periods.size !== 1) return;
          const only = [...periods.values()][0];
          metadata.reportMatches = (
            await resolveReportMatches(req.user!.email, {
              fileType: only.fileType,
              year: only.year,
              month: only.month,
              quarter: only.quarter,
            })
          ).matches;
        },
      });

      // Errors raised after headers are sent can't become a JSON error response,
      // so surface them as stream content the client can render inline.
      result.pipeUIMessageStreamToResponse(res, {
        // Attached to the assistant message so the client can show which periods
        // and countries an answer was actually grounded in — plus any confirmed
        // report downloads for a single-period answer.
        messageMetadata: () => metadata,
        onError: (error) => {
          console.error("[analyst] stream error:", error);
          return "The AI service dropped mid-answer. Please try again, or check the Review tab for exact figures.";
        },
      });
    } catch (e) {
      // Pre-stream failures (403 / 404 / 503) still have an untouched response.
      next(e);
    }
  };
}

type PeriodKey = {
  fileType: "monthly" | "quarterly";
  year: number;
  month?: string;
  quarter?: string;
};

function periodKey(p: PeriodKey): string {
  return `${p.fileType}:${p.year}:${p.month ?? ""}:${(p.quarter || "").toUpperCase()}`;
}

export const analystController = new AnalystController();

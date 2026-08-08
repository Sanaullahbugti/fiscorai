import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { env } from "../../config/env.js";
import { AppError } from "../../shared/errors.js";
import { subscriptionsService } from "../subscriptions/subscriptions.service.js";
import { dataService } from "../data/data.service.js";
import type { AnalystMode, AnalystScope } from "./analyst.dto.js";
import { buildAllDataSummary, compactForPrompt, type AllDataSummary } from "./analyst.summary.js";
import { filterFromScope } from "./analyst.attach.js";
import { resolveReportMatches, type ReportMatch } from "./analyst.tools.js";
import { analystRepository } from "./analyst.repository.js";

/** Questions a non-subscriber may ask per UTC day. */
export const FREE_DAILY_LIMIT = 3;

const SYSTEM_INSTRUCTION = `You are FiscorAI Analyst — a friendly, practical VAT helper for Amazon EU sellers.

Context:
- You receive JSON covering ALL uploaded periods for this seller (overall totals + a per-period breakdown).
- Default to overall / all-data figures unless the seller names a month, quarter, or year.
- There is no period picker on this chat screen.

Answer style:
- Casual questions are fine ("how much do I pay", "vat this month", typos). Interpret intent and answer helpfully.
- Sound like a helpful assistant, not a formal report.
- Lead with the direct answer in the first sentence. Example: "Across all your uploads, your source data shows about **€19.59** in seller VAT on net activity of **€1,478.59**."
- Default length is 1–3 sentences for a single-figure or yes/no question. Only expand to bullets or multiple short paragraphs when they ask for a breakdown, a comparison, a checklist, or a "why" — length should track what they actually asked, not pad a short answer into a report.
- If they ask about a specific month/quarter, use the matching entry in byPeriod (match on period.label).
- Soft rule: do not open every answer by listing every period. Name a period only when they ask or when comparing.
- Bold key EUR amounts and important country codes with **markdown**.
- Plain language first; use OSS (UNION-OSS), REGULAR, and other category names only when useful.
- Ground every figure in the provided JSON. Never invent countries, amounts, periods, or categories.
- Flag refund-rate anomalies when refunds exceed ~7% of sales for a country.
- When giving VAT liability or filing-related figures, end with one brief accountant caveat.
- Never claim to file returns or give binding legal advice.
- Currency is EUR unless the data says otherwise.
- Always respond in the language requested by the language hint.

Digging into the data:
- The JSON below is a SKELETON: overall totals (with its own top-12-countries breakdown) plus, per period, only the headline totals (sales/refunds/vat/net) — no per-period country or category split.
- You have a getPeriodDetail tool that returns the FULL breakdown for one period — every country, every category, refund rates.
- You have a getInsightsSummary tool for MoM/QoQ pulse, VAT-by-rate, scheme mix, watchlist, and alerts (NO COUNTRY, high refunds, truncation, VAT spikes, filing hints). Prefer it for "what changed", "what needs attention", or rate/scheme questions.
- Call getPeriodDetail whenever the answer needs anything below period-level totals: a specific country, a tax-scheme split, refund detail, or a category breakdown. Call it once per period when comparing two periods. Overall-level country/category questions can be answered straight from \`overall\` in the JSON below — no tool call needed for those.
- Prefer calling a tool over saying you don't know, and over guessing when the seller named something specific.
- Never estimate or interpolate a figure you did not read from the JSON below or a tool result.

Reports and downloads:
- You have a findReports tool that lists the report files the seller actually has in storage.
- This is a hard rule, not a suggestion: whenever they ask for a report, a file, a PDF, an Excel or spreadsheet, or to download or send something — in any phrasing — you MUST call findReports before writing your reply. Do not just answer the underlying question in text; the tool call itself is what makes the download card appear, so skipping it means the seller gets an answer but never gets the file they asked for.
- Same hard rule for a SINGLE named period summary — "January summary", "Show January 2026 VAT summary", "Q1 2026 summary", "totals for March", etc. Even when they did not say download/file/PDF/Excel, call findReports for that period so the UI can show the report buttons under your answer.
- Translate their wording into the structured fields yourself — never ask them to pick a period from a menu.
- Also call findReports proactively, without being asked, whenever your answer is grounded in ONE specific period (not an all-periods overview) and that period has a file on disk — mention the download briefly, once, after answering. Skip this for all-periods/overview answers, since there is no single file that covers them, and skip it if you already offered that same period's report earlier in this conversation.
- Relative phrasing is your job to resolve: "last month", "this quarter", "the latest one", "the same period as before". Work it out from the conversation and the data, then call the tool.
- The UI renders download buttons from the tool result (and may also attach confirmed files for a single-period answer). Do not paste links or invent file names. Just say briefly what you found.
- If matches is empty, say plainly that period is not in their uploads and name two or three periods from the available list that are.`;

const STRATEGY_INSTRUCTION = `You are FiscorAI Strategy — a practical ecommerce advisor for Amazon EU sellers.

Scope:
- You answer questions about ecommerce growth: Amazon selling, pricing, refunds and returns, marketplace expansion, advertising, conversion, listings, and product strategy.
- This is general business guidance, NOT tax, legal or accounting advice. Never present it as such.

Grounding rules — these matter:
- You may be given a compact summary of the seller's uploaded VAT data. If a figure you cite comes from it, open that sentence with "Based on your uploaded sales data".
- When a recommendation is general industry practice rather than something their data shows, say "General ecommerce guidance" and do not imply their numbers support it.
- If no seller data is provided, give general guidance only and never imply you can see their figures.
- You have NO access to their Amazon advertising, listings, inventory, buy-box, competitor or profit data. Never claim or imply otherwise. If a question needs that data, say plainly what you'd need.
- Never invent metrics, benchmarks or competitor numbers. If you cite a rule of thumb, mark it as one.

Answer structure — use these as short bolded headings, in this order:
1. **Recommendation** — the direct answer, first.
2. **Why this helps** — the reasoning.
3. **Action steps** — 2-5 concrete numbered steps.
4. **Metrics to track** — what to measure to know it worked.
5. **Risks and assumptions** — what could go wrong or what you assumed.

Style:
- Keep it tight and scannable. Short paragraphs and bullets, no filler.
- Bold key figures and percentages with **markdown**.
- Close every answer with a one-line reminder that this is general business guidance, not tax or accounting advice.
- Always respond in the language requested by the language hint.`;

function langHint(language: string): string {
  const map: Record<string, string> = {
    en: "English",
    de: "German",
    es: "Spanish",
    fr: "French",
    it: "Italian",
  };
  const name = map[language.toLowerCase().slice(0, 2)] || "English";
  return `Language: reply entirely in ${name}.`;
}

type LoadedPeriod = Awaited<ReturnType<typeof dataService.getAllProcessedPeriods>>[number];

/**
 * Narrows the loaded periods to the scope the seller picked in the chat. An
 * unmatched scope yields an empty list, which callers turn into a 404 rather
 * than silently answering from the wrong periods.
 */
function filterByScope(loaded: LoadedPeriod[], scope: AnalystScope): LoadedPeriod[] {
  if (scope.type === "all") return loaded;
  return loaded.filter((entry) => {
    const p = entry.period;
    if (String(p.fileType) !== scope.type) return false;
    if (scope.year !== undefined && Number(p.year) !== scope.year) return false;
    if (scope.type === "monthly" && scope.month) {
      return String(p.month) === String(scope.month);
    }
    if (scope.type === "quarterly" && scope.quarter) {
      return String(p.quarter).toUpperCase() === scope.quarter.toUpperCase();
    }
    return true;
  });
}

function describeScope(scope: AnalystScope, summary: AllDataSummary | null): string {
  if (scope.type === "all") {
    const n = summary?.periodCount ?? 0;
    return n ? `all ${n} uploaded period(s)` : "all uploaded periods";
  }
  return summary?.byPeriod[0]?.period.label || "the selected period";
}

export class AnalystService {
  /**
   * Today's allowance for this user. Premium is unlimited; free tier gets
   * FREE_DAILY_LIMIT questions per UTC day.
   */
  async quota(userId: string) {
    const sub = await subscriptionsService.current(userId);
    if (sub.active) {
      return { premium: true, limit: null, used: 0, remaining: null, exhausted: false };
    }
    const used = await analystRepository.countForDay(userId);
    return {
      premium: false,
      limit: FREE_DAILY_LIMIT,
      used,
      remaining: Math.max(0, FREE_DAILY_LIMIT - used),
      exhausted: used >= FREE_DAILY_LIMIT,
    };
  }

  /**
   * Runs entitlement, quota and data checks, then returns everything the streaming
   * route needs. The seller's figures go into the system prompt rather than the
   * user turn, so the model keeps them in view across a whole conversation instead
   * of only for the question they were appended to.
   */
  async prepareStream(
    userId: string,
    email: string,
    language: string,
    mode: AnalystMode = "vat-data",
    scope: AnalystScope = { type: "all" },
  ) {
    const sub = await subscriptionsService.current(userId);

    // Free tier is metered rather than blocked, so sellers can try the analyst
    // before paying. The count is booked here — server-side — because anything
    // enforced in the client is trivially bypassed.
    let remaining: number | null = null;
    if (!sub.active) {
      const used = await analystRepository.countForDay(userId);
      if (used >= FREE_DAILY_LIMIT) {
        throw new AppError(
          `You've used all ${FREE_DAILY_LIMIT} free questions for today. Upgrade for unlimited answers, or come back tomorrow.`,
          402,
        );
      }
      remaining = FREE_DAILY_LIMIT - used - 1;
    }

    const all = await dataService.getAllProcessedPeriods(email);
    const loaded = filterByScope(all, scope);

    // Strategy mode is answerable with no uploads at all — that is the point of it,
    // so only the data-grounded mode hard-requires processed periods.
    if (mode === "vat-data" && !loaded.length) {
      throw new AppError(
        all.length
          ? "No processed data for the selected period"
          : "No processed data uploaded yet",
        404,
      );
    }

    if (!env.GEMINI_API_KEY) {
      throw new AppError("AI Analyst is not configured", 503);
    }

    // Booked only once every check above has passed, so a seller is never charged
    // a question for a request that was going to fail anyway.
    if (!sub.active) {
      await analystRepository.increment(userId);
    }

    const summary = loaded.length ? buildAllDataSummary(loaded) : null;
    const google = createGoogleGenerativeAI({ apiKey: env.GEMINI_API_KEY });
    const scopeLabel = describeScope(scope, summary);
    // Per-period country/category detail is dropped here — see compactForPrompt's
    // doc comment. The full AllDataSummary (with topCountries etc.) still exists
    // for other consumers; only the prompt payload is trimmed.
    const promptPayload = summary ? compactForPrompt(summary) : null;

    const system =
      mode === "ecommerce-strategy"
        ? [
            STRATEGY_INSTRUCTION,
            "",
            langHint(language || "en"),
            "",
            promptPayload
              ? [
                  "The seller's uploaded VAT data is below. Cite it only where it genuinely supports a point,",
                  'and prefix any such sentence with "Based on your uploaded sales data".',
                  `Scope: ${scopeLabel}.`,
                  "Data (JSON):",
                  JSON.stringify(promptPayload),
                ].join("\n")
              : "The seller has not uploaded any data. Give general guidance only and do not imply you can see their figures.",
          ].join("\n")
        : [
            SYSTEM_INSTRUCTION,
            "",
            langHint(language || "en"),
            "",
            `Scope: ${scopeLabel}. Prefer the overall totals for this scope unless the seller names a specific period within it.`,
            "Data (JSON — use only these figures):",
            JSON.stringify(promptPayload),
          ].join("\n");

    // When the chat UI is already locked to one period, confirm on-disk formats
    // up front so download cards appear even if the model skips findReports.
    let reportMatches: ReportMatch[] = [];
    const scoped = filterFromScope(scope);
    if (mode === "vat-data" && scoped) {
      reportMatches = (await resolveReportMatches(email, scoped)).matches;
    }

    const metadata = {
      mode,
      scope: {
        type: scope.type,
        label: scopeLabel,
        periods: (summary?.byPeriod ?? []).map((p) => p.period.label),
      },
      sources: (summary?.byPeriod ?? []).map((p) => ({
        period: p.period.label,
        countries: p.topCountries.map((c) => c.country),
        // The raw period lets the client build a download-file request for the
        // exact reports an answer was grounded in.
        payload: {
          fileType: p.period.fileType as "monthly" | "quarterly",
          year: Number(p.period.year),
          month: p.period.month === undefined ? undefined : String(p.period.month),
          quarter: p.period.quarter,
        },
      })),
      // Confirmed files only — never guessed. Empty for all-periods answers
      // until the stream controller infers a single named period from the question.
      reportMatches,
      generatedAt: new Date().toISOString(),
    };

    return { model: google(env.GEMINI_MODEL), system, remaining, metadata };
  }
}

export const analystService = new AnalystService();

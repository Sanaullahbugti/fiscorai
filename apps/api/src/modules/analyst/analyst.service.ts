import { GoogleGenerativeAI } from "@google/generative-ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { env } from "../../config/env.js";
import { AppError } from "../../shared/errors.js";
import { subscriptionsService } from "../subscriptions/subscriptions.service.js";
import { dataService } from "../data/data.service.js";
import type { AskAnalystInput } from "./analyst.dto.js";
import { buildAllDataSummary } from "./analyst.summary.js";
import { analystRepository } from "./analyst.repository.js";

/** Questions a non-subscriber may ask per UTC day. */
export const FREE_DAILY_LIMIT = 3;

const FALLBACK =
  "I couldn't reach the AI service right now. Please try again in a moment, or check the Review tab for your figures. Always verify critical numbers with your accountant.";

const SYSTEM_INSTRUCTION = `You are FiscorAI Analyst — a friendly, practical VAT helper for Amazon EU sellers.

Context:
- You receive JSON covering ALL uploaded periods for this seller (overall totals + a per-period breakdown).
- Default to overall / all-data figures unless the seller names a month, quarter, or year.
- There is no period picker on this chat screen.

Answer style:
- Casual questions are fine ("how much do I pay", "vat this month", typos). Interpret intent and answer helpfully.
- Sound like a helpful assistant, not a formal report.
- Lead with the direct answer in the first sentence. Example: "Across all your uploads, you owe about **€19.59** in VAT on net sales of **€1,478.59**."
- If they ask about a specific month/quarter, use the matching entry in byPeriod (match on period.label).
- Soft rule: do not open every answer by listing every period. Name a period only when they ask or when comparing.
- Keep answers short and scannable: 2–4 short paragraphs or bullets max unless they ask for a deep dive.
- Bold key EUR amounts and important country codes with **markdown**.
- Plain language first; use OSS (UNION-OSS), REGULAR, and other category names only when useful.
- Ground every figure in the provided JSON. Never invent countries, amounts, periods, or categories.
- Flag refund-rate anomalies when refunds exceed ~7% of sales for a country.
- When giving VAT liability or filing-related figures, end with one brief accountant caveat.
- Never claim to file returns or give binding legal advice.
- Currency is EUR unless the data says otherwise.
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

function isQuotaError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /quota|rate.?limit|429|resource.?exhausted/i.test(msg);
}

function isModelError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /not found|404|model|unsupported/i.test(msg);
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
  async prepareStream(userId: string, email: string, language: string) {
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

    const loaded = await dataService.getAllProcessedPeriods(email);
    if (!loaded.length) {
      throw new AppError("No processed data uploaded yet", 404);
    }

    if (!env.GEMINI_API_KEY) {
      throw new AppError("AI Analyst is not configured", 503);
    }

    // Booked only once every check above has passed, so a seller is never charged
    // a question for a request that was going to fail anyway.
    if (!sub.active) {
      await analystRepository.increment(userId);
    }

    const summary = buildAllDataSummary(loaded);
    const google = createGoogleGenerativeAI({ apiKey: env.GEMINI_API_KEY });

    const system = [
      SYSTEM_INSTRUCTION,
      "",
      langHint(language || "en"),
      "",
      "Seller data covers ALL uploaded periods. Prefer overall totals unless they name a specific period.",
      "Data (JSON — use only these figures):",
      JSON.stringify(summary),
    ].join("\n");

    return { model: google(env.GEMINI_MODEL), system, remaining };
  }

  async ask(userId: string, email: string, input: AskAnalystInput) {
    const sub = await subscriptionsService.current(userId);

    // Metered on the same allowance as `prepareStream` — this older non-streaming
    // route stays reachable, so leaving it unmetered would be a way around the cap.
    if (!sub.active) {
      const used = await analystRepository.countForDay(userId);
      if (used >= FREE_DAILY_LIMIT) {
        throw new AppError(
          `You've used all ${FREE_DAILY_LIMIT} free questions for today. Upgrade for unlimited answers, or come back tomorrow.`,
          402,
        );
      }
    }

    const loaded = await dataService.getAllProcessedPeriods(email);
    if (!loaded.length) {
      throw new AppError("No processed data uploaded yet", 404);
    }

    if (!sub.active) {
      await analystRepository.increment(userId);
    }

    const summary = buildAllDataSummary(loaded);

    if (!env.GEMINI_API_KEY) {
      return {
        answer: FALLBACK,
        model: null,
        source: "fallback" as const,
      };
    }

    try {
      const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({
        model: env.GEMINI_MODEL,
        systemInstruction: SYSTEM_INSTRUCTION,
      });

      const prompt = [
        langHint(input.language || "en"),
        "",
        "Seller data covers ALL uploaded periods. Prefer overall totals unless they name a specific period.",
        "Data (JSON — use only these figures):",
        JSON.stringify(summary),
        "",
        `Seller question: ${input.question}`,
      ].join("\n");

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 768,
        },
      });

      const answer = result.response.text()?.trim();
      if (!answer) {
        return { answer: FALLBACK, model: env.GEMINI_MODEL, source: "fallback" as const };
      }

      return {
        answer,
        model: env.GEMINI_MODEL,
        source: "gemini" as const,
      };
    } catch (err) {
      const reason = isQuotaError(err)
        ? "quota"
        : isModelError(err)
          ? "model"
          : "error";
      console.error(`[analyst] Gemini ${reason}:`, err instanceof Error ? err.message : "unknown");
      return {
        answer:
          reason === "quota"
            ? "The AI quota for this project is temporarily exhausted. Please try again later, or use the Review tab for exact figures. Always verify critical numbers with your accountant."
            : FALLBACK,
        model: env.GEMINI_MODEL,
        source: "fallback" as const,
      };
    }
  }
}

export const analystService = new AnalystService();

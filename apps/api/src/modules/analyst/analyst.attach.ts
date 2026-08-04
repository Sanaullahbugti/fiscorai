import { periodLabel } from "./analyst.summary.js";
import type { PeriodFilter, ReportMatch } from "./analyst.tools.js";

const MONTH_NAMES = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

export type KnownPeriod = {
  fileType: "monthly" | "quarterly";
  year: number;
  month?: string;
  quarter?: string;
  label: string;
};

/** Turns a chat UI scope into a storage filter when the seller locked one period. */
export function filterFromScope(scope: {
  type: string;
  year?: number;
  month?: string;
  quarter?: string;
}): PeriodFilter | null {
  if (scope.type === "monthly" && scope.year !== undefined && scope.month) {
    return { fileType: "monthly", year: scope.year, month: String(scope.month) };
  }
  if (scope.type === "quarterly" && scope.year !== undefined && scope.quarter) {
    return {
      fileType: "quarterly",
      year: scope.year,
      quarter: String(scope.quarter).toUpperCase(),
    };
  }
  return null;
}

/**
 * Detects when the seller named exactly one uploaded period in prose
 * ("January 2026", "Q1 summary"). Returns null for overall questions or
 * when two-plus periods are mentioned — those must not auto-attach files.
 */
export function inferSinglePeriodFromText(
  text: string,
  periods: KnownPeriod[],
): PeriodFilter | null {
  if (!text.trim() || periods.length === 0) return null;

  const lower = text.toLowerCase();
  const hits = new Map<string, KnownPeriod>();

  const add = (p: KnownPeriod) => {
    hits.set(`${p.fileType}:${p.year}:${p.month ?? ""}:${(p.quarter || "").toUpperCase()}`, p);
  };

  for (const p of periods) {
    const label = (p.label || periodLabel(p)).toLowerCase();
    if (label && lower.includes(label)) add(p);
  }

  // Month name + year, even when wording is "January summary 2026" / "Jan 2026 VAT".
  for (let i = 0; i < MONTH_NAMES.length; i++) {
    const name = MONTH_NAMES[i];
    const short = name.slice(0, 3);
    for (const p of periods) {
      if (p.fileType !== "monthly" || String(Number(p.month)) !== String(i + 1)) continue;
      const year = String(p.year);
      const named =
        (lower.includes(name) || new RegExp(`\\b${short}\\b`).test(lower)) &&
        lower.includes(year);
      if (named) add(p);
    }
  }

  // Quarter + year: "Q1 2026", "q1 summary".
  for (const p of periods) {
    if (p.fileType !== "quarterly" || !p.quarter) continue;
    const q = String(p.quarter).toUpperCase();
    const year = String(p.year);
    if (lower.includes(q.toLowerCase()) && lower.includes(year)) add(p);
  }

  // Bare month / quarter only when it uniquely identifies one uploaded period.
  if (hits.size === 0) {
    for (let i = 0; i < MONTH_NAMES.length; i++) {
      const name = MONTH_NAMES[i];
      const short = name.slice(0, 3);
      if (!lower.includes(name) && !new RegExp(`\\b${short}\\b`).test(lower)) continue;
      const matches = periods.filter(
        (p) => p.fileType === "monthly" && String(Number(p.month)) === String(i + 1),
      );
      if (matches.length === 1) add(matches[0]);
    }
    for (const q of ["Q1", "Q2", "Q3", "Q4"]) {
      if (!lower.includes(q.toLowerCase())) continue;
      const matches = periods.filter(
        (p) => p.fileType === "quarterly" && String(p.quarter).toUpperCase() === q,
      );
      if (matches.length === 1) add(matches[0]);
    }
  }

  if (hits.size !== 1) return null;
  const only = [...hits.values()][0];
  return {
    fileType: only.fileType,
    year: only.year,
    month: only.month,
    quarter: only.quarter,
  };
}

export function lastUserText(messages: Array<{ role?: string; parts?: unknown[] }>): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "user" || !Array.isArray(m.parts)) continue;
    return m.parts
      .map((p) => {
        if (p && typeof p === "object" && (p as { type?: string }).type === "text") {
          return String((p as { text?: string }).text || "");
        }
        return "";
      })
      .join(" ")
      .trim();
  }
  return "";
}

/**
 * Period + figures asks ("jan 2026 summary", "VAT for Q1") belong in VAT-data
 * mode. Pure growth questions stay in strategy even if they name a month.
 * Includes the common typo "summery".
 */
export function looksLikeVatPeriodQuestion(text: string): boolean {
  const lower = text.toLowerCase();
  const wantsFigures =
    /\b(summar(?:y|ies)|summery|totals?|vat|tax|refunds?|report|pdf|excel|xlsx|breakdown|figures?|owe|liability|sales)\b/.test(
      lower,
    );
  if (!wantsFigures) return false;
  return (
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?|q[1-4])\b/.test(
      lower,
    ) || (/\b20\d{2}\b/.test(lower) && /\b(month|quarter|period)\b/.test(lower))
  );
}

export type StreamReportMeta = {
  reportMatches: ReportMatch[];
};

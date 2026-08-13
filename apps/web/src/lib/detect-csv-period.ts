import { formatPeriodLabel } from "./period-label";

export type CsvPeriodTarget = {
  fileType: "monthly" | "quarterly";
  year: number;
  month: string;
  quarter: string;
};

export type DetectCsvPeriodResult =
  | { ok: true; target: CsvPeriodTarget; sourcePeriods: string[] }
  | { ok: false; code: "MISSING_ACTIVITY_PERIOD" | "MULTIPLE_SOURCE_PERIODS"; sourcePeriods: string[] };

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const PERIOD_RE = /\b(\d{4}-(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC))\b/gi;
const PEEK_BYTES = 512 * 1024;

const QUARTERS: Record<string, number[]> = {
  Q1: [0, 1, 2],
  Q2: [3, 4, 5],
  Q3: [6, 7, 8],
  Q4: [9, 10, 11],
};

export function parseActivityPeriod(value: string): { year: number; monthIndex: number } | null {
  const m = value.trim().toUpperCase().match(/^(\d{4})-([A-Z]{3})$/);
  if (!m) return null;
  const monthIndex = MONTHS.indexOf(m[2]!);
  if (monthIndex < 0) return null;
  return { year: Number(m[1]), monthIndex };
}

export function extractSourcePeriods(text: string): string[] {
  const set = new Set<string>();
  for (const match of text.matchAll(PERIOD_RE)) {
    set.add(match[1]!.toUpperCase());
  }
  return [...set].sort();
}

function quarterFromMonths(parsed: Array<{ year: number; monthIndex: number }>): { year: number; quarter: string } | null {
  if (parsed.length !== 3) return null;
  const year = parsed[0]!.year;
  if (!parsed.every((p) => p.year === year)) return null;
  const idxs = parsed.map((p) => p.monthIndex).sort((a, b) => a - b);
  for (const [quarter, expected] of Object.entries(QUARTERS)) {
    if (idxs[0] === expected[0] && idxs[1] === expected[1] && idxs[2] === expected[2]) {
      return { year, quarter };
    }
  }
  return null;
}

export function periodsToTarget(sourcePeriods: string[]): DetectCsvPeriodResult {
  if (!sourcePeriods.length) {
    return { ok: false, code: "MISSING_ACTIVITY_PERIOD", sourcePeriods };
  }

  const parsed = sourcePeriods.map(parseActivityPeriod);
  if (parsed.some((p) => !p)) {
    return { ok: false, code: "MULTIPLE_SOURCE_PERIODS", sourcePeriods };
  }
  const months = parsed as Array<{ year: number; monthIndex: number }>;

  if (months.length === 1) {
    const { year, monthIndex } = months[0]!;
    return {
      ok: true,
      sourcePeriods,
      target: {
        fileType: "monthly",
        year,
        month: String(monthIndex + 1),
        quarter: `Q${Math.floor(monthIndex / 3) + 1}`,
      },
    };
  }

  const quarter = quarterFromMonths(months);
  if (quarter) {
    return {
      ok: true,
      sourcePeriods,
      target: {
        fileType: "quarterly",
        year: quarter.year,
        month: "1",
        quarter: quarter.quarter,
      },
    };
  }

  return { ok: false, code: "MULTIPLE_SOURCE_PERIODS", sourcePeriods };
}

export function detectPeriodFromCsvText(text: string): DetectCsvPeriodResult {
  return periodsToTarget(extractSourcePeriods(text));
}

async function readBlobText(blob: Blob): Promise<string> {
  if (typeof blob.text === "function") return blob.text();
  if (typeof blob.arrayBuffer === "function") {
    return new TextDecoder().decode(await blob.arrayBuffer());
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file"));
    reader.readAsText(blob);
  });
}

export async function detectCsvPeriod(file: File): Promise<DetectCsvPeriodResult> {
  const blob: Blob =
    typeof file.size === "number" && file.size > PEEK_BYTES ? file.slice(0, PEEK_BYTES) : file;
  const text = await readBlobText(blob);
  return detectPeriodFromCsvText(text);
}

/** Turns API `sourceValue` / `derivedValue` strings into an upload target. */
export function sourcePeriodsToTarget(raw: string): CsvPeriodTarget | null {
  const periods = raw
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  const result = periodsToTarget(periods);
  return result.ok ? result.target : null;
}

export function formatSourcePeriodValue(raw: string): string {
  const target = sourcePeriodsToTarget(raw);
  if (target) return formatPeriodLabel(target);
  return raw.replace(/\s*,\s*/g, ", ").trim() || raw;
}

export function sameCsvPeriod(a: CsvPeriodTarget, b: CsvPeriodTarget): boolean {
  if (a.fileType !== b.fileType || a.year !== b.year) return false;
  if (a.fileType === "monthly") return String(a.month) === String(b.month);
  return String(a.quarter).toUpperCase() === String(b.quarter).toUpperCase();
}

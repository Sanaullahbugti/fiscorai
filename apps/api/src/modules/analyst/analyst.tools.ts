import { tool } from "ai";
import { z } from "zod";
import { storageRepository } from "../data/storage.repository.js";
import { dataService } from "../data/data.service.js";
import { buildInsights } from "../data/insights.js";
import { buildPeriodSummary, periodLabel } from "./analyst.summary.js";

export type ReportDownload = {
  format: string;
  label: string;
  /** Authenticated POST target — client sends JWT; never a raw filesystem path. */
  downloadUrl: string;
};

export type ReportMatch = {
  label: string;
  fileType: "monthly" | "quarterly";
  year: number;
  month?: string;
  quarter?: string;
  formats: string[];
  downloads: ReportDownload[];
};

export type FindReportsOutput = {
  matches: ReportMatch[];
  /** Everything on disk, so the model can name real alternatives when nothing matched. */
  available: string[];
  requested: string | null;
};

export type PeriodFilter = {
  fileType?: "monthly" | "quarterly";
  year?: number;
  month?: string;
  quarter?: string;
};

const FORMAT_LABEL: Record<string, string> = {
  pdf: "PDF",
  xlsx: "Excel",
};

function downloadUrlFor(
  period: { fileType: string; year: number; month?: string; quarter?: string },
  format: string,
): string {
  const params = new URLSearchParams({
    fileType: period.fileType,
    year: String(period.year),
    fileExtension: format,
  });
  if (period.month) params.set("month", period.month);
  if (period.quarter) params.set("quarter", period.quarter);
  // Relative API path — the web client posts here with the session JWT.
  return `/api/v1/data/download-file?${params.toString()}`;
}

function toReportMatch(
  p: {
    fileType: string;
    year: string | number;
    month?: string | number;
    quarter?: string;
  },
  formats: string[],
): ReportMatch {
  const fileType = p.fileType as "monthly" | "quarterly";
  const year = Number(p.year);
  const month = p.month === undefined ? undefined : String(p.month);
  const quarter = p.quarter;
  const base = { fileType, year, month, quarter };
  return {
    label: periodLabel(p),
    ...base,
    formats,
    downloads: formats.map((format) => ({
      format,
      label: FORMAT_LABEL[format] || format.toUpperCase(),
      downloadUrl: downloadUrlFor(base, format),
    })),
  };
}

/**
 * Lists confirmed on-disk report files for this seller. Used by the findReports
 * tool and by the stream controller when auto-attaching downloads for a
 * single-period answer (so the UI does not depend on the model remembering
 * to call the tool).
 */
export async function resolveReportMatches(
  email: string,
  filter: PeriodFilter = {},
): Promise<FindReportsOutput> {
  const periods = await storageRepository.listProcessedPeriods(email);
  const { fileType, year, month, quarter } = filter;

  const matched = periods.filter((p) => {
    if (fileType && String(p.fileType) !== fileType) return false;
    if (year !== undefined && Number(p.year) !== year) return false;
    if (month !== undefined && String(p.month) !== String(Number(month))) return false;
    if (quarter !== undefined) {
      return String(p.quarter).toUpperCase() === quarter.toUpperCase();
    }
    return true;
  });

  const matches: ReportMatch[] = [];
  for (const p of matched) {
    const formats = await storageRepository.listPeriodFormats(email, p);
    if (!formats.length) continue;
    matches.push(toReportMatch(p, formats));
  }

  const requested =
    fileType || year || month || quarter
      ? periodLabel({
          fileType: fileType || "monthly",
          year: year ?? new Date().getFullYear(),
          month,
          quarter,
        })
      : null;

  return {
    matches,
    available: periods.map((p) => periodLabel(p)),
    requested,
  };
}

/**
 * Lets the model resolve a period the seller described in prose ("January 2026",
 * "last quarter") to actual files in their storage. The model supplies structured
 * fields; this only ever reads the authenticated user's own directory, and returns
 * labels and period fields — never filesystem paths.
 */
export function buildAnalystTools(email: string) {
  return {
    /**
     * Pulls the full figures for one period on demand. The system prompt only
     * carries top-12 countries per period, so without this the model cannot
     * answer about a smaller country or a specific tax scheme — it would either
     * guess or say it doesn't know.
     */
    getPeriodDetail: tool({
      description:
        "Get the full breakdown for ONE period: totals, every country (not just the largest), " +
        "per-category splits and refund rates. Call this when the seller asks about a specific " +
        "country, a tax scheme, refund detail, or anything the overview summary does not cover. " +
        "Also call it before comparing two periods — once per period.",
      inputSchema: z.object({
        fileType: z.enum(["monthly", "quarterly"]),
        year: z.number().int().min(2000).max(2100),
        month: z.string().optional().describe("Month number as a string, '1' to '12'"),
        quarter: z.string().optional().describe("One of Q1, Q2, Q3, Q4"),
      }),
      execute: async ({ fileType, year, month, quarter }) => {
        const periods = await storageRepository.listProcessedPeriods(email);
        const match = periods.find((p) => {
          if (String(p.fileType) !== fileType || Number(p.year) !== year) return false;
          if (fileType === "monthly") return String(p.month) === String(Number(month));
          return String(p.quarter).toUpperCase() === String(quarter).toUpperCase();
        });
        if (!match) {
          return {
            found: false as const,
            available: periods.map((p) => periodLabel(p)),
          };
        }

        const { countries } = await dataService.getProcessedJson(email, match);
        // Reuses the same aggregation the reports and dashboard run on, so the
        // model never sees figures computed a second, divergent way.
        const summary = buildPeriodSummary(countries, match, 200);
        return {
          found: true as const,
          label: periodLabel(match),
          totals: summary.totals,
          byCategory: summary.byCategory,
          countryCount: summary.countryCount,
          countries: summary.topCountries,
          // Lets the stream layer auto-attach downloads even if findReports is skipped.
          period: {
            fileType: match.fileType as "monthly" | "quarterly",
            year: Number(match.year),
            month: match.month === undefined ? undefined : String(match.month),
            quarter: match.quarter,
          },
        };
      },
    }),

    getInsightsSummary: tool({
      description:
        "Get the seller-facing insights for ONE period: MoM/QoQ pulse (sales/refunds/VAT deltas), " +
        "VAT-by-rate buckets, scheme mix (OSS/REGULAR/VOEC), country watchlist, and alerts " +
        "(NO COUNTRY, high refunds, truncation, VAT spike). Call this for questions about " +
        "what changed, what needs attention, filing readiness, or rate exposure.",
      inputSchema: z.object({
        fileType: z.enum(["monthly", "quarterly"]),
        year: z.number().int().min(2000).max(2100),
        month: z.string().optional().describe("Month number as a string, '1' to '12'"),
        quarter: z.string().optional().describe("One of Q1, Q2, Q3, Q4"),
      }),
      execute: async ({ fileType, year, month, quarter }) => {
        const periods = await storageRepository.listProcessedPeriods(email);
        const match = periods.find((p) => {
          if (String(p.fileType) !== fileType || Number(p.year) !== year) return false;
          if (fileType === "monthly") return String(p.month) === String(Number(month));
          return String(p.quarter).toUpperCase() === String(quarter).toUpperCase();
        });
        if (!match) {
          return {
            found: false as const,
            available: periods.map((p) => periodLabel(p)),
          };
        }
        // User id is not on the tool closure — insights without subscription
        // still works; Free-plan warning uses meta.truncated when present.
        const { countries, meta } = await dataService.getProcessedJson(email, match);
        const overview = await dataService.overview(email);
        const summary = buildInsights({
          period: match,
          countries,
          meta,
          overview,
          planActive: true,
        });
        return {
          found: true as const,
          ...summary,
          period: {
            fileType: match.fileType as "monthly" | "quarterly",
            year: Number(match.year),
            month: match.month === undefined ? undefined : String(match.month),
            quarter: match.quarter,
          },
        };
      },
    }),

    findReports: tool({
      description:
        "Look up which processed VAT report files the seller has in storage, so the UI can show PDF/Excel download buttons. " +
        "MUST call this whenever they ask about ONE specific month or quarter — including a 'summary', 'totals', 'VAT for January', " +
        "'Q1 breakdown', or any single-period question — even if they did not say 'download' or 'file'. " +
        "Also call whenever they explicitly ask for a report, PDF, Excel/spreadsheet, or to download something. " +
        "Convert whatever period they described into the structured fields — e.g. 'January 2026' is fileType=monthly, year=2026, month='1'; " +
        "'Q1 2026' is fileType=quarterly, year=2026, quarter='Q1'. " +
        "Omit every field to list all reports they have. " +
        "Never claim a report exists unless this tool returned it. " +
        "Skip only for true all-periods / overall questions that are not about one month or quarter.",
      inputSchema: z.object({
        fileType: z
          .enum(["monthly", "quarterly"])
          .optional()
          .describe("monthly for a single month, quarterly for a quarter"),
        year: z.number().int().min(2000).max(2100).optional(),
        month: z.string().optional().describe("Month number as a string, '1' to '12'"),
        quarter: z.string().optional().describe("One of Q1, Q2, Q3, Q4"),
      }),
      execute: async ({ fileType, year, month, quarter }): Promise<FindReportsOutput> =>
        resolveReportMatches(email, { fileType, year, month, quarter }),
    }),
  };
}

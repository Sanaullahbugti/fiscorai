import { createHash } from "node:crypto";
import { processCsv, toApiCountries } from "./aggregate.js";
import type { ProcessInput } from "./canonical-types.js";
import { buildPdfFromCanonical } from "./pdf-canonical.js";
import { processCanonicalReport } from "./pipeline.js";
import { buildXlsxFromCanonical } from "./xlsx-canonical.js";
import type { ProcessOptions, ProcessedReport } from "./types.js";
import { buildPdf, type PdfOptions } from "./pdf.js";
import { buildXlsx } from "./xlsx.js";

export * from "./types.js";
export * from "./canonical-types.js";
export { processCsv, toApiCountries } from "./aggregate.js";
export { processCanonicalReport } from "./pipeline.js";
export { buildPdf, DEFAULT_THEME, type PdfOptions, type PdfTheme } from "./pdf.js";
export { buildXlsx } from "./xlsx.js";
export { buildPdfFromCanonical } from "./pdf-canonical.js";
export { buildXlsxFromCanonical } from "./xlsx-canonical.js";
export { sumActivityIncl, sumVat } from "./report-model.js";
export {
  batchCsvByActivityPeriod,
  type CsvPeriodBatch,
  type DetectedPeriodTarget,
} from "./parse.js";
export {
  aggregateFromReportView,
  formatMoney,
  schemeVatByCurrency,
  type CanonicalAggregate,
  type CurrencyRollup,
  type SchemeRollup,
} from "./canonical-summary.js";

export type ReportManifestV2 = {
  version: "2.0.0";
  reportId: string;
  sourceFileName: string;
  sourceActivityPeriod: string | null;
  requestedPeriodLabel: string;
  reconciliationStatus: string;
  processorVersion: string;
  publishedAt: string;
  artifacts: {
    json: string;
    pdf: string;
    xlsx: string;
    canonical: string;
  };
};

export type ProcessArtifacts = {
  report: ProcessedReport;
  canonical: NonNullable<Awaited<ReturnType<typeof processCanonicalReport>>["canonical"]> | null;
  json: object;
  pdf: Buffer;
  xlsx: Buffer;
  apiCountries: ReturnType<typeof toApiCountries>;
  reconciliationStatus: string;
  issues: import("./canonical-types.js").DataQualityIssue[];
};

function sourceHash(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export async function processVatReport(
  csvText: string,
  options: ProcessOptions & { pdf?: PdfOptions; sourceFileName?: string },
): Promise<ProcessArtifacts> {
  const input: ProcessInput = {
    planCode: options.planCode,
    fileType: options.fileType,
    permissive: options.permissive,
    requestedPeriodLabel: options.periodLabel,
    sourceFileName: options.sourceFileName || "upload.csv",
    sourceFileHash: sourceHash(csvText),
    requestedYear: options.requestedYear ?? options.periodLabel.split("-")[0] ?? new Date().getFullYear(),
    requestedMonth: options.requestedMonth,
    requestedQuarter: options.requestedQuarter,
  };

  if (options.fileType === "monthly" && !input.requestedMonth) {
    const parts = options.periodLabel.match(/^(\d{4})-([A-Z]{3})$/);
    if (parts) {
      input.requestedYear = parts[1]!;
      const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
      input.requestedMonth = months.indexOf(parts[2]!) + 1;
    }
  }

  if (options.fileType === "quarterly" && !input.requestedQuarter) {
    const q = options.periodLabel.match(/^(Q[1-4])-(\d{4})$/);
    if (q) {
      input.requestedQuarter = q[1];
      input.requestedYear = q[2];
    }
  }

  const result = processCanonicalReport(csvText, input);

  if (!result.canonical || result.reconciliationStatus === "INVALID") {
    const fallback = processCsv(csvText, options);
    const emptyPdf = await buildPdf(fallback, options.pdf);
    const emptyXlsx = await buildXlsx(fallback);
    const fallbackStatus = options.permissive ? "READY" : "INVALID";
    const fallbackIssues = options.permissive ? [] : result.issues;
    return {
      report: fallback,
      canonical: null,
      json: {
        countries: fallback.countries,
        meta: { ...fallback.meta, reconciliationStatus: fallbackStatus },
        issues: fallbackIssues,
      },
      pdf: emptyPdf,
      xlsx: emptyXlsx,
      apiCountries: toApiCountries(fallback),
      reconciliationStatus: fallbackStatus,
      issues: fallbackIssues,
    };
  }

  const legacy = result.legacy!;
  const canonical = result.canonical;
  const pdf = await buildPdfFromCanonical(canonical, options.pdf);
  const xlsx = await buildXlsxFromCanonical(canonical);

  const json = {
    version: canonical.version,
    countries: legacy.countries,
    meta: legacy.meta,
    canonical: {
      view: canonical.view,
      reconciliationStatus: canonical.reconciliationStatus,
    },
    issues: result.issues,
  };

  return {
    report: legacy,
    canonical,
    json,
    pdf,
    xlsx,
    apiCountries: toApiCountries(legacy),
    reconciliationStatus: result.reconciliationStatus,
    issues: result.issues,
  };
}

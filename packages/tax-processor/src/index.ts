import { processCsv, toApiCountries } from "./aggregate.js";
import { buildPdf, type PdfOptions } from "./pdf.js";
import { buildXlsx } from "./xlsx.js";
import type { ProcessOptions, ProcessedReport } from "./types.js";

export * from "./types.js";
export { processCsv, toApiCountries } from "./aggregate.js";
export { buildPdf, DEFAULT_THEME, type PdfOptions, type PdfTheme } from "./pdf.js";
export { buildXlsx } from "./xlsx.js";

export type ProcessArtifacts = {
  report: ProcessedReport;
  json: object;
  pdf: Buffer;
  xlsx: Buffer;
  apiCountries: ReturnType<typeof toApiCountries>;
};

export async function processVatReport(
  csvText: string,
  options: ProcessOptions & { pdf?: PdfOptions },
): Promise<ProcessArtifacts> {
  const report = processCsv(csvText, options);
  const apiCountries = toApiCountries(report);
  // Persist meta with countries so dashboards can show truncation / row counts
  // without re-running the processor.
  const json = { countries: report.countries, meta: report.meta };
  const [pdf, xlsx] = await Promise.all([
    buildPdf(report, options.pdf),
    buildXlsx(report),
  ]);
  return { report, json, pdf, xlsx, apiCountries };
}

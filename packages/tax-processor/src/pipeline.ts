import type { CanonicalReportV2, ProcessInput, ProcessResult, ReconciliationStatus } from "./canonical-types.js";
import { runAudit } from "./audit.js";
import { deriveAllContext } from "./context.js";
import { toLegacyProcessedReport } from "./legacy.js";
import { linkRefunds } from "./link.js";
import {
  detectDuplicates,
  detectSignIssues,
  extractActivityPeriods,
  parseAmazonCsv,
  validateRequestedPeriod,
} from "./parse.js";
import { buildCanonicalReport, buildReportView } from "./report-model.js";
import { validateSchema } from "./schema.js";
import { parse } from "csv-parse/sync";

export function processCanonicalReport(csvText: string, input: ProcessInput): ProcessResult {
  const parsed = parseAmazonCsv(csvText);
  if (!parsed.valid) {
    return {
      canonical: null,
      legacy: null,
      reconciliationStatus: "INVALID",
      issues: parsed.schemaIssues,
      errors: parsed.errors,
    };
  }

  let rows = parsed.rows;
  rows = deriveAllContext(rows);
  rows = linkRefunds(rows);

  const sourcePeriods = extractActivityPeriods(rows);
  const generatedAt = new Date().toISOString();

  let issues = input.permissive
    ? []
    : [
        ...parsed.schemaIssues,
        ...detectDuplicates(rows),
        ...detectSignIssues(rows),
        ...validateRequestedPeriod(
          input.fileType,
          sourcePeriods,
          input.requestedYear,
          input.requestedMonth,
          input.requestedQuarter,
        ),
      ];

  let records: Record<string, string>[] = [];
  try {
    records = parse(csvText, { columns: true, skip_empty_lines: true, bom: true }) as Record<string, string>[];
  } catch {
    /* handled above */
  }
  const schema = validateSchema(records.length ? Object.keys(records[0]!) : []);

  let reconciliationStatus: ReconciliationStatus = "READY";
  const periodBlockers = issues.filter((i) => i.severity === "BLOCKER" && i.code.includes("PERIOD"));
  if (periodBlockers.length) reconciliationStatus = "NOT_READY";

  const view = buildReportView(
    rows,
    input,
    parsed.sourceHash,
    schema.fingerprint,
    sourcePeriods,
    issues,
    reconciliationStatus,
    generatedAt,
  );

  if (!input.permissive) {
    const audit = runAudit(rows, view, issues);
    issues = audit.issues;
    reconciliationStatus = audit.reconciliationStatus;
    if (periodBlockers.length) reconciliationStatus = "NOT_READY";
  }

  const finalView = {
    ...view,
    provenance: { ...view.provenance, reconciliationStatus },
    executiveSummary: { ...view.executiveSummary, reconciliationStatus },
    issues,
  };

  const canonical = buildCanonicalReport(rows, finalView, reconciliationStatus);
  const legacy = toLegacyProcessedReport(
    canonical,
    sourcePeriods.length === 1 ? sourcePeriods[0]! : input.requestedPeriodLabel,
    rows.length,
  );

  return {
    canonical,
    legacy,
    reconciliationStatus,
    issues,
    errors: [],
  };
}

export type { CanonicalReportV2, ProcessInput, ProcessResult };

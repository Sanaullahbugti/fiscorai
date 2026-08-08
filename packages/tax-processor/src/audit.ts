import type {
  DataQualityIssue,
  NormalizedTransaction,
  ReconciliationStatus,
  ReportView,
} from "./canonical-types.js";
import { addDecimal, roundMoney, sumDecimals } from "./decimal.js";
import { buildReportView, sumActivityIncl, sumVat } from "./report-model.js";

function schemeKey(row: NormalizedTransaction): string {
  return row.taxReportingScheme.value?.trim() || "(blank)";
}

function responsibilityKey(row: NormalizedTransaction): string {
  return row.taxCollectionResponsibility.value?.trim() || "(blank)";
}

function typeKey(row: NormalizedTransaction): string {
  return (row.transactionType.value || "(blank)").toUpperCase();
}

function countMap(rows: NormalizedTransaction[], fn: (r: NormalizedTransaction) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const row of rows) {
    const k = fn(row);
    out[k] = (out[k] || 0) + 1;
  }
  return out;
}

function sourceTotalsByCurrency(rows: NormalizedTransaction[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of rows) {
    const c = row.transactionCurrencyCode.value;
    const v = row.activityValueIncl.value;
    if (!c || v == null) continue;
    map.set(c, addDecimal(map.get(c) || "0", v));
  }
  return map;
}

function sourceTotalsBySchemeCurrency(
  rows: NormalizedTransaction[],
): Map<string, { incl: string; vat: string }> {
  const map = new Map<string, { incl: string; vat: string }>();
  for (const row of rows) {
    const c = row.transactionCurrencyCode.value;
    const incl = row.activityValueIncl.value;
    if (!c || incl == null) continue;
    const key = `${schemeKey(row)}@@${c}`;
    const prev = map.get(key) || { incl: "0", vat: "0" };
    prev.incl = addDecimal(prev.incl, incl);
    if (row.activityVat.value != null) prev.vat = addDecimal(prev.vat, row.activityVat.value);
    map.set(key, prev);
  }
  return map;
}

export function runAudit(
  sourceRows: NormalizedTransaction[],
  view: ReportView,
  priorIssues: DataQualityIssue[],
): { issues: DataQualityIssue[]; reconciliationStatus: ReconciliationStatus } {
  const issues = [...priorIssues];

  if (sourceRows.length !== view.executiveSummary.sourceRecords) {
    issues.push({
      code: "ROW_COUNT_MISMATCH",
      severity: "BLOCKER",
      message: "Normalized row count does not match source row count.",
    });
  }

  const sourceTypes = countMap(sourceRows, typeKey);
  for (const [k, v] of Object.entries(sourceTypes)) {
    if ((view.executiveSummary.transactionTypes[k] || 0) !== v) {
      issues.push({
        code: "TRANSACTION_TYPE_COUNT_MISMATCH",
        severity: "BLOCKER",
        field: k,
        sourceValue: String(v),
        derivedValue: String(view.executiveSummary.transactionTypes[k] || 0),
        message: `Transaction type count mismatch for ${k}.`,
      });
    }
  }

  const sourceSchemes = countMap(sourceRows, schemeKey);
  for (const [k, v] of Object.entries(sourceSchemes)) {
    if ((view.executiveSummary.schemes[k] || 0) !== v) {
      issues.push({
        code: "SCHEME_COUNT_MISMATCH",
        severity: "BLOCKER",
        field: k,
        sourceValue: String(v),
        derivedValue: String(view.executiveSummary.schemes[k] || 0),
        message: `Scheme count mismatch for ${k}.`,
      });
    }
  }

  const sourceResp = countMap(sourceRows, responsibilityKey);
  for (const [k, v] of Object.entries(sourceResp)) {
    if ((view.executiveSummary.responsibilities[k] || 0) !== v) {
      issues.push({
        code: "RESPONSIBILITY_COUNT_MISMATCH",
        severity: "BLOCKER",
        field: k,
        sourceValue: String(v),
        derivedValue: String(view.executiveSummary.responsibilities[k] || 0),
        message: `Responsibility count mismatch for ${k}.`,
      });
    }
  }

  const sourceByCurrency = sourceTotalsByCurrency(sourceRows);
  for (const total of view.totalsByCurrency) {
    const src = sourceByCurrency.get(total.currency);
    if (!src || roundMoney(src) !== total.activityIncl) {
      issues.push({
        code: "CURRENCY_TOTAL_MISMATCH",
        severity: "BLOCKER",
        currency: total.currency,
        sourceValue: src ? roundMoney(src) : null,
        derivedValue: total.activityIncl,
        message: `Activity total mismatch for currency ${total.currency}.`,
      });
    }
  }

  const sourceSchemeTotals = sourceTotalsBySchemeCurrency(sourceRows);
  const reportSchemeTotals = new Map<string, { incl: string; vat: string }>();
  for (const row of view.schemeSummaries) {
    const key = `${row.sourceTaxReportingScheme}@@${row.currency}`;
    const prev = reportSchemeTotals.get(key) || { incl: "0", vat: "0" };
    prev.incl = addDecimal(prev.incl, row.activityIncl);
    prev.vat = addDecimal(prev.vat, row.vat);
    reportSchemeTotals.set(key, prev);
  }
  for (const [key, src] of sourceSchemeTotals) {
    const rep = reportSchemeTotals.get(key);
    if (!rep || roundMoney(src.incl) !== roundMoney(rep.incl)) {
      issues.push({
        code: "SCHEME_CURRENCY_TOTAL_MISMATCH",
        severity: "BLOCKER",
        sourceValue: roundMoney(src.incl),
        derivedValue: rep ? roundMoney(rep.incl) : null,
        message: `Scheme total mismatch for ${key.replace("@@", " / ")}.`,
      });
    }
  }

  const sourceVatByCurrency = new Map<string, string>();
  for (const row of sourceRows) {
    const c = row.transactionCurrencyCode.value;
    const v = row.activityVat.value;
    if (!c || v == null) continue;
    sourceVatByCurrency.set(c, addDecimal(sourceVatByCurrency.get(c) || "0", v));
  }
  for (const total of view.totalsByCurrency) {
    const srcVat = sourceVatByCurrency.get(total.currency);
    if (srcVat && roundMoney(srcVat) !== total.vat) {
      issues.push({
        code: "VAT_TOTAL_MISMATCH",
        severity: "BLOCKER",
        currency: total.currency,
        sourceValue: roundMoney(srcVat),
        derivedValue: total.vat,
        message: `VAT total mismatch for currency ${total.currency}.`,
      });
    }
  }

  for (const summary of view.schemeSummaries) {
    const mixed = view.schemeSummaries.filter(
      (s) =>
        s.sourceTaxReportingScheme === summary.sourceTaxReportingScheme &&
        s.reportingDestination === summary.reportingDestination &&
        s.currency !== summary.currency,
    );
    if (mixed.length) {
      issues.push({
        code: "MULTI_CURRENCY_GROUP",
        severity: "ERROR",
        message: `Output group would mix currencies for scheme ${summary.sourceTaxReportingScheme}.`,
      });
    }
  }

  const voecEur = view.schemeSummaries.find(
    (s) => s.sourceTaxReportingScheme === "CH_VOEC" && s.currency === "EUR",
  );
  const voecGbp = view.schemeSummaries.find(
    (s) => s.sourceTaxReportingScheme === "UK_VOEC-IMPORT" && s.currency === "GBP",
  );
  const fakeVoec = view.schemeSummaries.find((s) => s.sourceTaxReportingScheme === "VOEC" && s.currency === "EUR");
  if (fakeVoec && voecEur && voecGbp) {
    issues.push({
      code: "CROSS_CURRENCY_VOEC_COLLAPSE",
      severity: "BLOCKER",
      derivedValue: fakeVoec.activityIncl,
      message: "Cross-currency VOEC collapse detected (EUR total includes non-EUR activity).",
    });
  }

  const blockers = issues.filter((i) => i.severity === "BLOCKER");
  const errors = issues.filter((i) => i.severity === "ERROR");
  const warnings = issues.filter((i) => i.severity === "WARNING");

  let reconciliationStatus: ReconciliationStatus = "READY";
  if (blockers.length) reconciliationStatus = "NOT_READY";
  else if (errors.length) reconciliationStatus = "NOT_READY";
  else if (warnings.length) reconciliationStatus = "READY_WITH_WARNINGS";

  return { issues, reconciliationStatus };
}

export { sumActivityIncl, sumVat };

import type {
  CanonicalReportV2,
  MonetaryTotals,
  MovementSummaryRow,
  NormalizedTransaction,
  ProcessInput,
  RefundSummaryRow,
  ReportProvenance,
  ReportView,
  SchemeSummaryRow,
  TransactionTypeSummary,
  VatRateBreakdownRow,
} from "./canonical-types.js";
import {
  CANONICAL_REPORT_MODEL_VERSION,
  PROCESSOR_VERSION,
  type DataQualityIssue,
  type ReconciliationStatus,
} from "./canonical-types.js";
import { addDecimal, rateToDisplayPercent, roundMoney, sumDecimals } from "./decimal.js";
import { reportIdFrom } from "./schema.js";

function schemeKey(row: NormalizedTransaction): string {
  return row.taxReportingScheme.value?.trim() || "(blank)";
}

function responsibilityKey(row: NormalizedTransaction): string {
  return row.taxCollectionResponsibility.value?.trim() || "(blank)";
}

function isMovement(row: NormalizedTransaction): boolean {
  const t = (row.transactionType.value || "").toUpperCase();
  return t === "RETURN" || t === "FC_TRANSFER";
}

function hasMonetaryActivity(row: NormalizedTransaction): boolean {
  return row.activityValueIncl.value != null || row.activityValueExcl.value != null || row.activityVat.value != null;
}

function countBy(rows: NormalizedTransaction[], fn: (r: NormalizedTransaction) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const row of rows) {
    const k = fn(row);
    out[k] = (out[k] || 0) + 1;
  }
  return out;
}

function aggregateSchemeSummaries(rows: NormalizedTransaction[]): SchemeSummaryRow[] {
  const map = new Map<string, SchemeSummaryRow>();

  for (const row of rows) {
    if (isMovement(row) && !hasMonetaryActivity(row)) continue;
    const currency = row.transactionCurrencyCode.value;
    if (!currency) continue;
    const incl = row.activityValueIncl.value;
    if (incl == null) continue;

    const key = [
      schemeKey(row),
      responsibilityKey(row),
      currency,
      row.derived.reportingDestination.value ?? "",
      row.derived.salesDestination.value ?? "",
    ].join("@@");

    const prev = map.get(key) || {
      sourceTaxReportingScheme: schemeKey(row),
      taxCollectionResponsibility: responsibilityKey(row),
      reportingDestination: row.derived.reportingDestination.value ?? "—",
      salesDestination: row.derived.salesDestination.value ?? "—",
      currency,
      activityIncl: "0",
      activityExcl: "0",
      vat: "0",
      transactionCount: 0,
      sourceRowIds: [],
    };

    prev.activityIncl = addDecimal(prev.activityIncl, incl);
    if (row.activityValueExcl.value != null) {
      prev.activityExcl = addDecimal(prev.activityExcl, row.activityValueExcl.value);
    }
    if (row.activityVat.value != null) {
      prev.vat = addDecimal(prev.vat, row.activityVat.value);
    }
    prev.transactionCount += 1;
    prev.sourceRowIds.push(row.sourceRow);
    map.set(key, prev);
  }

  return [...map.values()].map((r) => ({
    ...r,
    activityIncl: roundMoney(r.activityIncl),
    activityExcl: roundMoney(r.activityExcl),
    vat: roundMoney(r.vat),
  }));
}

function aggregateVatRates(rows: NormalizedTransaction[]): VatRateBreakdownRow[] {
  const map = new Map<string, VatRateBreakdownRow>();

  for (const row of rows) {
    if (isMovement(row) && !hasMonetaryActivity(row)) continue;
    const currency = row.transactionCurrencyCode.value;
    if (!currency) continue;
    const incl = row.activityValueIncl.value;
    if (incl == null) continue;

    const rateRaw = row.priceVatRatePercent.raw;
    const rateVal = row.priceVatRatePercent.value;
    const jurisdiction = row.derived.reportingDestination.value ?? row.taxableJurisdiction.value ?? "—";
    const key = [schemeKey(row), jurisdiction, rateVal ?? "(blank)", currency].join("@@");

    const prev = map.get(key) || {
      sourceTaxReportingScheme: schemeKey(row),
      jurisdiction,
      sourceRate: rateVal,
      displayRate: rateToDisplayPercent(rateRaw),
      currency,
      activityIncl: "0",
      activityExcl: "0",
      vat: "0",
      transactionCount: 0,
      sourceRowIds: [],
    };

    prev.activityIncl = addDecimal(prev.activityIncl, incl);
    if (row.activityValueExcl.value != null) prev.activityExcl = addDecimal(prev.activityExcl, row.activityValueExcl.value);
    if (row.activityVat.value != null) prev.vat = addDecimal(prev.vat, row.activityVat.value);
    prev.transactionCount += 1;
    prev.sourceRowIds.push(row.sourceRow);
    map.set(key, prev);
  }

  return [...map.values()].map((r) => ({
    ...r,
    activityIncl: roundMoney(r.activityIncl),
    activityExcl: roundMoney(r.activityExcl),
    vat: roundMoney(r.vat),
  }));
}

function aggregateByType(rows: NormalizedTransaction[]): TransactionTypeSummary[] {
  const map = new Map<string, TransactionTypeSummary>();

  for (const row of rows) {
    const type = (row.transactionType.value || "UNKNOWN").toUpperCase();
    const currency = row.transactionCurrencyCode.value;
    const key = `${type}@@${currency ?? "(blank)"}`;

    const prev = map.get(key) || {
      transactionType: type,
      currency,
      activityIncl: "0",
      activityExcl: "0",
      vat: "0",
      count: 0,
      sourceRowIds: [],
    };

    if (row.activityValueIncl.value != null) prev.activityIncl = addDecimal(prev.activityIncl, row.activityValueIncl.value);
    if (row.activityValueExcl.value != null) prev.activityExcl = addDecimal(prev.activityExcl, row.activityValueExcl.value);
    if (row.activityVat.value != null) prev.vat = addDecimal(prev.vat, row.activityVat.value);
    prev.count += 1;
    prev.sourceRowIds.push(row.sourceRow);
    map.set(key, prev);
  }

  return [...map.values()].map((r) => ({
    ...r,
    activityIncl: roundMoney(r.activityIncl),
    activityExcl: roundMoney(r.activityExcl),
    vat: roundMoney(r.vat),
  }));
}

function refundSummaries(rows: NormalizedTransaction[]): RefundSummaryRow[] {
  return rows
    .filter((r) => (r.transactionType.value || "").toUpperCase() === "REFUND")
    .map((r) => ({
      sourceRow: r.sourceRow,
      transactionEventId: r.transactionEventId.value,
      currency: r.transactionCurrencyCode.value || "—",
      activityIncl: r.activityValueIncl.value ? roundMoney(r.activityValueIncl.value) : "0.00",
      salesDestination: r.derived.salesDestination.value,
      linkProvenance: r.refundLink.provenance,
      matchedSourceRow: r.refundLink.matchedSourceRow,
    }));
}

function movementSummaries(rows: NormalizedTransaction[]): MovementSummaryRow[] {
  return rows
    .filter((r) => isMovement(r))
    .map((r) => ({
      sourceRow: r.sourceRow,
      transactionType: (r.transactionType.value || "").toUpperCase(),
      transactionEventId: r.transactionEventId.value,
      qty: r.qty.value,
      departureCountry: r.departureCountry.value,
      arrivalCountry: r.arrivalCountry.value,
      saleArrivalCountry: r.saleArrivalCountry.value,
    }));
}

function totalsByCurrency(rows: NormalizedTransaction[]): MonetaryTotals[] {
  const map = new Map<string, MonetaryTotals>();

  for (const row of rows) {
    const currency = row.transactionCurrencyCode.value;
    if (!currency) continue;
    const incl = row.activityValueIncl.value;
    if (incl == null) continue;

    const prev = map.get(currency) || {
      activityIncl: "0",
      activityExcl: "0",
      vat: "0",
      currency,
      transactionCount: 0,
      sourceRowIds: [],
    };

    prev.activityIncl = addDecimal(prev.activityIncl, incl);
    if (row.activityValueExcl.value != null) prev.activityExcl = addDecimal(prev.activityExcl, row.activityValueExcl.value);
    if (row.activityVat.value != null) prev.vat = addDecimal(prev.vat, row.activityVat.value);
    prev.transactionCount += 1;
    prev.sourceRowIds.push(row.sourceRow);
    map.set(currency, prev);
  }

  return [...map.values()].map((r) => ({
    ...r,
    activityIncl: roundMoney(r.activityIncl),
    activityExcl: roundMoney(r.activityExcl),
    vat: roundMoney(r.vat),
  }));
}

function sellerVatIdentified(rows: NormalizedTransaction[]): Array<{ currency: string; amount: string }> {
  const map = new Map<string, string>();
  for (const row of rows) {
    if ((row.taxCollectionResponsibility.value || "").toUpperCase() !== "SELLER") continue;
    const currency = row.transactionCurrencyCode.value;
    const vat = row.activityVat.value;
    if (!currency || vat == null) continue;
    map.set(currency, addDecimal(map.get(currency) || "0", vat));
  }
  return [...map.entries()].map(([currency, amount]) => ({ currency, amount: roundMoney(amount) }));
}

function marketplaceActivity(rows: NormalizedTransaction[]): Array<{ scheme: string; currency: string; amount: string }> {
  const map = new Map<string, string>();
  for (const row of rows) {
    if ((row.taxCollectionResponsibility.value || "").toUpperCase() !== "MARKETPLACE") continue;
    const currency = row.transactionCurrencyCode.value;
    const incl = row.activityValueIncl.value;
    if (!currency || incl == null) continue;
    const scheme = schemeKey(row);
    const key = `${scheme}@@${currency}`;
    map.set(key, addDecimal(map.get(key) || "0", incl));
  }
  return [...map.entries()].map(([key, amount]) => {
    const [scheme, currency] = key.split("@@");
    return { scheme: scheme!, currency: currency!, amount: roundMoney(amount) };
  });
}

export function buildReportView(
  rows: NormalizedTransaction[],
  input: ProcessInput,
  sourceHash: string,
  schemaFingerprint: string,
  sourcePeriods: string[],
  issues: DataQualityIssue[],
  reconciliationStatus: ReconciliationStatus,
  generatedAt: string,
): ReportView {
  const issueCounts = { INFO: 0, WARNING: 0, ERROR: 0, BLOCKER: 0 } as Record<
    "INFO" | "WARNING" | "ERROR" | "BLOCKER",
    number
  >;
  for (const i of issues) issueCounts[i.severity] += 1;

  const provenance: ReportProvenance = {
    reportId: reportIdFrom(sourceHash, generatedAt),
    sourceFileName: input.sourceFileName,
    sourceFileHash: sourceHash,
    sourceRowCount: rows.length,
    sourceActivityPeriod: sourcePeriods.length === 1 ? sourcePeriods[0]! : null,
    sourceActivityPeriods: sourcePeriods,
    requestedPeriodLabel: input.requestedPeriodLabel,
    processorVersion: PROCESSOR_VERSION,
    canonicalReportModelVersion: CANONICAL_REPORT_MODEL_VERSION,
    generatedAt,
    reconciliationStatus,
    sourceSchemaFingerprint: schemaFingerprint,
  };

  const destinations = new Set<string>();
  for (const r of rows) {
    if (r.derived.salesDestination.value) destinations.add(r.derived.salesDestination.value);
  }

  const currencies = new Set<string>();
  for (const r of rows) {
    if (r.transactionCurrencyCode.value) currencies.add(r.transactionCurrencyCode.value);
  }

  return {
    provenance,
    executiveSummary: {
      activityPeriod: provenance.sourceActivityPeriod,
      generatedAt,
      sourceRecords: rows.length,
      transactionTypes: countBy(rows, (r) => (r.transactionType.value || "(blank)").toUpperCase()),
      schemes: countBy(rows, schemeKey),
      responsibilities: countBy(rows, responsibilityKey),
      currencies: [...currencies].sort(),
      sellerVatIdentified: sellerVatIdentified(rows),
      marketplaceActivity: marketplaceActivity(rows),
      salesDestinations: [...destinations].sort(),
      reconciliationStatus,
      issueCounts,
    },
    schemeSummaries: aggregateSchemeSummaries(rows),
    vatRateBreakdown: aggregateVatRates(rows),
    transactionTypeSummaries: aggregateByType(rows),
    refundSummaries: refundSummaries(rows),
    movementSummaries: movementSummaries(rows),
    totalsByCurrency: totalsByCurrency(rows),
    issues,
  };
}

export function buildCanonicalReport(
  rows: NormalizedTransaction[],
  view: ReportView,
  reconciliationStatus: ReconciliationStatus,
): CanonicalReportV2 {
  return {
    version: CANONICAL_REPORT_MODEL_VERSION,
    rows,
    view,
    reconciliationStatus,
  };
}

/** Utility for tests: sum incl by filter using exact decimals. */
export function sumActivityIncl(
  rows: NormalizedTransaction[],
  filter: (r: NormalizedTransaction) => boolean,
): string {
  const vals = rows.filter(filter).map((r) => r.activityValueIncl.value);
  return roundMoney(sumDecimals(vals));
}

export function sumVat(
  rows: NormalizedTransaction[],
  filter: (r: NormalizedTransaction) => boolean,
): string {
  const vals = rows.filter(filter).map((r) => r.activityVat.value);
  return roundMoney(sumDecimals(vals));
}

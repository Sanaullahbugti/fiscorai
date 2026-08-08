import type { NormalizedTransaction, SourceField } from "./canonical-types.js";
import { JURISDICTION_NAMES } from "./types.js";

function isoOrName(code: string | null): string | null {
  if (!code) return null;
  const key = code.trim().toUpperCase();
  return JURISDICTION_NAMES[key] || code.trim();
}

function firstNonEmpty(...values: Array<string | null | undefined>): SourceField {
  for (const v of values) {
    const s = (v ?? "").trim();
    if (s) return { raw: s, value: s };
  }
  return { raw: null, value: null };
}

/** Derive customer-facing destination context without replacing source fields. */
export function deriveContext(row: NormalizedTransaction): NormalizedTransaction {
  const scheme = (row.taxReportingScheme.value || "").toUpperCase();
  const txType = (row.transactionType.value || "").toUpperCase();

  let salesDestination = firstNonEmpty(
    row.saleArrivalCountry.value,
    row.arrivalCountry.value,
    row.vatCalculationImputationCountry.value,
  );

  let reportingDestination = firstNonEmpty(
    row.taxableJurisdiction.value,
    row.vatCalculationImputationCountry.value,
    row.saleArrivalCountry.value,
    row.arrivalCountry.value,
  );

  let provenance: NormalizedTransaction["derived"]["provenance"] = "SOURCE_ROW";

  if (scheme === "UNION-OSS") {
    reportingDestination = firstNonEmpty(
      row.taxableJurisdiction.value,
      row.arrivalCountry.value,
      row.saleArrivalCountry.value,
    );
    salesDestination = firstNonEmpty(row.arrivalCountry.value, row.saleArrivalCountry.value);
    provenance = row.taxableJurisdiction.value ? "SOURCE_ROW" : "SALE_CONTEXT";
  } else if (scheme.includes("VOEC")) {
    reportingDestination = firstNonEmpty(
      row.saleArrivalCountry.value,
      row.vatCalculationImputationCountry.value,
      row.arrivalCountry.value,
    );
    salesDestination = firstNonEmpty(
      row.saleArrivalCountry.value,
      row.vatCalculationImputationCountry.value,
    );
    provenance = "SOURCE_ROW";
  } else if (scheme === "REGULAR" || !scheme) {
    if (txType === "REFUND" && !row.arrivalCountry.value && row.saleArrivalCountry.value) {
      salesDestination = { raw: row.saleArrivalCountry.raw, value: row.saleArrivalCountry.value };
      reportingDestination = salesDestination;
      provenance = "SALE_CONTEXT";
    } else {
      salesDestination = firstNonEmpty(row.arrivalCountry.value, row.saleArrivalCountry.value);
      reportingDestination = salesDestination;
    }
  }

  const displaySales = salesDestination.value ? isoOrName(salesDestination.value) : null;
  const displayReporting = reportingDestination.value ? isoOrName(reportingDestination.value) : null;

  return {
    ...row,
    derived: {
      salesDestination: { raw: salesDestination.raw, value: displaySales },
      reportingDestination: { raw: reportingDestination.raw, value: displayReporting },
      provenance,
    },
  };
}

export function deriveAllContext(rows: NormalizedTransaction[]): NormalizedTransaction[] {
  return rows.map(deriveContext);
}

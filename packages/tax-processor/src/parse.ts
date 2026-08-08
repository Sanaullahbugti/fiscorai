import { parse } from "csv-parse/sync";
import type { DataQualityIssue, NormalizedTransaction, SourceField } from "./canonical-types.js";
import { parseDecimal } from "./decimal.js";
import { rowContentHash, sourceFileHash, validateSchema } from "./schema.js";

type CsvRow = Record<string, string>;

function field(raw: string | undefined): SourceField {
  const s = (raw ?? "").trim();
  return { raw: s || null, value: s || null };
}

function moneyField(raw: string | undefined) {
  return parseDecimal(raw);
}

export type ParseResult = {
  rows: NormalizedTransaction[];
  schemaIssues: DataQualityIssue[];
  sourceHash: string;
  valid: boolean;
  errors: string[];
};

export function parseAmazonCsv(csvText: string): ParseResult {
  const errors: string[] = [];
  let records: CsvRow[];
  try {
    records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
      bom: true,
      trim: true,
    }) as CsvRow[];
  } catch (e) {
    return {
      rows: [],
      schemaIssues: [],
      sourceHash: sourceFileHash(csvText),
      valid: false,
      errors: [`CSV parse error: ${(e as Error).message}`],
    };
  }

  if (!records.length) {
    return {
      rows: [],
      schemaIssues: [],
      sourceHash: sourceFileHash(csvText),
      valid: false,
      errors: ["Source file contains no data rows."],
    };
  }

  const headers = Object.keys(records[0]!);
  const schema = validateSchema(headers);
  if (!schema.valid) {
    return {
      rows: [],
      schemaIssues: schema.issues,
      sourceHash: sourceFileHash(csvText),
      valid: false,
      errors: schema.missingRequired.map((c) => `Missing required column: ${c}`),
    };
  }

  const rows: NormalizedTransaction[] = records.map((row, idx) => {
    const sourceRow = idx + 1;
    return {
      sourceRow,
      uniqueAccountIdentifier: field(row.UNIQUE_ACCOUNT_IDENTIFIER),
      activityPeriod: field(row.ACTIVITY_PERIOD),
      salesChannel: field(row.SALES_CHANNEL),
      marketplace: field(row.MARKETPLACE),
      programType: field(row.PROGRAM_TYPE),
      transactionType: field(row.TRANSACTION_TYPE),
      transactionEventId: field(row.TRANSACTION_EVENT_ID),
      activityTransactionId: field(row.ACTIVITY_TRANSACTION_ID),
      taxReportingScheme: field(row.TAX_REPORTING_SCHEME),
      taxCollectionResponsibility: field(row.TAX_COLLECTION_RESPONSIBILITY),
      transactionCurrencyCode: field(row.TRANSACTION_CURRENCY_CODE),
      activityValueIncl: moneyField(row.TOTAL_ACTIVITY_VALUE_AMT_VAT_INCL),
      activityValueExcl: moneyField(row.TOTAL_ACTIVITY_VALUE_AMT_VAT_EXCL),
      activityVat: moneyField(row.TOTAL_ACTIVITY_VALUE_VAT_AMT),
      priceVatRatePercent: field(row.PRICE_OF_ITEMS_VAT_RATE_PERCENT),
      departureCountry: field(row.DEPARTURE_COUNTRY),
      arrivalCountry: field(row.ARRIVAL_COUNTRY),
      saleDepartCountry: field(row.SALE_DEPART_COUNTRY),
      saleArrivalCountry: field(row.SALE_ARRIVAL_COUNTRY),
      sellerDepartVatNumberCountry: field(row.SELLER_DEPART_VAT_NUMBER_COUNTRY),
      sellerArrivalVatNumberCountry: field(row.SELLER_ARRIVAL_VAT_NUMBER_COUNTRY),
      transactionSellerVatNumberCountry: field(row.TRANSACTION_SELLER_VAT_NUMBER_COUNTRY),
      buyerVatNumberCountry: field(row.BUYER_VAT_NUMBER_COUNTRY),
      vatCalculationImputationCountry: field(row.VAT_CALCULATION_IMPUTATION_COUNTRY),
      taxableJurisdiction: field(row.TAXABLE_JURISDICTION),
      qty: field(row.QTY),
      derived: {
        salesDestination: { raw: null, value: null },
        reportingDestination: { raw: null, value: null },
        provenance: "UNRESOLVED",
      },
      refundLink: {
        status: "not_applicable",
        provenance: "SOURCE_ROW",
        strategyVersion: "v1",
      },
      rowContentHash: rowContentHash(row),
    };
  });

  return {
    rows,
    schemaIssues: schema.issues,
    sourceHash: sourceFileHash(csvText),
    valid: true,
    errors,
  };
}

export function detectDuplicates(rows: NormalizedTransaction[]): DataQualityIssue[] {
  const issues: DataQualityIssue[] = [];
  const byHash = new Map<string, number[]>();
  const byEventId = new Map<string, number[]>();
  const monetaryKey = new Map<string, number[]>();

  for (const row of rows) {
    const hashList = byHash.get(row.rowContentHash) || [];
    hashList.push(row.sourceRow);
    byHash.set(row.rowContentHash, hashList);

    const eventId = row.transactionEventId.value;
    if (eventId) {
      const evList = byEventId.get(eventId) || [];
      evList.push(row.sourceRow);
      byEventId.set(eventId, evList);
    }

    const currency = row.transactionCurrencyCode.value;
    const incl = row.activityValueIncl.value;
    if (currency && incl != null) {
      const key = [
        row.transactionType.value,
        row.taxReportingScheme.value ?? "",
        currency,
        incl,
        row.activityValueExcl.value ?? "",
        row.activityVat.value ?? "",
        row.transactionEventId.value ?? "",
      ].join("|");
      const mList = monetaryKey.get(key) || [];
      mList.push(row.sourceRow);
      monetaryKey.set(key, mList);
    }
  }

  for (const [hash, rowIds] of byHash) {
    if (rowIds.length > 1) {
      for (const id of rowIds) {
        issues.push({
          code: "DUPLICATE_SOURCE_ROW",
          severity: "WARNING",
          sourceRow: id,
          message: `Exact duplicate source row detected (rows ${rowIds.join(", ")}).`,
          recommendedAction: "Review whether Amazon exported duplicate rows; rows are not auto-removed.",
        });
      }
      void hash;
    }
  }

  for (const [eventId, rowIds] of byEventId) {
    if (rowIds.length <= 1) continue;
    const types = rowIds.map((id) => (rows.find((r) => r.sourceRow === id)?.transactionType.value || "").toUpperCase());
    const typeCounts = types.reduce((acc, t) => {
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const duplicateSameType = Object.values(typeCounts).some((c) => c > 1);
    if (duplicateSameType) {
      issues.push({
        code: "DUPLICATE_TRANSACTION_IDENTIFIER",
        severity: "WARNING",
        transactionEventId: eventId,
        message: `Transaction event ID "${eventId}" appears on multiple rows with the same transaction type (${rowIds.join(", ")}).`,
        recommendedAction: "Verify these are distinct source records; rows are not auto-removed.",
      });
    } else {
      issues.push({
        code: "LINKED_TRANSACTION_IDENTIFIER",
        severity: "INFO",
        transactionEventId: eventId,
        message: `Transaction event ID "${eventId}" links ${rowIds.length} related rows (${rowIds.join(", ")}).`,
      });
    }
  }

  for (const [key, rowIds] of monetaryKey) {
    if (rowIds.length > 1) {
      issues.push({
        code: "SUSPICIOUS_DUPLICATE_MONETARY",
        severity: "INFO",
        message: `Suspicious repeated monetary transaction on rows ${rowIds.join(", ")} (${key}).`,
        recommendedAction: "Confirm these are distinct source records before filing.",
      });
    }
  }

  return issues;
}

export function detectSignIssues(rows: NormalizedTransaction[]): DataQualityIssue[] {
  const issues: DataQualityIssue[] = [];
  for (const row of rows) {
    const type = (row.transactionType.value || "").toUpperCase();
    const incl = row.activityValueIncl.value;
    if (incl == null) continue;

    const n = Number(incl);
    if (type === "SALE" && n < 0) {
      issues.push({
        code: "SALE_NEGATIVE_ACTIVITY",
        severity: "WARNING",
        sourceRow: row.sourceRow,
        field: "TOTAL_ACTIVITY_VALUE_AMT_VAT_INCL",
        sourceValue: row.activityValueIncl.raw,
        amount: incl,
        currency: row.transactionCurrencyCode.value,
        message: "SALE row has negative activity total in source.",
        recommendedAction: "Verify with source data; sign is preserved exactly.",
      });
    }
    if (type === "REFUND" && n > 0) {
      issues.push({
        code: "REFUND_POSITIVE_ACTIVITY",
        severity: "WARNING",
        sourceRow: row.sourceRow,
        field: "TOTAL_ACTIVITY_VALUE_AMT_VAT_INCL",
        sourceValue: row.activityValueIncl.raw,
        amount: incl,
        currency: row.transactionCurrencyCode.value,
        message: "REFUND row has positive activity total in source.",
        recommendedAction: "Verify with source data; sign is preserved exactly.",
      });
    }
    if (incl === "0" && type !== "RETURN" && type !== "FC_TRANSFER") {
      issues.push({
        code: "ZERO_MONETARY_ACTIVITY",
        severity: "INFO",
        sourceRow: row.sourceRow,
        amount: incl,
        message: "Monetary transaction row has zero activity total in source.",
      });
    }
  }
  return issues;
}

export function extractActivityPeriods(rows: NormalizedTransaction[]): string[] {
  const set = new Set<string>();
  for (const row of rows) {
    if (row.activityPeriod.value) set.add(row.activityPeriod.value);
  }
  return [...set].sort();
}

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

export function activityPeriodToLabel(period: string): string | null {
  const m = period.match(/^(\d{4})-([A-Z]{3})$/);
  if (!m) return null;
  return `${m[1]}-${m[2]}`;
}

export function requestedPeriodToSourceLabel(
  fileType: "monthly" | "quarterly",
  year: number | string,
  month?: number | string,
  quarter?: string,
): string | null {
  if (fileType === "monthly" && month != null) {
    const m = Number(month) - 1;
    if (m < 0 || m > 11) return null;
    return `${year}-${MONTHS[m]}`;
  }
  return null;
}

export function quarterMonths(quarter: string, year: number | string): string[] {
  const q = quarter.toUpperCase();
  const y = String(year);
  const map: Record<string, string[]> = {
    Q1: [`${y}-JAN`, `${y}-FEB`, `${y}-MAR`],
    Q2: [`${y}-APR`, `${y}-MAY`, `${y}-JUN`],
    Q3: [`${y}-JUL`, `${y}-AUG`, `${y}-SEP`],
    Q4: [`${y}-OCT`, `${y}-NOV`, `${y}-DEC`],
  };
  return map[q] || [];
}

export function validateRequestedPeriod(
  fileType: "monthly" | "quarterly",
  sourcePeriods: string[],
  year: number | string,
  month?: number | string,
  quarter?: string,
): DataQualityIssue[] {
  const issues: DataQualityIssue[] = [];
  if (!sourcePeriods.length) {
    issues.push({
      code: "MISSING_ACTIVITY_PERIOD",
      severity: "BLOCKER",
      field: "ACTIVITY_PERIOD",
      message: "No ACTIVITY_PERIOD values found in source.",
    });
    return issues;
  }

  if (fileType === "monthly") {
    const expected = requestedPeriodToSourceLabel("monthly", year, month);
    if (!expected) {
      issues.push({
        code: "INVALID_REQUESTED_PERIOD",
        severity: "BLOCKER",
        message: "Requested monthly period is invalid.",
      });
      return issues;
    }
    if (sourcePeriods.length > 1) {
      issues.push({
        code: "MULTIPLE_SOURCE_PERIODS",
        severity: "BLOCKER",
        sourceValue: sourcePeriods.join(", "),
        message: `Source contains multiple activity periods (${sourcePeriods.join(", ")}).`,
        recommendedAction: "Split the file by period or upload one period at a time.",
      });
    }
    if (sourcePeriods[0] !== expected) {
      issues.push({
        code: "PERIOD_MISMATCH",
        severity: "BLOCKER",
        sourceValue: sourcePeriods.join(", "),
        derivedValue: expected,
        message: `Source activity period (${sourcePeriods.join(", ")}) does not match requested period (${expected}).`,
        recommendedAction: "Select the period that matches ACTIVITY_PERIOD in the source file.",
      });
    }
  } else if (fileType === "quarterly" && quarter) {
    const allowed = quarterMonths(quarter, year);
    const unexpected = sourcePeriods.filter((p) => !allowed.includes(p));
    if (unexpected.length) {
      issues.push({
        code: "PERIOD_OUTSIDE_QUARTER",
        severity: "BLOCKER",
        sourceValue: sourcePeriods.join(", "),
        derivedValue: allowed.join(", "),
        message: `Source periods (${sourcePeriods.join(", ")}) fall outside requested quarter (${quarter} ${year}).`,
      });
    }
  }

  return issues;
}

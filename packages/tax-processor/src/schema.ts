import { createHash } from "node:crypto";
import type { DataQualityIssue } from "./canonical-types.js";

export const REQUIRED_FINANCIAL_COLUMNS = [
  "ACTIVITY_PERIOD",
  "TRANSACTION_TYPE",
  "TAX_REPORTING_SCHEME",
  "TAX_COLLECTION_RESPONSIBILITY",
  "TOTAL_ACTIVITY_VALUE_AMT_VAT_INCL",
  "TOTAL_ACTIVITY_VALUE_AMT_VAT_EXCL",
  "TOTAL_ACTIVITY_VALUE_VAT_AMT",
  "TRANSACTION_CURRENCY_CODE",
  "PRICE_OF_ITEMS_VAT_RATE_PERCENT",
] as const;

export const REQUIRED_ID_COLUMNS = [
  "TRANSACTION_EVENT_ID",
  "ACTIVITY_TRANSACTION_ID",
] as const;

export const REQUIRED_COUNTRY_COLUMNS = [
  "DEPARTURE_COUNTRY",
  "ARRIVAL_COUNTRY",
  "SALE_DEPART_COUNTRY",
  "SALE_ARRIVAL_COUNTRY",
  "SELLER_DEPART_VAT_NUMBER_COUNTRY",
  "SELLER_ARRIVAL_VAT_NUMBER_COUNTRY",
  "TRANSACTION_SELLER_VAT_NUMBER_COUNTRY",
  "BUYER_VAT_NUMBER_COUNTRY",
  "VAT_CALCULATION_IMPUTATION_COUNTRY",
  "TAXABLE_JURISDICTION",
] as const;

export const IMPORTANT_TAX_COLUMNS = [
  ...REQUIRED_FINANCIAL_COLUMNS,
  ...REQUIRED_ID_COLUMNS,
  ...REQUIRED_COUNTRY_COLUMNS,
] as const;

/** Known Amazon VAT report columns (2025+). Unknown columns are flagged, not substituted. */
export const KNOWN_AMAZON_COLUMNS = new Set([
  "UNIQUE_ACCOUNT_IDENTIFIER",
  "ACTIVITY_PERIOD",
  "SALES_CHANNEL",
  "MARKETPLACE",
  "PROGRAM_TYPE",
  "TRANSACTION_TYPE",
  "TRANSACTION_EVENT_ID",
  "ACTIVITY_TRANSACTION_ID",
  "TAX_CALCULATION_DATE",
  "TRANSACTION_DEPART_DATE",
  "TRANSACTION_ARRIVAL_DATE",
  "TRANSACTION_COMPLETE_DATE",
  "SELLER_SKU",
  "ASIN",
  "ITEM_DESCRIPTION",
  "ITEM_MANUFACTURE_COUNTRY",
  "QTY",
  "ITEM_WEIGHT",
  "TOTAL_ACTIVITY_WEIGHT",
  "COST_PRICE_OF_ITEMS",
  "PRICE_OF_ITEMS_AMT_VAT_EXCL",
  "PROMO_PRICE_OF_ITEMS_AMT_VAT_EXCL",
  "TOTAL_PRICE_OF_ITEMS_AMT_VAT_EXCL",
  "SHIP_CHARGE_AMT_VAT_EXCL",
  "PROMO_SHIP_CHARGE_AMT_VAT_EXCL",
  "TOTAL_SHIP_CHARGE_AMT_VAT_EXCL",
  "GIFT_WRAP_AMT_VAT_EXCL",
  "PROMO_GIFT_WRAP_AMT_VAT_EXCL",
  "TOTAL_GIFT_WRAP_AMT_VAT_EXCL",
  "TOTAL_ACTIVITY_VALUE_AMT_VAT_EXCL",
  "PRICE_OF_ITEMS_VAT_RATE_PERCENT",
  "PRICE_OF_ITEMS_VAT_AMT",
  "PROMO_PRICE_OF_ITEMS_VAT_AMT",
  "TOTAL_PRICE_OF_ITEMS_VAT_AMT",
  "SHIP_CHARGE_VAT_RATE_PERCENT",
  "SHIP_CHARGE_VAT_AMT",
  "PROMO_SHIP_CHARGE_VAT_AMT",
  "TOTAL_SHIP_CHARGE_VAT_AMT",
  "GIFT_WRAP_VAT_RATE_PERCENT",
  "GIFT_WRAP_VAT_AMT",
  "PROMO_GIFT_WRAP_VAT_AMT",
  "TOTAL_GIFT_WRAP_VAT_AMT",
  "TOTAL_ACTIVITY_VALUE_VAT_AMT",
  "PRICE_OF_ITEMS_AMT_VAT_INCL",
  "PROMO_PRICE_OF_ITEMS_AMT_VAT_INCL",
  "TOTAL_PRICE_OF_ITEMS_AMT_VAT_INCL",
  "SHIP_CHARGE_AMT_VAT_INCL",
  "PROMO_SHIP_CHARGE_AMT_VAT_INCL",
  "TOTAL_SHIP_CHARGE_AMT_VAT_INCL",
  "GIFT_WRAP_AMT_VAT_INCL",
  "PROMO_GIFT_WRAP_AMT_VAT_INCL",
  "TOTAL_GIFT_WRAP_AMT_VAT_INCL",
  "TOTAL_ACTIVITY_VALUE_AMT_VAT_INCL",
  "TRANSACTION_CURRENCY_CODE",
  "COMMODITY_CODE",
  "STATISTICAL_CODE_DEPART",
  "STATISTICAL_CODE_ARRIVAL",
  "COMMODITY_CODE_SUPPLEMENTARY_UNIT",
  "ITEM_QTY_SUPPLEMENTARY_UNIT",
  "TOTAL_ACTIVITY_SUPPLEMENTARY_UNIT",
  "PRODUCT_TAX_CODE",
  "DEPATURE_CITY",
  "DEPARTURE_COUNTRY",
  "DEPARTURE_POST_CODE",
  "ARRIVAL_CITY",
  "ARRIVAL_COUNTRY",
  "ARRIVAL_POST_CODE",
  "SALE_DEPART_COUNTRY",
  "SALE_ARRIVAL_COUNTRY",
  "TRANSPORTATION_MODE",
  "DELIVERY_CONDITIONS",
  "SELLER_DEPART_VAT_NUMBER_COUNTRY",
  "SELLER_DEPART_COUNTRY_VAT_NUMBER",
  "SELLER_ARRIVAL_VAT_NUMBER_COUNTRY",
  "SELLER_ARRIVAL_COUNTRY_VAT_NUMBER",
  "TRANSACTION_SELLER_VAT_NUMBER_COUNTRY",
  "TRANSACTION_SELLER_VAT_NUMBER",
  "BUYER_VAT_NUMBER_COUNTRY",
  "BUYER_VAT_NUMBER",
  "VAT_CALCULATION_IMPUTATION_COUNTRY",
  "TAXABLE_JURISDICTION",
  "TAXABLE_JURISDICTION_LEVEL",
  "VAT_INV_NUMBER",
  "VAT_INV_CONVERTED_AMT",
  "VAT_INV_CURRENCY_CODE",
  "VAT_INV_EXCHANGE_RATE",
  "VAT_INV_EXCHANGE_RATE_DATE",
  "EXPORT_OUTSIDE_EU",
  "INVOICE_URL",
  "BUYER_NAME",
  "ARRIVAL_ADDRESS",
  "SUPPLIER_NAME",
  "SUPPLIER_VAT_NUMBER",
  "TAX_REPORTING_SCHEME",
  "TAX_COLLECTION_RESPONSIBILITY",
]);

export type SchemaValidation = {
  valid: boolean;
  headers: string[];
  fingerprint: string;
  missingRequired: string[];
  unknownColumns: string[];
  issues: DataQualityIssue[];
};

function normalizeHeader(h: string): string {
  return h.replace(/^\uFEFF/, "").trim().replace(/^"|"$/g, "");
}

export function validateSchema(headers: string[]): SchemaValidation {
  const normalized = headers.map(normalizeHeader);
  const issues: DataQualityIssue[] = [];
  const missingRequired = IMPORTANT_TAX_COLUMNS.filter((c) => !normalized.includes(c));
  const unknownColumns = normalized.filter((c) => c && !KNOWN_AMAZON_COLUMNS.has(c));

  if (missingRequired.length) {
    for (const col of missingRequired) {
      issues.push({
        code: "MISSING_REQUIRED_COLUMN",
        severity: "BLOCKER",
        field: col,
        message: `Required column "${col}" is missing from the source file.`,
        recommendedAction: "Upload a complete Amazon VAT Transactions Report export.",
      });
    }
  }

  for (const col of unknownColumns) {
    issues.push({
      code: "UNKNOWN_SOURCE_COLUMN",
      severity: "WARNING",
      field: col,
      message: `Unknown source column "${col}" detected. Values will be preserved but not interpreted.`,
      recommendedAction: "Verify the export format with your adviser if this column is new.",
    });
  }

  const fingerprint = createHash("sha256")
    .update(normalized.sort().join("|"))
    .digest("hex")
    .slice(0, 16);

  return {
    valid: missingRequired.length === 0,
    headers: normalized,
    fingerprint,
    missingRequired,
    unknownColumns,
    issues,
  };
}

export function rowContentHash(row: Record<string, string>): string {
  const keys = Object.keys(row).sort();
  const payload = keys.map((k) => `${k}=${row[k] ?? ""}`).join("\t");
  return createHash("sha256").update(payload).digest("hex");
}

export function sourceFileHash(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

export function reportIdFrom(sourceHash: string, generatedAt: string): string {
  return createHash("sha256").update(`${sourceHash}:${generatedAt}`).digest("hex").slice(0, 12).toUpperCase();
}

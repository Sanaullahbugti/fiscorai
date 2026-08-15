import type { PlanCode } from "./types.js";

export const PROCESSOR_VERSION = "2.0.0";
export const CANONICAL_REPORT_MODEL_VERSION = "2.0.0";

export type ReconciliationStatus =
  | "READY"
  | "READY_WITH_WARNINGS"
  | "PARTIAL"
  | "NOT_READY"
  | "INVALID";

export type IssueSeverity = "INFO" | "WARNING" | "ERROR" | "BLOCKER";

export type DataQualityIssue = {
  code: string;
  severity: IssueSeverity;
  sourceRow?: number;
  transactionEventId?: string | null;
  field?: string;
  sourceValue?: string | null;
  derivedValue?: string | null;
  currency?: string | null;
  amount?: string | null;
  message: string;
  recommendedAction?: string;
};

export type SourceField<T extends string | null = string | null> = {
  raw: string | null;
  value: T;
};

export type MoneyField = SourceField<string | null>;

export type LinkProvenance =
  | "SOURCE_ROW"
  | "SALE_CONTEXT"
  | "MATCHED_ORIGINAL_TRANSACTION"
  | "UNRESOLVED";

export type RefundLink = {
  status: "matched" | "unmatched" | "not_applicable";
  matchedSourceRow?: number;
  matchedTransactionEventId?: string | null;
  provenance: LinkProvenance;
  strategyVersion: string;
};

export type DerivedContext = {
  salesDestination: SourceField<string | null>;
  reportingDestination: SourceField<string | null>;
  provenance: LinkProvenance;
};

export type NormalizedTransaction = {
  sourceRow: number;
  uniqueAccountIdentifier: SourceField;
  activityPeriod: SourceField;
  salesChannel: SourceField;
  marketplace: SourceField;
  programType: SourceField;
  transactionType: SourceField;
  transactionEventId: SourceField;
  activityTransactionId: SourceField;
  taxReportingScheme: SourceField;
  taxCollectionResponsibility: SourceField;
  transactionCurrencyCode: SourceField;
  activityValueIncl: MoneyField;
  activityValueExcl: MoneyField;
  activityVat: MoneyField;
  priceVatRatePercent: SourceField;
  departureCountry: SourceField;
  arrivalCountry: SourceField;
  saleDepartCountry: SourceField;
  saleArrivalCountry: SourceField;
  sellerDepartVatNumberCountry: SourceField;
  sellerArrivalVatNumberCountry: SourceField;
  transactionSellerVatNumberCountry: SourceField;
  buyerVatNumberCountry: SourceField;
  vatCalculationImputationCountry: SourceField;
  taxableJurisdiction: SourceField;
  qty: SourceField;
  derived: DerivedContext;
  refundLink: RefundLink;
  rowContentHash: string;
};

export type MonetaryTotals = {
  activityIncl: string;
  activityExcl: string;
  vat: string;
  currency: string;
  transactionCount: number;
  sourceRowIds: number[];
};

export type SchemeSummaryRow = {
  sourceTaxReportingScheme: string;
  taxCollectionResponsibility: string;
  reportingDestination: string;
  salesDestination: string;
  currency: string;
  activityIncl: string;
  activityExcl: string;
  vat: string;
  transactionCount: number;
  sourceRowIds: number[];
};

export type VatRateBreakdownRow = {
  sourceTaxReportingScheme: string;
  jurisdiction: string;
  sourceRate: string | null;
  displayRate: string | null;
  currency: string;
  activityIncl: string;
  activityExcl: string;
  vat: string;
  transactionCount: number;
  sourceRowIds: number[];
};

export type TransactionTypeSummary = {
  transactionType: string;
  currency: string | null;
  activityIncl: string;
  activityExcl: string;
  vat: string;
  count: number;
  sourceRowIds: number[];
};

export type RefundSummaryRow = {
  sourceRow: number;
  transactionEventId: string | null;
  currency: string;
  activityIncl: string;
  salesDestination: string | null;
  linkProvenance: LinkProvenance;
  matchedSourceRow?: number;
};

export type MovementSummaryRow = {
  sourceRow: number;
  transactionType: string;
  transactionEventId: string | null;
  qty: string | null;
  departureCountry: string | null;
  arrivalCountry: string | null;
  saleArrivalCountry: string | null;
};

export type ReportProvenance = {
  reportId: string;
  sourceFileName: string;
  sourceFileHash: string;
  sourceRowCount: number;
  sourceActivityPeriod: string | null;
  sourceActivityPeriods: string[];
  requestedPeriodLabel: string;
  processorVersion: string;
  canonicalReportModelVersion: string;
  generatedAt: string;
  reconciliationStatus: ReconciliationStatus;
  sourceSchemaFingerprint: string;
  truncated?: boolean;
  planLimit?: number | null;
  sourceTotalRows?: number;
};

export type ReportView = {
  provenance: ReportProvenance;
  executiveSummary: {
    activityPeriod: string | null;
    generatedAt: string;
    sourceRecords: number;
    transactionTypes: Record<string, number>;
    schemes: Record<string, number>;
    responsibilities: Record<string, number>;
    currencies: string[];
    sellerVatIdentified: Array<{ currency: string; amount: string }>;
    marketplaceActivity: Array<{ scheme: string; currency: string; amount: string }>;
    salesDestinations: string[];
    reconciliationStatus: ReconciliationStatus;
    issueCounts: Record<IssueSeverity, number>;
  };
  schemeSummaries: SchemeSummaryRow[];
  vatRateBreakdown: VatRateBreakdownRow[];
  transactionTypeSummaries: TransactionTypeSummary[];
  refundSummaries: RefundSummaryRow[];
  movementSummaries: MovementSummaryRow[];
  totalsByCurrency: MonetaryTotals[];
  issues: DataQualityIssue[];
};

export type CanonicalReportV2 = {
  version: typeof CANONICAL_REPORT_MODEL_VERSION;
  rows: NormalizedTransaction[];
  view: ReportView;
  reconciliationStatus: ReconciliationStatus;
};

export type ProcessInput = {
  planCode: PlanCode;
  fileType: "monthly" | "quarterly";
  permissive?: boolean;
  requestedPeriodLabel: string;
  sourceFileName: string;
  sourceFileHash: string;
  requestedYear: number | string;
  requestedMonth?: number | string;
  requestedQuarter?: string;
};

export type ProcessResult = {
  canonical: CanonicalReportV2 | null;
  legacy: import("./types.js").ProcessedReport | null;
  reconciliationStatus: ReconciliationStatus;
  issues: DataQualityIssue[];
  errors: string[];
};

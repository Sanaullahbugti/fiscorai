export type PlanCode = "0" | "1" | "2" | "3";

export type TransactionRow = {
  transaction_type: string;
  exp_country: string;
  vat_percentage: string | number;
  total: number;
  base: number;
  vat: number;
  currency: string;
};

export type CategoryBucket = {
  category: string;
  ALL?: TransactionRow[];
  VAT?: TransactionRow[];
  TRANSACTION?: TransactionRow[];
};

export type CountryResult = {
  country: string;
  transactionCategories: CategoryBucket[];
};

export type ProcessedReport = {
  countries: CountryResult[];
  meta: {
    totalRows: number;
    processedRows: number;
    truncated: boolean;
    planLimit: number | null;
    periodLabel: string;
    reconciliationStatus?: string;
    reportId?: string;
    sourceActivityPeriod?: string | null;
    sourceFileName?: string;
    sourceFileHash?: string;
    processorVersion?: string;
    generatedAt?: string;
  };
};

export type ProcessOptions = {
  planCode: PlanCode;
  fileType: "monthly" | "quarterly";
  periodLabel: string;
  requestedYear?: number | string;
  requestedMonth?: number | string;
  requestedQuarter?: string;
};

export const PLAN_LIMITS: Record<
  PlanCode,
  { monthly: number | null; quarterly: number | null }
> = {
  "0": { monthly: 50, quarterly: 50 },
  "1": { monthly: 1500, quarterly: 4500 },
  "2": { monthly: 4500, quarterly: 13500 },
  "3": { monthly: null, quarterly: null },
};

export const JURISDICTION_NAMES: Record<string, string> = {
  DE: "Germany",
  FR: "France",
  IT: "Italy",
  ES: "Spain",
  NL: "Netherlands",
  PL: "Poland",
  SE: "Sweden",
  GB: "United Kingdom",
  CH: "Switzerland",
  AT: "Austria",
  BE: "Belgium",
  IE: "Ireland",
  PT: "Portugal",
  CZ: "Czech Republic",
  SK: "Slovakia",
  FI: "Finland",
  DK: "Denmark",
  LU: "Luxembourg",
  HU: "Hungary",
  RO: "Romania",
  BG: "Bulgaria",
  HR: "Croatia",
  SI: "Slovenia",
  LT: "Lithuania",
  LV: "Latvia",
  EE: "Estonia",
  CY: "Cyprus",
  MT: "Malta",
  GR: "Greece",
  NO: "Norway",
  GERMANY: "Germany",
  FRANCE: "France",
  ITALY: "Italy",
  SPAIN: "Spain",
  NETHERLANDS: "Netherlands",
  POLAND: "Poland",
  SWEDEN: "Sweden",
  "UNITED KINGDOM": "United Kingdom",
  SWITZERLAND: "Switzerland",
};

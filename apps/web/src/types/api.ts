export type TransactionRow = {
  transaction_type?: string;
  exp_country?: string;
  vat_percentage?: string | number;
  total: number;
  base: number;
  vat: number;
  currency: string;
};

export type Category = {
  category: string;
  transactions: {
    ALL?: TransactionRow[];
    VAT?: TransactionRow[];
    TRANSACTION?: TransactionRow[];
  };
};

export type Country = {
  country: string;
  transactionCategories: Category[];
};

export type ProcessMeta = {
  totalRows: number;
  processedRows: number;
  truncated: boolean;
  planLimit: number | null;
  periodLabel: string;
};

export type ProcessedPayload = {
  countries: Country[];
  meta: ProcessMeta | null;
};

export type InsightAlert = {
  sev: "info" | "warning" | "critical";
  code: string;
  title: string;
  detail: string;
};

export type PeriodInsights = {
  period: {
    fileType: string;
    year: string | number;
    month?: string | number;
    quarter?: string;
    label: string;
  };
  totals: { sales: number; refunds: number; vat: number; net: number };
  pulse: {
    priorLabel: string | null;
    salesDeltaPct: number | null;
    refundsDeltaPct: number | null;
    vatDeltaPct: number | null;
    verdict: string;
  };
  byRate: Array<{ rate: string; total: number; base: number; vat: number }>;
  schemeMix: Array<{ scheme: string; sales: number; vat: number; salesSharePct: number }>;
  watchlist: Array<{
    country: string;
    sales: number;
    refunds: number;
    vat: number;
    refundRatePct: number | null;
  }>;
  alerts: InsightAlert[];
  meta: ProcessMeta | null;
  filingHints: Array<{ scheme: string; amount: number; due: string; note: string }>;
};

export type GeneralResponse<T> = {
  message: string;
  statusCode: number;
  data?: T;
};

export type AuthUser = {
  userId: string;
  username: string;
  email?: string;
  jwtToken: string;
  refreshToken?: string;
  userSubscription?: { plan: string; price: number; active: boolean; expiresAt?: string | null };
};

export type PeriodPayload = {
  fileType: "monthly" | "quarterly";
  year: number;
  month?: string;
  quarter?: string;
  fileExtension?: string;
};

export type UserProfile = {
  id: string;
  email: string;
  username: string;
  contact?: string | null;
  alias?: string | null;
  amazonId?: string | null;
  plan: string;
  lemonCustomerId?: string | null;
  businessUser?: boolean;
};

export type PaymentRecord = {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: string;
  plan?: string | null;
  lemonOrderId?: string | null;
  invoiceId?: string | null;
  invoiceHostedURL?: string | null;
  createdAt: string;
};

export type CountryRollup = {
  country: string;
  sales: number;
  refunds: number;
  vat: number;
  refundRatePct: number | null;
};

export type PeriodSummary = {
  period: {
    fileType: string;
    year: string | number;
    month?: string | number;
    quarter?: string;
    label: string;
  };
  totals: { sales: number; refunds: number; vat: number; net: number };
  byCategory: Record<string, number>;
  topCountries: CountryRollup[];
  countryCount: number;
};

/** Business rollup across every uploaded period — powers the dashboard trend and country table. */
export type DashboardOverview = {
  scope: "all_uploaded_periods";
  periodCount: number;
  overall: {
    sales: number;
    refunds: number;
    vat: number;
    net: number;
    byCategory: Record<string, number>;
    topCountries: CountryRollup[];
    countryCount: number;
  };
  byPeriod: PeriodSummary[];
};

export type SubscriptionInfo = {
  plan: string;
  price: number;
  active: boolean;
  /** True once the seller has canceled — still `active` until expiresAt, then auto-drops to Free. */
  canceled?: boolean;
  expiresAt?: string | null;
};

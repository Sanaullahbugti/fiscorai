export type AnalystMode = "vat-data" | "ecommerce-strategy";

/** Which uploaded periods an answer may draw on. Comparison arrives in a later phase. */
export type AnalystScope =
  | { type: "all" }
  | { type: "monthly"; year: number; month: string }
  | { type: "quarterly"; year: number; quarter: string };

export type AnalystSourcePayload = {
  fileType: "monthly" | "quarterly";
  year: number;
  month?: string;
  quarter?: string;
};

export type AnalystSource = {
  period: string;
  countries?: string[];
  transactionCount?: number;
  /** Present for VAT-data answers; lets the client offer the underlying report. */
  payload?: AnalystSourcePayload;
};

export type AnalystReportDownload = {
  format: string;
  label: string;
  downloadUrl: string;
};

export type AnalystReportMatch = {
  label: string;
  fileType: "monthly" | "quarterly";
  year: number;
  month?: string;
  quarter?: string;
  formats: string[];
  downloads?: AnalystReportDownload[];
};

export type AnalystResponseMetadata = {
  mode: AnalystMode;
  scope: {
    type: AnalystScope["type"] | "comparison";
    label: string;
    periods: string[];
  };
  sources?: AnalystSource[];
  /**
   * Confirmed on-disk report files for a single-period answer. Populated by
   * findReports and/or the stream layer when the question names one period —
   * never guessed, never used for all-periods overviews.
   */
  reportMatches?: AnalystReportMatch[];
  generatedAt: string;
};

/** Narrows the untyped `metadata` bag that rides along on a streamed UIMessage. */
export function readMetadata(value: unknown): AnalystResponseMetadata | null {
  if (!value || typeof value !== "object") return null;
  const m = value as Partial<AnalystResponseMetadata>;
  return m.mode && m.scope ? (m as AnalystResponseMetadata) : null;
}

export const ANALYST_MODES: AnalystMode[] = ["vat-data", "ecommerce-strategy"];

export function isAnalystMode(v: unknown): v is AnalystMode {
  return typeof v === "string" && (ANALYST_MODES as string[]).includes(v);
}

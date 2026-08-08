export type PeriodInput = {
  fileType: "monthly" | "quarterly";
  year: number | string;
  month?: string | number;
  quarter?: string;
};

export type SavedCsv = {
  filename: string;
  /** Local: absolute dir path. R2: object key prefix (no trailing slash). */
  dir: string;
};

export type PeriodFile = {
  filename: string;
  buffer: Buffer;
  fullPath: string;
};

export interface StorageRepository {
  ensureUser(email: string): Promise<void>;
  clearPeriod(email: string, input: PeriodInput): Promise<void>;
  writePlan(email: string, code: string): Promise<void>;
  writeAmazonToken(email: string, token: string): Promise<void>;
  saveCsv(
    email: string,
    input: PeriodInput,
    filename: string,
    buffer: Buffer,
  ): Promise<SavedCsv>;
  writeArtifacts(
    dir: string,
    baseName: string,
    artifacts: {
      json: object;
      pdf: Buffer;
      xlsx: Buffer;
      canonical?: object;
      manifest?: object;
    },
  ): Promise<void>;
  listExcelKeys(email: string): Promise<{ monthly: string[]; quarterly: string[] }>;
  listProcessedPeriods(email: string): Promise<PeriodInput[]>;
  listPeriodFormats(email: string, input: PeriodInput): Promise<string[]>;
  findInPeriod(email: string, input: PeriodInput, ext: string): Promise<PeriodFile | null>;
  readJson(
    email: string,
    input: PeriodInput,
  ): Promise<{
    countries?: unknown[];
    meta?: unknown;
    canonical?: { view?: unknown; reconciliationStatus?: string };
    issues?: unknown[];
    version?: string;
  } | null>;
}

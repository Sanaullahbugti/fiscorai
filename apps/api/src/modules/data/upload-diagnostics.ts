import type { Request } from "express";
import type { AuthRequest } from "../../middlewares/auth.js";
import { requestDurationMs, requestId } from "../../middlewares/request-context.js";

type UploadRequest = AuthRequest & {
  body?: Record<string, unknown>;
  file?: Express.Multer.File;
};

type UploadResultData = {
  code?: unknown;
  issues?: Array<{ code?: unknown }>;
  reconciliationStatus?: unknown;
  reportId?: unknown;
};

export type UploadOutcome = "success" | "rejected" | "failed";

function asResultData(value: unknown): UploadResultData {
  return value && typeof value === "object" ? value as UploadResultData : {};
}

function fileExtension(filename: string | undefined): string | undefined {
  if (!filename) return undefined;
  const dot = filename.lastIndexOf(".");
  return dot >= 0 ? filename.slice(dot).toLowerCase() : "none";
}

export function isCsvUploadRequest(req: Request): boolean {
  const path = req.originalUrl.split("?")[0];
  return req.method === "POST" && path.endsWith("/api/v1/data/upload-csv");
}

/**
 * Render-readable diagnostics for support. Intentionally excludes email,
 * filename, CSV contents, error messages, tokens, and financial values.
 */
export function logCsvUpload(
  req: Request,
  outcome: UploadOutcome,
  statusCode: number,
  resultData?: unknown,
) {
  const uploadReq = req as UploadRequest;
  const body = uploadReq.body || {};
  const data = asResultData(resultData);
  const issueCodes = Array.isArray(data.issues)
    ? [...new Set(data.issues
      .map((issue) => typeof issue?.code === "string" ? issue.code : undefined)
      .filter((code): code is string => Boolean(code)))]
    : [];

  const record = {
    event: "csv_upload",
    requestId: requestId(req),
    outcome,
    statusCode,
    durationMs: requestDurationMs(req),
    userId: uploadReq.user?.id,
    selectedPeriod: {
      fileType: typeof body.fileType === "string" ? body.fileType : undefined,
      year: typeof body.year === "string" || typeof body.year === "number" ? body.year : undefined,
      month: typeof body.month === "string" || typeof body.month === "number" ? body.month : undefined,
      quarter: typeof body.quarter === "string" ? body.quarter : undefined,
    },
    file: uploadReq.file
      ? {
          sizeBytes: uploadReq.file.size,
          extension: fileExtension(uploadReq.file.originalname),
        }
      : undefined,
    reconciliationStatus: typeof data.reconciliationStatus === "string"
      ? data.reconciliationStatus
      : undefined,
    errorCode: typeof data.code === "string" ? data.code : undefined,
    issueCodes,
    reportId: outcome === "success" && typeof data.reportId === "string"
      ? data.reportId
      : undefined,
  };

  console.info(JSON.stringify(record));
}

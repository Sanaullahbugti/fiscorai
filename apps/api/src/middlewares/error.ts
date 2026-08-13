import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { AppError } from "../shared/errors.js";
import { fail } from "../shared/response.js";
import { isCsvUploadRequest, logCsvUpload } from "../modules/data/upload-diagnostics.js";
import { mailService } from "../modules/mail/mail.service.js";
import { requestId } from "./request-context.js";

function dataWithRequestId(data: unknown, id: string): Record<string, unknown> {
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return { ...(data as Record<string, unknown>), requestId: id };
  }
  return data === undefined ? { requestId: id } : { requestId: id, details: data };
}

function multerAppError(err: InstanceType<typeof multer.MulterError>): AppError {
  if (err.code === "LIMIT_FILE_SIZE") {
    return new AppError("CSV file is too large. Maximum size is 100 MB.", 413, {
      code: "FILE_TOO_LARGE",
      maxBytes: 100 * 1024 * 1024,
    });
  }
  return new AppError("Invalid CSV upload.", 400, {
    code: err.code || "INVALID_MULTIPART_UPLOAD",
  });
}

export function errorMiddleware(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const id = requestId(req);
  const uploadRequest = isCsvUploadRequest(req);
  const normalized = err instanceof multer.MulterError ? multerAppError(err) : err;

  if (normalized instanceof AppError) {
    if (uploadRequest) {
      const outcome = normalized.statusCode >= 500 ? "failed" : "rejected";
      const diagnostic = logCsvUpload(
        req,
        outcome,
        normalized.statusCode,
        normalized.data,
      );
      if (diagnostic.userId) {
        mailService.enqueueUploadFailureAlert({
          ...diagnostic,
          outcome,
          userId: diagnostic.userId,
        });
      }
    }
    return res
      .status(normalized.statusCode)
      .json(fail(
        normalized.message,
        normalized.statusCode,
        dataWithRequestId(normalized.data, id),
      ));
  }

  if (uploadRequest) {
    const diagnostic = logCsvUpload(req, "failed", 500, {
      code: "UNHANDLED_UPLOAD_ERROR",
    });
    if (diagnostic.userId) {
      mailService.enqueueUploadFailureAlert({
        ...diagnostic,
        outcome: "failed",
        userId: diagnostic.userId,
      });
    }
  } else {
    console.error(normalized);
  }
  return res
    .status(500)
    .json(fail("Internal server error", 500, { requestId: id }));
}

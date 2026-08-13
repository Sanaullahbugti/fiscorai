import express, { type RequestHandler } from "express";
import multer from "multer";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../shared/errors.js";
import { logCsvUpload } from "../modules/data/upload-diagnostics.js";
import { errorMiddleware } from "./error.js";
import { requestContextMiddleware } from "./request-context.js";

type TestUploadRequest = express.Request & {
  user?: { id: string; email: string };
  file?: Express.Multer.File;
};

function uploadApp(handler: RequestHandler, includeFile = true) {
  const app = express();
  app.use(requestContextMiddleware);
  app.post("/api/v1/data/upload-csv", (req: TestUploadRequest, res, next) => {
    req.user = { id: "user-123", email: "private-client@example.com" };
    req.body = {
      fileType: "monthly",
      year: "2026",
      month: "8",
      rawCsv: "secret-financial-row",
    };
    if (includeFile) {
      req.file = {
        originalname: "private-client-report.csv",
        size: 42,
        buffer: Buffer.from("secret-financial-row"),
      } as Express.Multer.File;
    }
    handler(req, res, next);
  });
  app.use(errorMiddleware);
  return app;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("CSV upload diagnostics", () => {
  it("adds a correlation header and emits a redacted success record", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const app = uploadApp((req, res) => {
      logCsvUpload(req, "success", 200, {
        reconciliationStatus: "READY",
        reportId: "REPORT123",
        issues: [{ code: "KNOWN_WARNING", sourceValue: "private-value" }],
      });
      res.json({ ok: true });
    });

    const response = await request(app).post("/api/v1/data/upload-csv");

    expect(response.status).toBe(200);
    expect(response.headers["x-request-id"]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(info).toHaveBeenCalledOnce();
    const logged = info.mock.calls[0]![0] as string;
    const record = JSON.parse(logged);
    expect(record).toMatchObject({
      event: "csv_upload",
      requestId: response.headers["x-request-id"],
      outcome: "success",
      statusCode: 200,
      userId: "user-123",
      selectedPeriod: { fileType: "monthly", year: "2026", month: "8" },
      file: { sizeBytes: 42, extension: ".csv" },
      reconciliationStatus: "READY",
      issueCodes: ["KNOWN_WARNING"],
      reportId: "REPORT123",
    });
    expect(logged).not.toContain("private-client@example.com");
    expect(logged).not.toContain("private-client-report.csv");
    expect(logged).not.toContain("private-value");
    expect(logged).not.toContain("secret-financial-row");
  });

  it("returns and logs a correlated 422 without sensitive issue details", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const app = uploadApp((_req, _res, next) => {
      next(new AppError("Sensitive period mismatch message", 422, {
        reconciliationStatus: "INVALID",
        issues: [{
          code: "PERIOD_MISMATCH",
          sourceValue: "private-source-period",
          message: "private processor details",
        }],
      }));
    });

    const response = await request(app).post("/api/v1/data/upload-csv");
    const requestId = response.headers["x-request-id"];

    expect(response.status).toBe(422);
    expect(response.body.data.requestId).toBe(requestId);
    expect(response.body.data.issues[0].code).toBe("PERIOD_MISMATCH");
    const logged = info.mock.calls[0]![0] as string;
    expect(JSON.parse(logged)).toMatchObject({
      requestId,
      outcome: "rejected",
      statusCode: 422,
      reconciliationStatus: "INVALID",
      issueCodes: ["PERIOD_MISMATCH"],
    });
    expect(logged).not.toContain("private-source-period");
    expect(logged).not.toContain("private processor details");
    expect(logged).not.toContain("Sensitive period mismatch message");
  });

  it("normalizes oversized multipart uploads to a correlated 413", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const app = uploadApp((_req, _res, next) => {
      next(new multer.MulterError("LIMIT_FILE_SIZE", "file"));
    }, false);

    const response = await request(app).post("/api/v1/data/upload-csv");

    expect(response.status).toBe(413);
    expect(response.body.message).toContain("100 MB");
    expect(response.body.data).toMatchObject({
      code: "FILE_TOO_LARGE",
      maxBytes: 100 * 1024 * 1024,
      requestId: response.headers["x-request-id"],
    });
  });

  it("normalizes malformed multipart uploads to a correlated 400", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const app = uploadApp((_req, _res, next) => {
      next(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "wrong-field"));
    }, false);

    const response = await request(app).post("/api/v1/data/upload-csv");

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      message: "Invalid CSV upload.",
      data: {
        code: "LIMIT_UNEXPECTED_FILE",
        requestId: response.headers["x-request-id"],
      },
    });
  });
});

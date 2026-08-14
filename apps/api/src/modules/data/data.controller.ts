import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../../middlewares/auth.js";
import { ok } from "../../shared/response.js";
import { dataService } from "./data.service.js";
import type { PeriodInput } from "./storage.repository.js";
import { logCsvUpload } from "./upload-diagnostics.js";

function periodFrom(body: Record<string, unknown>): PeriodInput {
  return {
    fileType: String(body.fileType || "monthly") as "monthly" | "quarterly",
    year: body.year as string | number,
    month: body.month as string | number | undefined,
    quarter: body.quarter as string | undefined,
  };
}

function optionalUploadPeriod(body: Record<string, unknown>): PeriodInput | undefined {
  if (!body.fileType || body.year == null) return undefined;
  if (body.fileType === "monthly" && body.month == null) return undefined;
  if (body.fileType === "quarterly" && body.quarter == null) return undefined;
  return periodFrom(body);
}

export class DataController {
  uploadCsv = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await dataService.uploadCsv(
        req.user!.email,
        req.user!.id,
        optionalUploadPeriod(req.body),
        req.file as Express.Multer.File,
      );
      logCsvUpload(req, "success", 200, data);
      res.json(ok(data));
    } catch (e) {
      next(e);
    }
  };

  userFiles = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await dataService.userFiles(req.user!.email);
      res.json(data);
    } catch (e) {
      next(e);
    }
  };

  overview = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await dataService.overview(req.user!.email);
      res.json(ok(data));
    } catch (e) {
      next(e);
    }
  };

  insights = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await dataService.insights(req.user!.email, req.user!.id, periodFrom(req.body));
      res.json(ok(data));
    } catch (e) {
      next(e);
    }
  };

  getProcessedJson = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await dataService.getProcessedJson(req.user!.email, periodFrom(req.body));
      res.json(ok(data));
    } catch (e) {
      next(e);
    }
  };

  downloadFile = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const file = await dataService.downloadFile(req.user!.email, {
        ...periodFrom(req.body),
        fileExtension: req.body.fileExtension,
      });
      const ext = String(req.body.fileExtension || "xlsx").toLowerCase();
      const contentTypes: Record<string, string> = {
        pdf: "application/pdf",
        xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        json: "application/json",
        csv: "text/csv",
      };
      res.type(contentTypes[ext] || "application/octet-stream");
      res.setHeader("Content-Disposition", `attachment; filename="${file.filename}"`);
      res.send(file.buffer);
    } catch (e) {
      next(e);
    }
  };
}

export const dataController = new DataController();

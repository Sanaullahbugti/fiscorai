import {
  batchCsvByActivityPeriod,
  processVatReport,
  type DetectedPeriodTarget,
  type PlanCode,
  type ReportManifestV2,
} from "@fiscorai/tax-processor";
import { AppError } from "../../shared/errors.js";
import { planToCode } from "../../shared/plans.js";
import { userRepository } from "../users/users.repository.js";
import { subscriptionRepository } from "../subscriptions/subscriptions.repository.js";
import { buildAllDataSummary } from "../analyst/analyst.summary.js";
import { buildInsights, type ProcessMeta } from "./insights.js";
import { storageRepository, type PeriodInput } from "./storage.repository.js";

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

function periodLabel(input: PeriodInput): string {
  if (input.fileType === "monthly") {
    const m = Number(input.month) - 1;
    return `${input.year}-${MONTHS[m] || "JAN"}`;
  }
  return `${input.quarter}-${input.year}`;
}

function mapCountries(rawCountries: Array<{ country: string; transactionCategories: Array<Record<string, unknown>> }>) {
  return rawCountries.map((c) => ({
    country: c.country,
    transactionCategories: (c.transactionCategories || []).map((cat) => {
      const category = String(cat.category || "");
      const transactions: Record<string, unknown> = {};
      for (const key of ["ALL", "VAT", "TRANSACTION"] as const) {
        if (Array.isArray(cat[key])) transactions[key] = cat[key];
        else if (cat.transactions && typeof cat.transactions === "object") {
          const t = cat.transactions as Record<string, unknown>;
          if (Array.isArray(t[key])) transactions[key] = t[key];
        }
      }
      return { category, transactions };
    }),
  }));
}

function fallbackTarget(input?: PeriodInput): DetectedPeriodTarget {
  const now = new Date();
  const year = Number(input?.year);
  if (input?.fileType === "monthly") {
    const month = Number(input.month);
    if (Number.isInteger(year) && Number.isInteger(month) && month >= 1 && month <= 12) {
      return {
        fileType: "monthly",
        year,
        month: String(month),
        quarter: `Q${Math.floor((month - 1) / 3) + 1}`,
      };
    }
  }
  if (input?.fileType === "quarterly") {
    const quarter = String(input.quarter || "").toUpperCase();
    if (Number.isInteger(year) && /^Q[1-4]$/.test(quarter)) {
      const quarterNumber = Number(quarter.slice(1));
      return {
        fileType: "quarterly",
        year,
        month: String((quarterNumber - 1) * 3 + 1),
        quarter,
      };
    }
  }
  const month = now.getUTCMonth() + 1;
  return {
    fileType: "monthly",
    year: now.getUTCFullYear(),
    month: String(month),
    quarter: `Q${Math.floor((month - 1) / 3) + 1}`,
  };
}

export class DataService {
  async uploadCsv(email: string, userId: string, input: PeriodInput | undefined, file: Express.Multer.File) {
    if (!file) throw new AppError("CSV file required", 400);
    if (!file.originalname.toLowerCase().endsWith(".csv")) {
      throw new AppError("Only .csv files are allowed", 400);
    }

    const user = await userRepository.findById(userId);
    if (!user) throw new AppError("User not found", 404);

    const planCode = planToCode(user.plan) as PlanCode;
    await storageRepository.writePlan(email, planCode);

    const csvText = file.buffer.toString("utf8");
    const batches = batchCsvByActivityPeriod(csvText, fallbackTarget(input));
    const uploads = [];

    for (const batch of batches) {
      const target: PeriodInput = batch.target;
      const artifacts = await processVatReport(batch.csvText, {
        planCode,
        fileType: target.fileType,
        periodLabel: periodLabel(target),
        permissive: true,
        sourceFileName: file.originalname,
        requestedYear: target.year,
        requestedMonth: target.month,
        requestedQuarter: target.quarter,
      });

      const batchBuffer = Buffer.from(batch.csvText, "utf8");
      await storageRepository.clearPeriod(email, target);
      const saved = await storageRepository.saveCsv(
        email,
        target,
        file.originalname,
        batchBuffer,
      );
      const stem = saved.filename.replace(/\.csv$/i, "");
      const manifest: ReportManifestV2 = {
        version: "2.0.0",
        reportId: artifacts.report.meta.reportId || "",
        sourceFileName: file.originalname,
        sourceActivityPeriod: artifacts.report.meta.sourceActivityPeriod ?? null,
        requestedPeriodLabel: periodLabel(target),
        reconciliationStatus: "READY",
        processorVersion: artifacts.report.meta.processorVersion || "2.0.0",
        publishedAt: new Date().toISOString(),
        artifacts: {
          json: `${stem}.csvprocesado.json`,
          pdf: `${stem}.csvprocesado.pdf`,
          xlsx: `${stem}.csvprocesado.xlsx`,
          canonical: `${stem}.canonical.v2.json`,
        },
      };
      const canonical = artifacts.canonical ?? {
        version: "2.0.0",
        view: null,
        reconciliationStatus: "READY",
      };

      await storageRepository.writeArtifacts(saved.dir, saved.filename, {
        json: artifacts.json,
        pdf: artifacts.pdf,
        xlsx: artifacts.xlsx,
        canonical,
        manifest,
      });

      uploads.push({
        filename: saved.filename,
        status: "ready",
        meta: artifacts.report.meta,
        reconciliationStatus: "READY",
        reportId: artifacts.report.meta.reportId,
        issues: [],
        target: batch.target,
        sourcePeriods: batch.sourcePeriods,
      });
    }

    const primary = uploads[uploads.length - 1]!;
    return {
      ...primary,
      targets: uploads.map((upload) => upload.target),
      uploads,
    };
  }

  async userFiles(email: string) {
    return storageRepository.listExcelKeys(email);
  }

  async listProcessedPeriods(email: string) {
    return storageRepository.listProcessedPeriods(email);
  }

  async getProcessedJson(email: string, input: PeriodInput) {
    const raw = await storageRepository.readJson(email, input);
    if (!raw?.countries) throw new AppError("No data present", 404);

    const countries = mapCountries(
      raw.countries as Array<{ country: string; transactionCategories: Array<Record<string, unknown>> }>,
    );
    const meta = (raw.meta as ProcessMeta | undefined) ?? null;
    const canonical = raw.canonical ?? null;
    const issues = Array.isArray(raw.issues) ? raw.issues : [];
    return { countries, meta, canonical, issues };
  }

  /** Load processed JSON for every uploaded period (skips missing/corrupt). */
  async getAllProcessedPeriods(email: string) {
    const periods = await storageRepository.listProcessedPeriods(email);
    const loaded: Array<{
      period: PeriodInput;
      countries: Awaited<ReturnType<DataService["getProcessedJson"]>>["countries"];
    }> = [];

    for (const period of periods) {
      try {
        const { countries } = await this.getProcessedJson(email, period);
        if (countries.length) loaded.push({ period, countries });
      } catch {
        /* skip empty/corrupt period */
      }
    }

    return loaded;
  }

  async overview(email: string) {
    const loaded = await this.getAllProcessedPeriods(email);
    if (!loaded.length) return null;
    return buildAllDataSummary(loaded);
  }

  async insights(email: string, userId: string, input: PeriodInput) {
    const { countries, meta, canonical, issues } = await this.getProcessedJson(email, input);
    const overview = await this.overview(email);
    const sub = await subscriptionRepository.findByUserId(userId);
    const now = new Date();
    const planActive = !!sub?.active && (!sub.expiresAt || sub.expiresAt > now);
    return buildInsights({
      period: input,
      countries,
      meta,
      canonicalView: (canonical as { view?: import("@fiscorai/tax-processor").ReportView } | null)?.view ?? null,
      dataQualityIssues: issues as import("@fiscorai/tax-processor").DataQualityIssue[],
      overview,
      planActive,
    });
  }

  async downloadFile(email: string, input: PeriodInput & { fileExtension?: string }) {
    const ext = (input.fileExtension || "xlsx").toLowerCase();
    const file = await storageRepository.findInPeriod(email, input, `.${ext}`);
    if (!file) throw new AppError("File not found", 404);
    return file;
  }
}

export const dataService = new DataService();

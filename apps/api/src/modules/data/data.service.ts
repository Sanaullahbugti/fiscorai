import { processVatReport, type PlanCode, type ReportManifestV2 } from "@fiscorai/tax-processor";
import type { DataQualityIssue } from "@fiscorai/tax-processor";
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

function uploadRejectionMessage(
  reconciliationStatus: string,
  issues: DataQualityIssue[],
): string {
  const periodMismatch = issues.find((i) => i.code === "PERIOD_MISMATCH");
  if (periodMismatch) {
    const detected = periodMismatch.sourceValue || "unknown period(s)";
    const selected = periodMismatch.derivedValue || "the selected period";
    return `Period mismatch: the file contains ACTIVITY_PERIOD ${detected}, but you selected ${selected}. Change the period picker to match the file, then upload again.`;
  }

  const blocker = issues.find((i) => i.severity === "BLOCKER");
  if (blocker?.message) return blocker.message;

  if (reconciliationStatus === "INVALID") {
    return "Could not parse this VAT source file. Check that it is a complete Amazon VAT Transactions Report export.";
  }

  return "Source file failed reconciliation checks. Review data-quality issues and try again.";
}

export class DataService {
  async uploadCsv(email: string, userId: string, input: PeriodInput, file: Express.Multer.File) {
    if (!file) throw new AppError("CSV file required", 400);
    if (!file.originalname.toLowerCase().endsWith(".csv")) {
      throw new AppError("Only .csv files are allowed", 400);
    }

    const user = await userRepository.findById(userId);
    if (!user) throw new AppError("User not found", 404);

    const planCode = planToCode(user.plan) as PlanCode;
    await storageRepository.writePlan(email, planCode);

    const csvText = file.buffer.toString("utf8");
    const artifacts = await processVatReport(csvText, {
      planCode,
      fileType: input.fileType,
      periodLabel: periodLabel(input),
      sourceFileName: file.originalname,
      requestedYear: input.year,
      requestedMonth: input.month,
      requestedQuarter: input.quarter,
    });

    if (artifacts.reconciliationStatus === "INVALID") {
      throw new AppError(
        uploadRejectionMessage("INVALID", artifacts.issues),
        422,
        {
          issues: artifacts.issues,
          reconciliationStatus: artifacts.reconciliationStatus,
        },
      );
    }

    if (artifacts.reconciliationStatus === "NOT_READY") {
      throw new AppError(
        uploadRejectionMessage("NOT_READY", artifacts.issues),
        422,
        { issues: artifacts.issues, reconciliationStatus: artifacts.reconciliationStatus },
      );
    }

    await storageRepository.clearPeriod(email, input);
    const saved = await storageRepository.saveCsv(email, input, file.originalname, file.buffer);

    const stem = saved.filename.replace(/\.csv$/i, "");
    const manifest: ReportManifestV2 = {
      version: "2.0.0",
      reportId: artifacts.report.meta.reportId || "",
      sourceFileName: file.originalname,
      sourceActivityPeriod: artifacts.report.meta.sourceActivityPeriod ?? null,
      requestedPeriodLabel: periodLabel(input),
      reconciliationStatus: artifacts.reconciliationStatus,
      processorVersion: artifacts.report.meta.processorVersion || "2.0.0",
      publishedAt: new Date().toISOString(),
      artifacts: {
        json: `${stem}.csvprocesado.json`,
        pdf: `${stem}.csvprocesado.pdf`,
        xlsx: `${stem}.csvprocesado.xlsx`,
        canonical: `${stem}.canonical.v2.json`,
      },
    };

    await storageRepository.writeArtifacts(saved.dir, saved.filename, {
      json: artifacts.json,
      pdf: artifacts.pdf,
      xlsx: artifacts.xlsx,
      canonical: artifacts.canonical ?? undefined,
      manifest,
    });

    const status =
      artifacts.reconciliationStatus === "READY" || artifacts.reconciliationStatus === "READY_WITH_WARNINGS"
        ? "ready"
        : artifacts.reconciliationStatus.toLowerCase();

    return {
      filename: saved.filename,
      status,
      meta: artifacts.report.meta,
      reconciliationStatus: artifacts.reconciliationStatus,
      reportId: artifacts.report.meta.reportId,
      issues: artifacts.issues.filter((i) => i.severity !== "INFO"),
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

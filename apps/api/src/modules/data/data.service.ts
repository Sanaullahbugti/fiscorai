import { processVatReport, type PlanCode } from "@fiscorai/tax-processor";
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
    await storageRepository.clearPeriod(email, input);
    const saved = await storageRepository.saveCsv(email, input, file.originalname, file.buffer);

    const csvText = file.buffer.toString("utf8");
    const artifacts = await processVatReport(csvText, {
      planCode,
      fileType: input.fileType,
      periodLabel: periodLabel(input),
    });

    await storageRepository.writeArtifacts(saved.dir, saved.filename, {
      json: artifacts.json,
      pdf: artifacts.pdf,
      xlsx: artifacts.xlsx,
    });

    return {
      filename: saved.filename,
      status: "ready",
      meta: artifacts.report.meta,
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

    const countries = mapCountries(raw.countries);
    const meta = (raw.meta as ProcessMeta | undefined) ?? null;
    return { countries, meta };
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
    const { countries, meta } = await this.getProcessedJson(email, input);
    const overview = await this.overview(email);
    const sub = await subscriptionRepository.findByUserId(userId);
    const now = new Date();
    const planActive = !!sub?.active && (!sub.expiresAt || sub.expiresAt > now);
    return buildInsights({
      period: input,
      countries,
      meta,
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

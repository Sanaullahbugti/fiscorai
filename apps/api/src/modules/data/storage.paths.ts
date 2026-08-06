import path from "node:path";
import { AppError } from "../../shared/errors.js";
import type { PeriodInput } from "./storage.types.js";

export function userFolder(email: string): string {
  return email.toLowerCase().replace("@", "-");
}

export function parseMonthlyFolder(name: string): PeriodInput | null {
  const m = name.match(/^(\d{1,2})-(\d{4})$/);
  if (!m) return null;
  return { fileType: "monthly", month: m[1], year: Number(m[2]) };
}

export function parseQuarterlyFolder(name: string): PeriodInput | null {
  const m = name.match(/^(Q[1-4])-(\d{4})$/i);
  if (!m) return null;
  return { fileType: "quarterly", quarter: m[1].toUpperCase(), year: Number(m[2]) };
}

export function periodSortKey(p: PeriodInput): number {
  const y = Number(p.year) || 0;
  if (p.fileType === "monthly") return y * 100 + (Number(p.month) || 0);
  const q = Number(String(p.quarter || "").replace(/\D/g, "")) || 0;
  return y * 100 + q * 3;
}

/** Relative path under the user folder, e.g. `monthly/3-2026`. */
export function periodFolder(input: PeriodInput): string {
  const year = Number(input.year);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new AppError("Invalid period year", 400);
  }
  if (input.fileType === "monthly") {
    const month = Number(input.month);
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      throw new AppError("Invalid period month", 400);
    }
    return path.posix.join("monthly", `${month}-${year}`);
  }
  if (input.fileType !== "quarterly") {
    throw new AppError("Invalid period type", 400);
  }
  const quarter = String(input.quarter || "").toUpperCase();
  if (!/^Q[1-4]$/.test(quarter)) {
    throw new AppError("Invalid period quarter", 400);
  }
  return path.posix.join("quarterly", `${quarter}-${year}`);
}

export function userPeriodPrefix(email: string, input: PeriodInput): string {
  return path.posix.join(userFolder(email), periodFolder(input));
}

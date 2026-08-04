import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "../../config/env.js";
import { AppError } from "../../shared/errors.js";

export type PeriodInput = {
  fileType: "monthly" | "quarterly";
  year: number | string;
  month?: string | number;
  quarter?: string;
};

function userFolder(email: string): string {
  return email.toLowerCase().replace("@", "-");
}

function parseMonthlyFolder(name: string): PeriodInput | null {
  const m = name.match(/^(\d{1,2})-(\d{4})$/);
  if (!m) return null;
  return { fileType: "monthly", month: m[1], year: Number(m[2]) };
}

function parseQuarterlyFolder(name: string): PeriodInput | null {
  const m = name.match(/^(Q[1-4])-(\d{4})$/i);
  if (!m) return null;
  return { fileType: "quarterly", quarter: m[1].toUpperCase(), year: Number(m[2]) };
}

function periodSortKey(p: PeriodInput): number {
  const y = Number(p.year) || 0;
  if (p.fileType === "monthly") return y * 100 + (Number(p.month) || 0);
  const q = Number(String(p.quarter || "").replace(/\D/g, "")) || 0;
  return y * 100 + q * 3;
}

/**
 * Every caller of periodPath ends up here, so this is the one place that has
 * to reject a hostile month/quarter/year — e.g. month:"../../other-user" —
 * before it reaches path.join and walks outside the caller's own folder.
 */
function periodFolder(input: PeriodInput): string {
  const year = Number(input.year);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new AppError("Invalid period year", 400);
  }
  if (input.fileType === "monthly") {
    const month = Number(input.month);
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      throw new AppError("Invalid period month", 400);
    }
    return path.join("monthly", `${month}-${year}`);
  }
  if (input.fileType !== "quarterly") {
    throw new AppError("Invalid period type", 400);
  }
  const quarter = String(input.quarter || "").toUpperCase();
  if (!/^Q[1-4]$/.test(quarter)) {
    throw new AppError("Invalid period quarter", 400);
  }
  return path.join("quarterly", `${quarter}-${year}`);
}

export class LocalFsStorageRepository {
  private root = path.resolve(process.cwd(), env.STORAGE_ROOT);

  userRoot(email: string) {
    return path.join(this.root, userFolder(email));
  }

  periodPath(email: string, input: PeriodInput) {
    return path.join(this.userRoot(email), periodFolder(input));
  }

  async ensureUser(email: string) {
    await mkdir(this.userRoot(email), { recursive: true });
  }

  async clearPeriod(email: string, input: PeriodInput) {
    const dir = this.periodPath(email, input);
    await rm(dir, { recursive: true, force: true });
    await mkdir(dir, { recursive: true });
  }

  async writePlan(email: string, code: string) {
    await this.ensureUser(email);
    await writeFile(path.join(this.userRoot(email), "subscription.txt"), code, "utf8");
  }

  async writeAmazonToken(email: string, token: string) {
    await this.ensureUser(email);
    await writeFile(path.join(this.userRoot(email), "amazon-token.txt"), token, "utf8");
  }

  async saveCsv(email: string, input: PeriodInput, filename: string, buffer: Buffer) {
    const safe = filename.replace(/\s+/g, "_");
    const dir = this.periodPath(email, input);
    await mkdir(dir, { recursive: true });
    const full = path.join(dir, safe);
    await writeFile(full, buffer);
    return { filename: safe, fullPath: full, dir };
  }

  async writeArtifacts(dir: string, baseName: string, artifacts: { json: object; pdf: Buffer; xlsx: Buffer }) {
    const stem = baseName.replace(/\.csv$/i, "");
    await writeFile(path.join(dir, `${stem}.csvprocesado.json`), JSON.stringify(artifacts.json, null, 2));
    await writeFile(path.join(dir, `${stem}.csvprocesado.pdf`), artifacts.pdf);
    await writeFile(path.join(dir, `${stem}.csvprocesado.xlsx`), artifacts.xlsx);
  }

  async listExcelKeys(email: string) {
    const root = this.userRoot(email);
    const result = { monthly: [] as string[], quarterly: [] as string[] };
    try {
      await this.walk(root, "", result);
    } catch {
      return result;
    }
    return result;
  }

  /** Period folders that have a processed `.json` artifact. */
  async listProcessedPeriods(email: string): Promise<PeriodInput[]> {
    const root = this.userRoot(email);
    const periods: PeriodInput[] = [];

    for (const fileType of ["monthly", "quarterly"] as const) {
      const base = path.join(root, fileType);
      let dirs: string[];
      try {
        dirs = (await readdir(base, { withFileTypes: true }))
          .filter((e) => e.isDirectory())
          .map((e) => e.name);
      } catch {
        continue;
      }

      for (const name of dirs) {
        const parsed =
          fileType === "monthly" ? parseMonthlyFolder(name) : parseQuarterlyFolder(name);
        if (!parsed) continue;
        try {
          const files = await readdir(path.join(base, name));
          if (files.some((f) => f.toLowerCase().endsWith(".json"))) {
            periods.push(parsed);
          }
        } catch {
          /* skip unreadable period */
        }
      }
    }

    return periods.sort((a, b) => periodSortKey(b) - periodSortKey(a));
  }

  /**
   * Which generated formats actually exist for a period. Used by the Analyst tool
   * so it can offer a download only when the file is really on disk, rather than
   * promising one the user would then fail to fetch.
   */
  async listPeriodFormats(email: string, input: PeriodInput): Promise<string[]> {
    try {
      const entries = await readdir(this.periodPath(email, input));
      return ["pdf", "xlsx"].filter((ext) =>
        entries.some((f) => f.toLowerCase().endsWith(`.${ext}`)),
      );
    } catch {
      return [];
    }
  }

  private async walk(abs: string, rel: string, out: { monthly: string[]; quarterly: string[] }) {
    let entries;
    try {
      entries = await readdir(abs, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const nextRel = rel ? `${rel}/${e.name}` : e.name;
      const nextAbs = path.join(abs, e.name);
      if (e.isDirectory()) {
        await this.walk(nextAbs, nextRel, out);
      } else if (/\.(xlsx|xls)$/i.test(e.name)) {
        if (nextRel.startsWith("monthly/")) out.monthly.push(nextRel.replace(/^monthly\//, ""));
        if (nextRel.startsWith("quarterly/")) out.quarterly.push(nextRel.replace(/^quarterly\//, ""));
      }
    }
  }

  async findInPeriod(email: string, input: PeriodInput, ext: string) {
    const dir = this.periodPath(email, input);
    try {
      const entries = await readdir(dir);
      const match = entries.find((f) => f.toLowerCase().endsWith(ext.toLowerCase()));
      if (!match) return null;
      const full = path.join(dir, match);
      const buf = await readFile(full);
      return { filename: match, buffer: buf, fullPath: full };
    } catch (err) {
      const e = err as NodeJS.ErrnoException;
      if (e?.code === "ENOENT") return null;
      throw err;
    }
  }

  async readJson(email: string, input: PeriodInput) {
    const file = await this.findInPeriod(email, input, ".json");
    if (!file) return null;
    return JSON.parse(file.buffer.toString("utf8"));
  }
}

export const storageRepository = new LocalFsStorageRepository();

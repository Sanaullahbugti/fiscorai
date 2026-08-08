import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "../../config/env.js";
import {
  parseMonthlyFolder,
  parseQuarterlyFolder,
  periodFolder,
  periodSortKey,
  userFolder,
} from "./storage.paths.js";
import type { PeriodInput, PeriodFile, SavedCsv, StorageRepository } from "./storage.types.js";

export class LocalFsStorageRepository implements StorageRepository {
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

  async saveCsv(
    email: string,
    input: PeriodInput,
    filename: string,
    buffer: Buffer,
  ): Promise<SavedCsv> {
    const safe = filename.replace(/\s+/g, "_");
    const dir = this.periodPath(email, input);
    await mkdir(dir, { recursive: true });
    const full = path.join(dir, safe);
    await writeFile(full, buffer);
    return { filename: safe, dir };
  }

  async writeArtifacts(
    dir: string,
    baseName: string,
    artifacts: {
      json: object;
      pdf: Buffer;
      xlsx: Buffer;
      canonical?: object;
      manifest?: object;
    },
  ) {
    const stem = baseName.replace(/\.csv$/i, "");
    const writes: Array<[string, string | Buffer]> = [
      [path.join(dir, `${stem}.csvprocesado.json`), JSON.stringify(artifacts.json, null, 2)],
      [path.join(dir, `${stem}.csvprocesado.pdf`), artifacts.pdf],
      [path.join(dir, `${stem}.csvprocesado.xlsx`), artifacts.xlsx],
    ];
    if (artifacts.canonical) {
      writes.push([
        path.join(dir, `${stem}.canonical.v2.json`),
        JSON.stringify(artifacts.canonical, null, 2),
      ]);
    }
    if (artifacts.manifest) {
      writes.push([path.join(dir, "manifest.json"), JSON.stringify(artifacts.manifest, null, 2)]);
    }
    for (const [target, body] of writes) {
      await writeFile(target, body);
    }
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

  async findInPeriod(email: string, input: PeriodInput, ext: string): Promise<PeriodFile | null> {
    const dir = this.periodPath(email, input);
    try {
      const entries = await readdir(dir);
      const matches = entries.filter((f) => f.toLowerCase().endsWith(ext.toLowerCase()));
      const match =
        matches.find((f) => f.toLowerCase().includes(".csvprocesado.")) ||
        matches.find((f) => f.toLowerCase() !== "manifest.json") ||
        matches[0];
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

  async readJson(email: string, input: PeriodInput): Promise<{ countries?: unknown[]; meta?: unknown } | null> {
    const file = await this.findInPeriod(email, input, ".json");
    if (!file) return null;
    return JSON.parse(file.buffer.toString("utf8"));
  }
}

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  batchCsvByActivityPeriod,
  parseAmazonCsv,
  validateRequestedPeriod,
} from "../parse.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const goldenCsv = readFileSync(join(__dirname, "fixtures/63260020335.csv"), "utf8");
const minimalCsv = readFileSync(join(__dirname, "fixtures/minimal.csv"), "utf8");

describe("parseAmazonCsv", () => {
  it("preserves 144 golden rows with required headers", () => {
    const parsed = parseAmazonCsv(goldenCsv);
    expect(parsed.valid).toBe(true);
    expect(parsed.rows).toHaveLength(144);
    expect(parsed.rows[0]?.sourceRow).toBe(1);
  });

  it("keeps blank currency as null, not EUR", () => {
    const parsed = parseAmazonCsv(goldenCsv);
    const blankCurrency = parsed.rows.filter((r) => !r.transactionCurrencyCode.value);
    expect(blankCurrency.length).toBeGreaterThan(0);
    for (const row of blankCurrency) {
      expect(row.transactionCurrencyCode.value).toBeNull();
    }
  });

  it("preserves exact source scheme values", () => {
    const parsed = parseAmazonCsv(goldenCsv);
    const schemes = new Set(parsed.rows.map((r) => r.taxReportingScheme.value));
    expect(schemes.has("CH_VOEC")).toBe(true);
    expect(schemes.has("UK_VOEC-IMPORT")).toBe(true);
    expect(schemes.has("UNION-OSS")).toBe(true);
  });

  it("rejects files missing required Amazon columns", () => {
    const parsed = parseAmazonCsv("TRANSACTION_TYPE\nSALE\n");
    expect(parsed.valid).toBe(false);
    expect(parsed.errors.length).toBeGreaterThan(0);
  });

  it("validates minimal fixture period against requested month", () => {
    const parsed = parseAmazonCsv(minimalCsv);
    const unique = [
      ...new Set(
        parsed.rows
          .map((r) => r.activityPeriod.value)
          .filter((p): p is string => typeof p === "string" && p.length > 0),
      ),
    ];
    const issues = validateRequestedPeriod("monthly", unique, 2026, 1);
    expect(issues.some((i) => i.code === "PERIOD_MISMATCH")).toBe(false);
  });

  it("flags period mismatch for golden file uploaded as 2026-JAN", () => {
    const parsed = parseAmazonCsv(goldenCsv);
    const periods = [
      ...new Set(
        parsed.rows
          .map((r) => r.activityPeriod.value)
          .filter((p): p is string => typeof p === "string" && p.length > 0),
      ),
    ];
    const issues = validateRequestedPeriod("monthly", periods, 2026, 1);
    expect(issues.some((i) => i.code === "PERIOD_MISMATCH" && i.severity === "BLOCKER")).toBe(true);
  });
});

describe("batchCsvByActivityPeriod", () => {
  const fallback = {
    fileType: "monthly" as const,
    year: 2026,
    month: "1",
    quarter: "Q1",
  };

  it("detects a single monthly report", () => {
    const batches = batchCsvByActivityPeriod(
      "ACTIVITY_PERIOD,VALUE\n2026-JUL,one\n2026-JUL,two\n",
      fallback,
    );
    expect(batches).toHaveLength(1);
    expect(batches[0]?.target).toMatchObject({
      fileType: "monthly",
      year: 2026,
      month: "7",
      quarter: "Q3",
    });
  });

  it("keeps an exact calendar quarter as one report", () => {
    const batches = batchCsvByActivityPeriod(
      "ACTIVITY_PERIOD,VALUE\n2026-JUL,one\n2026-AUG,two\n2026-SEP,three\n",
      fallback,
    );
    expect(batches).toHaveLength(1);
    expect(batches[0]?.target).toMatchObject({
      fileType: "quarterly",
      year: 2026,
      quarter: "Q3",
    });
    expect(batches[0]?.sourcePeriods).toEqual(["2026-JUL", "2026-AUG", "2026-SEP"]);
  });

  it("splits irregular multi-period files into monthly CSVs", () => {
    const batches = batchCsvByActivityPeriod(
      "ACTIVITY_PERIOD,VALUE\n2026-JUL,\"one, quoted\"\n2026-SEP,two\n2026-JUL,three\n",
      fallback,
    );
    expect(batches).toHaveLength(2);
    expect(batches.map((batch) => batch.target.month)).toEqual(["7", "9"]);
    expect(batches[0]?.csvText).toContain("\"one, quoted\"");
    expect(batches[0]?.csvText).toContain("2026-JUL,three");
    expect(batches[0]?.csvText).not.toContain("2026-SEP");
    expect(batches[1]?.csvText).toContain("2026-SEP,two");
  });
});

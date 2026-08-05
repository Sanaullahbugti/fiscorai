import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { processCsv, toApiCountries } from "../aggregate.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const minimalCsv = readFileSync(join(__dirname, "fixtures/minimal.csv"), "utf8");
const sampleCsv = readFileSync(join(__dirname, "fixtures/sample.csv"), "utf8");

const baseOpts = {
  planCode: "3" as const,
  fileType: "monthly" as const,
  periodLabel: "2026-JAN",
};

describe("processCsv", () => {
  it("aggregates by country and scheme", () => {
    const report = processCsv(minimalCsv, baseOpts);
    const countries = report.countries.map((c) => c.country).sort();
    expect(countries).toEqual(["France", "Germany", "Italy", "Switzerland"]);

    const de = report.countries.find((c) => c.country === "Germany")!;
    const oss = de.transactionCategories.find((c) => c.category === "UNION-OSS")!;
    const sale = oss.TRANSACTION!.find((t) => t.transaction_type === "SALE")!;
    const refund = oss.TRANSACTION!.find((t) => t.transaction_type === "REFUND")!;
    expect(sale.total).toBe(119);
    expect(refund.total).toBe(-11.9);
    expect(oss.ALL![0].vat).toBeCloseTo(17.1);

    const ch = report.countries.find((c) => c.country === "Switzerland")!;
    expect(ch.transactionCategories.some((c) => c.category === "VOEC")).toBe(true);

    const it = report.countries.find((c) => c.country === "Italy")!;
    expect(it.transactionCategories.some((c) => c.category === "REGULAR")).toBe(true);
  });

  it("maps jurisdiction codes to display names from real-shaped CSV", () => {
    const report = processCsv(sampleCsv, baseOpts);
    expect(report.meta.totalRows).toBe(5);
    expect(report.meta.processedRows).toBe(5);
    expect(report.meta.truncated).toBe(false);
    expect(report.countries.length).toBeGreaterThan(0);
    expect(report.countries.some((c) => c.country === "Germany")).toBe(true);
  });

  it("truncates rows for free plan monthly limit", () => {
    const many = [minimalCsv.split("\n")[0]];
    const row = minimalCsv.split("\n")[1];
    for (let i = 0; i < 105; i++) many.push(row);
    const report = processCsv(many.join("\n"), {
      planCode: "0",
      fileType: "monthly",
      periodLabel: "2026-JAN",
    });
    expect(report.meta.totalRows).toBe(105);
    expect(report.meta.processedRows).toBe(50);
    expect(report.meta.truncated).toBe(true);
    expect(report.meta.planLimit).toBe(50);
  });

  it("does not truncate unlimited plan", () => {
    const many = [minimalCsv.split("\n")[0]];
    const row = minimalCsv.split("\n")[1];
    for (let i = 0; i < 150; i++) many.push(row);
    const report = processCsv(many.join("\n"), baseOpts);
    expect(report.meta.truncated).toBe(false);
    expect(report.meta.planLimit).toBeNull();
    expect(report.meta.processedRows).toBe(150);
  });
});

describe("toApiCountries", () => {
  it("nests transactions under ALL/VAT/TRANSACTION", () => {
    const report = processCsv(minimalCsv, baseOpts);
    const api = toApiCountries(report);
    expect(api[0].transactionCategories[0].transactions.ALL).toBeDefined();
    expect(api[0].transactionCategories[0].transactions.TRANSACTION).toBeDefined();
  });
});

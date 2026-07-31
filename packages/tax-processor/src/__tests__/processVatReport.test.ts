import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { processVatReport } from "../index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const minimalCsv = readFileSync(join(__dirname, "fixtures/minimal.csv"), "utf8");

describe("processVatReport", () => {
  it("returns pdf, xlsx, json, and apiCountries", async () => {
    const artifacts = await processVatReport(minimalCsv, {
      planCode: "3",
      fileType: "monthly",
      periodLabel: "2026-JAN",
    });

    expect(artifacts.report.countries.length).toBeGreaterThan(0);
    expect(artifacts.apiCountries.length).toBe(artifacts.report.countries.length);
    expect(artifacts.json).toHaveProperty("countries");
    expect(Buffer.isBuffer(artifacts.pdf)).toBe(true);
    expect(artifacts.pdf.byteLength).toBeGreaterThan(100);
    expect(Buffer.isBuffer(artifacts.xlsx)).toBe(true);
    expect(artifacts.xlsx.byteLength).toBeGreaterThan(100);
    expect(artifacts.pdf.subarray(0, 4).toString("utf8")).toBe("%PDF");
  });
});

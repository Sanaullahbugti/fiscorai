import { describe, expect, it } from "vitest";
import {
  detectPeriodFromCsvText,
  formatSourcePeriodValue,
  periodsToTarget,
  sourcePeriodsToTarget,
} from "./detect-csv-period";

const MONTHLY = "ACTIVITY_PERIOD,TRANSACTION_TYPE\n2025-APR,SALE\n2025-APR,REFUND\n";
const QUARTERLY = [
  "ACTIVITY_PERIOD,TRANSACTION_TYPE",
  "2025-JAN,SALE",
  "2025-FEB,SALE",
  "2025-MAR,REFUND",
].join("\n");
const MIXED = [
  "ACTIVITY_PERIOD,TRANSACTION_TYPE",
  "2025-JAN,SALE",
  "2025-APR,SALE",
].join("\n");
const QUOTED = `"UNIQUE_ACCOUNT_IDENTIFIER","ACTIVITY_PERIOD","SALES_CHANNEL"\n"abc","2024-NOV","Amazon.de"\n`;

describe("detectPeriodFromCsvText", () => {
  it("maps a single ACTIVITY_PERIOD to a monthly target", () => {
    const result = detectPeriodFromCsvText(MONTHLY);
    expect(result).toEqual({
      ok: true,
      sourcePeriods: ["2025-APR"],
      target: { fileType: "monthly", year: 2025, month: "4", quarter: "Q2" },
    });
  });

  it("maps three months in the same quarter to a quarterly target", () => {
    const result = detectPeriodFromCsvText(QUARTERLY);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.target).toEqual({
      fileType: "quarterly",
      year: 2025,
      month: "1",
      quarter: "Q1",
    });
  });

  it("reads quoted Amazon VAT headers", () => {
    const result = detectPeriodFromCsvText(QUOTED);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.target.month).toBe("11");
    expect(result.target.year).toBe(2024);
  });

  it("rejects mixed periods that are not a quarter", () => {
    expect(detectPeriodFromCsvText(MIXED)).toEqual({
      ok: false,
      code: "MULTIPLE_SOURCE_PERIODS",
      sourcePeriods: ["2025-APR", "2025-JAN"],
    });
  });

  it("returns MISSING when the file has no activity period", () => {
    expect(detectPeriodFromCsvText("a,b\n1,2\n")).toEqual({
      ok: false,
      code: "MISSING_ACTIVITY_PERIOD",
      sourcePeriods: [],
    });
  });
});

describe("sourcePeriodsToTarget", () => {
  it("parses a single API sourceValue", () => {
    expect(sourcePeriodsToTarget("2025-MAR")).toEqual({
      fileType: "monthly",
      year: 2025,
      month: "3",
      quarter: "Q1",
    });
  });

  it("parses a comma-separated quarter", () => {
    expect(sourcePeriodsToTarget("2026-JAN, 2026-FEB, 2026-MAR")?.quarter).toBe("Q1");
  });
});

describe("formatSourcePeriodValue", () => {
  it("formats a month label", () => {
    expect(formatSourcePeriodValue("2025-APR")).toBe("April 2025");
  });

  it("formats a quarter label", () => {
    expect(formatSourcePeriodValue("2025-JAN,2025-FEB,2025-MAR")).toBe("Q1 2025");
  });
});

describe("periodsToTarget", () => {
  it("treats a lone month as monthly even when it sits in a quarter", () => {
    const result = periodsToTarget(["2025-JUL"]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.target.fileType).toBe("monthly");
    expect(result.target.month).toBe("7");
  });
});

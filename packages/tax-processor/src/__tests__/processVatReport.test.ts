import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { processVatReport } from "../index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const minimalCsv = readFileSync(join(__dirname, "fixtures/minimal.csv"), "utf8");
const goldenCsv = readFileSync(join(__dirname, "fixtures/63260020335.csv"), "utf8");

function pdfText(buf: Buffer): string {
  return buf.toString("latin1");
}

describe("processVatReport", () => {
  it("returns pdf, xlsx, json, and apiCountries for minimal fixture", async () => {
    const artifacts = await processVatReport(minimalCsv, {
      planCode: "3",
      fileType: "monthly",
      periodLabel: "2026-JAN",
      sourceFileName: "minimal.csv",
    });

    expect(artifacts.report.countries.length).toBeGreaterThan(0);
    expect(artifacts.apiCountries.length).toBe(artifacts.report.countries.length);
    expect(artifacts.json).toHaveProperty("countries");
    expect(Buffer.isBuffer(artifacts.pdf)).toBe(true);
    expect(artifacts.pdf.byteLength).toBeGreaterThan(100);
    expect(Buffer.isBuffer(artifacts.xlsx)).toBe(true);
    expect(artifacts.xlsx.byteLength).toBeGreaterThan(100);
    expect(artifacts.pdf.subarray(0, 4).toString("utf8")).toBe("%PDF");
    expect(artifacts.reconciliationStatus).not.toBe("INVALID");
  });

  it("golden PDF metadata and canonical output exclude cross-currency collapse", async () => {
    const artifacts = await processVatReport(goldenCsv, {
      planCode: "3",
      fileType: "monthly",
      periodLabel: "2025-MAR",
      sourceFileName: "63260020335.csv",
    });

    const text = pdfText(artifacts.pdf);
    expect(text).toContain("2025-MAR");
    expect(text).not.toContain("124.37");
    expect(text).not.toContain("1718.26");

    expect(artifacts.canonical?.view.provenance.sourceActivityPeriod).toBe("2025-MAR");
    expect(artifacts.canonical?.view.schemeSummaries.some((s) => s.sourceTaxReportingScheme === "CH_VOEC")).toBe(true);
    expect(artifacts.canonical?.view.schemeSummaries.some((s) => s.sourceTaxReportingScheme === "UK_VOEC-IMPORT")).toBe(true);
    expect(artifacts.canonical?.view.schemeSummaries.find((s) => s.activityIncl === "124.37")).toBeUndefined();
  });

  it("golden XLSX has canonical sheets and provenance", async () => {
    const artifacts = await processVatReport(goldenCsv, {
      planCode: "3",
      fileType: "monthly",
      periodLabel: "2025-MAR",
      sourceFileName: "63260020335.csv",
    });

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(artifacts.xlsx as unknown as ExcelJS.Buffer);
    expect(wb.getWorksheet("SUMMARY")).toBeTruthy();
    expect(wb.getWorksheet("TRANSACTIONS")).toBeTruthy();
    expect(wb.getWorksheet("VAT_BREAKDOWN")).toBeTruthy();
    expect(wb.getWorksheet("REFUNDS")).toBeTruthy();
    expect(wb.getWorksheet("MOVEMENTS")).toBeTruthy();
    expect(wb.getWorksheet("DATA_QUALITY")).toBeTruthy();

    const summary = wb.getWorksheet("SUMMARY")!;
    const values = new Set<string>();
    summary.eachRow((row) => {
      const a = String(row.getCell(1).value || "");
      const b = String(row.getCell(2).value || "");
      if (a) values.add(a);
      if (b) values.add(b);
    });
    expect(values.has("Source file")).toBe(true);
    expect([...values].some((v) => v.includes("63260020335.csv"))).toBe(true);
    expect([...values].some((v) => v.includes("2025-MAR") || v.includes("March 2025"))).toBe(true);

    const tx = wb.getWorksheet("TRANSACTIONS")!;
    expect(tx.rowCount).toBe(145); // header + 144

    // No bogus sentinel: the only numeric 109 must be Source Row for actual row 109.
    const hits: Array<{ sheet: string; addr: string; value: unknown }> = [];
    for (const ws of wb.worksheets) {
      ws.eachRow((row, rn) => {
        row.eachCell({ includeEmpty: false }, (cell) => {
          if (cell.value === 109 || cell.value === "109") {
            hits.push({ sheet: ws.name, addr: cell.address, value: cell.value });
          }
        });
      });
    }
    expect(hits).toEqual([{ sheet: "TRANSACTIONS", addr: "A110", value: 109 }]);

    // Empty strings must not be written (they become sharedStrings indexes like 109).
    let emptyStringCells = 0;
    tx.eachRow((row, rn) => {
      if (rn === 1) return;
      row.eachCell({ includeEmpty: false }, (cell) => {
        if (cell.value === "") emptyStringCells++;
      });
    });
    expect(emptyStringCells).toBe(0);

    const france = wb.getWorksheet("VAT_BREAKDOWN")!;
    let franceRate: number | null = null;
    france.eachRow((row, rn) => {
      if (rn === 1) return;
      if (String(row.getCell(2).value) === "France" && typeof row.getCell(3).value === "number") {
        franceRate = row.getCell(3).value as number;
      }
    });
    expect(franceRate).toBe(0.2);

    const refunds = wb.getWorksheet("REFUNDS")!;
    // SALE_CONTEXT without match → blank matched source row
    let saleContextBlank = false;
    refunds.eachRow((row, rn) => {
      if (rn < 6) return;
      if (row.getCell(6).value === "SALE_CONTEXT") {
        expect(row.getCell(7).value == null || row.getCell(7).value === "").toBe(true);
        saleContextBlank = true;
      }
    });
    expect(saleContextBlank).toBe(true);

    expect(artifacts.canonical?.view.provenance.sourceFileName).toBe("63260020335.csv");
  });

  it("permissive uploads complete despite period, currency, and duplicate findings", async () => {
    const artifacts = await processVatReport(goldenCsv, {
      planCode: "3",
      fileType: "monthly",
      periodLabel: "2026-JUL",
      permissive: true,
      sourceFileName: "customer.csv",
    });

    expect(artifacts.reconciliationStatus).toBe("READY");
    expect(artifacts.issues).toEqual([]);
    expect(artifacts.report.countries.length).toBeGreaterThan(0);
    expect(artifacts.pdf.byteLength).toBeGreaterThan(100);
    expect(artifacts.xlsx.byteLength).toBeGreaterThan(100);
  });

  function repeatCsv(source: string, count: number): string {
    const lines = source.split(/\r?\n/).filter((line) => line.length > 0);
    const header = lines[0]!;
    const row = lines[1]!;
    return [header, ...Array.from({ length: count }, () => row)].join("\n");
  }

  it("truncates Free plan uploads to 50 rows and still returns artifacts", async () => {
    const csv = repeatCsv(minimalCsv, 80);
    const artifacts = await processVatReport(csv, {
      planCode: "0",
      fileType: "monthly",
      periodLabel: "2026-JAN",
      permissive: true,
      sourceFileName: "free-over-limit.csv",
    });

    expect(artifacts.reconciliationStatus).toBe("READY");
    expect(artifacts.report.meta.totalRows).toBe(80);
    expect(artifacts.report.meta.processedRows).toBe(50);
    expect(artifacts.report.meta.truncated).toBe(true);
    expect(artifacts.report.meta.planLimit).toBe(50);
    expect(artifacts.canonical?.view.provenance.truncated).toBe(true);
    expect(artifacts.canonical?.view.provenance.planLimit).toBe(50);
    expect(artifacts.canonical?.view.provenance.sourceTotalRows).toBe(80);
    expect(artifacts.canonical?.rows).toHaveLength(50);
    expect(artifacts.pdf.byteLength).toBeGreaterThan(100);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(artifacts.xlsx as unknown as ExcelJS.Buffer);
    const summary = wb.getWorksheet("SUMMARY")!;
    const values: string[] = [];
    summary.eachRow((row) => {
      row.eachCell((cell) => {
        if (typeof cell.value === "string") values.push(cell.value);
      });
    });
    expect(values.some((value) => value.includes("50 / 80"))).toBe(true);
  });

  it("does not truncate Pro plan uploads", async () => {
    const csv = repeatCsv(minimalCsv, 80);
    const artifacts = await processVatReport(csv, {
      planCode: "3",
      fileType: "monthly",
      periodLabel: "2026-JAN",
      permissive: true,
      sourceFileName: "pro-unlimited.csv",
    });

    expect(artifacts.report.meta.totalRows).toBe(80);
    expect(artifacts.report.meta.processedRows).toBe(80);
    expect(artifacts.report.meta.truncated).toBe(false);
    expect(artifacts.report.meta.planLimit).toBeNull();
    expect(artifacts.canonical?.rows).toHaveLength(80);
    expect(artifacts.pdf.byteLength).toBeGreaterThan(100);
  });

  it("applies the Basic monthly cap of 1,500 rows", async () => {
    const csv = repeatCsv(minimalCsv, 1501);
    const artifacts = await processVatReport(csv, {
      planCode: "1",
      fileType: "monthly",
      periodLabel: "2026-JAN",
      permissive: true,
      sourceFileName: "basic-over-limit.csv",
    });

    expect(artifacts.report.meta.totalRows).toBe(1501);
    expect(artifacts.report.meta.processedRows).toBe(1500);
    expect(artifacts.report.meta.truncated).toBe(true);
    expect(artifacts.report.meta.planLimit).toBe(1500);
  });
});

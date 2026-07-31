import ExcelJS from "exceljs";
import type { ProcessedReport } from "./types.js";

export async function buildXlsx(report: ProcessedReport): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const summary = wb.addWorksheet("SUMMARY");
  summary.addRow([`Date: From ${report.meta.periodLabel} to ${report.meta.periodLabel}`]);
  summary.addRow([`Number of transactions: ${report.meta.totalRows}`]);
  if (report.meta.truncated && report.meta.planLimit != null) {
    summary.addRow([]);
    summary.addRow([
      `ATTENTION: Number of transactions exceeds the limit of the contracted plan. This report is limited to ${report.meta.planLimit} transactions.`,
    ]);
  }
  summary.addRow([]);
  summary.addRow(["COUNTRY", "CATEGORY", "TOTAL", "BASE", "VAT", "CURRENCY"]);

  for (const c of report.countries) {
    for (const cat of c.transactionCategories) {
      const all = cat.ALL?.[0];
      if (!all) continue;
      summary.addRow([c.country, cat.category, all.total, all.base, all.vat, all.currency]);
    }
  }

  const vatSheet = wb.addWorksheet("DETAIL_VAT");
  vatSheet.addRow(["COUNTRY", "CATEGORY", "VAT %", "TOTAL", "BASE", "VAT", "CURRENCY"]);
  for (const c of report.countries) {
    for (const cat of c.transactionCategories) {
      for (const row of cat.VAT || []) {
        vatSheet.addRow([
          c.country,
          cat.category,
          row.vat_percentage,
          row.total,
          row.base,
          row.vat,
          row.currency,
        ]);
      }
    }
  }

  const txSheet = wb.addWorksheet("DETAIL_TRANSACTION");
  txSheet.addRow(["COUNTRY", "CATEGORY", "TYPE", "TOTAL", "BASE", "VAT", "CURRENCY"]);
  for (const c of report.countries) {
    for (const cat of c.transactionCategories) {
      for (const row of cat.TRANSACTION || []) {
        txSheet.addRow([
          c.country,
          cat.category,
          row.transaction_type,
          row.total,
          row.base,
          row.vat,
          row.currency,
        ]);
      }
    }
  }

  for (const c of report.countries) {
    for (const cat of c.transactionCategories) {
      const name = sanitizeSheet(`${cat.category}-${c.country}`).slice(0, 28);
      if (wb.getWorksheet(name)) continue;
      const ws = wb.addWorksheet(name);
      ws.addRow(["TYPE", "TOTAL", "BASE", "VAT", "CURRENCY"]);
      for (const row of cat.TRANSACTION || []) {
        ws.addRow([row.transaction_type, row.total, row.base, row.vat, row.currency]);
      }
    }
  }

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

function sanitizeSheet(s: string): string {
  return s.replace(/[\\/*?[\]:]/g, "-").toUpperCase();
}

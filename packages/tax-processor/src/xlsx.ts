import ExcelJS from "exceljs";
import { JURISDICTION_NAMES, type ProcessedReport } from "./types.js";
import { DEFAULT_THEME, SCHEME_TITLES, rateLabel } from "./pdf.js";

/* ------------------------------------------------------------------ *
 * Theme — reuses the PDF's palette (DEFAULT_THEME, SCHEME_TITLES) so a
 * seller who downloads both formats for the same report sees one
 * consistent product, not two differently designed documents. The one
 * deliberate departure is ACCENT, FiscorAI's actual brand gold, used
 * only on the single most important figure in the workbook (grand
 * total VAT due) so it reads as *the* number to look at.
 * ------------------------------------------------------------------ */

const T = DEFAULT_THEME;
const FONT = "Calibri";
const MONEY_FMT = "#,##0.00";
const ACCENT = "#E0B45A";
const WHITE = "#FFFFFF";

function argb(hex: string): string {
  return `FF${hex.replace("#", "").toUpperCase()}`;
}

function fill(hex: string): ExcelJS.Fill {
  return { type: "pattern", pattern: "solid", fgColor: { argb: argb(hex) } };
}

function schemeTitle(category: string): string {
  return SCHEME_TITLES[category] || category;
}

function schemeColor(category: string): string {
  return T.scheme[category] || T.ink;
}

function countryLabel(code: string): string {
  const name = JURISDICTION_NAMES[code.toUpperCase()];
  return name ? `${name} (${code})` : code;
}

function intFmt(n: number): string {
  return n.toLocaleString("en-GB");
}

function moneyStr(n: number): string {
  return n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type Money = { total: number; base: number; vat: number };

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Accumulates per-currency totals, mirroring the PDF's own grand-total math. */
function bumpMoney(map: Map<string, Money>, currency: string, v: Money) {
  const cur = map.get(currency) || { total: 0, base: 0, vat: 0 };
  cur.total = round2(cur.total + v.total);
  cur.base = round2(cur.base + v.base);
  cur.vat = round2(cur.vat + v.vat);
  map.set(currency, cur);
}

function sanitizeSheet(s: string): string {
  return s.replace(/[\\/*?[\]:]/g, "-").toUpperCase();
}

/* ------------------------------------------------------------------ *
 * Reusable table writer — every sheet (SUMMARY's grid, DETAIL_VAT,
 * DETAIL_TRANSACTION, and each per-country/category sheet) goes through
 * this, so header banding, zebra rows, the VAT-column highlight, money
 * formatting, and frozen/filterable headers are identical everywhere
 * instead of hand-rolled per sheet.
 * ------------------------------------------------------------------ */

type ColSpec = {
  header: string;
  width: number;
  align?: "left" | "right";
  /** Right-aligned, 2-decimal thousands format, red when negative. */
  money?: boolean;
};

type TableOptions = {
  startRow: number;
  columns: ColSpec[];
  rows: (string | number)[][];
  /** 0-based column index to tint + bold as the report's headline figure. */
  vatColumnIndex?: number;
  /** 0-based column index to color per reporting scheme. */
  categoryColumnIndex?: number;
  categoryValues?: string[];
};

/** Header horizontal align must match the data column (money/right → right). */
function colAlign(col: ColSpec): "left" | "right" {
  if (col.money || col.align === "right") return "right";
  return "left";
}

function styleHeaderRow(row: ExcelJS.Row, columns: ColSpec[]) {
  row.height = 22;
  columns.forEach((col, i) => {
    const cell = row.getCell(i + 1);
    cell.font = { name: FONT, bold: true, size: 10, color: { argb: argb(WHITE) } };
    cell.fill = fill(T.ink);
    cell.alignment = {
      vertical: "middle",
      horizontal: colAlign(col),
      wrapText: false,
    };
    cell.border = {
      bottom: { style: "thin", color: { argb: argb(T.ink) } },
    };
  });
}

function writeTable(ws: ExcelJS.Worksheet, opts: TableOptions): number {
  const { startRow, columns, rows } = opts;

  columns.forEach((c, i) => {
    const col = ws.getColumn(i + 1);
    col.width = c.width;
    // Default column alignment so empty filter cells still match the header.
    col.alignment = { horizontal: colAlign(c), vertical: "middle" };
  });

  const headerRow = ws.getRow(startRow);
  columns.forEach((c, i) => {
    headerRow.getCell(i + 1).value = c.header.toUpperCase();
  });
  styleHeaderRow(headerRow, columns);

  rows.forEach((r, rIdx) => {
    const excelRow = ws.getRow(startRow + 1 + rIdx);
    excelRow.height = 18;
    const zebra = rIdx % 2 === 1;

    // Paint every column in the table width so short rows don't look shifted.
    columns.forEach((col, cIdx) => {
      const cell = excelRow.getCell(cIdx + 1);
      const val = r[cIdx];
      if (val !== undefined && val !== null && val !== "") cell.value = val;

      const negative = !!col.money && typeof val === "number" && val < 0;
      cell.font = { name: FONT, size: 10, color: negative ? { argb: argb(T.alert) } : undefined };
      cell.alignment = {
        horizontal: colAlign(col),
        vertical: "middle",
        wrapText: false,
      };
      if (col.money && typeof val === "number") cell.numFmt = MONEY_FMT;
      if (zebra) cell.fill = fill(T.wash);
      cell.border = { bottom: { style: "hair", color: { argb: argb(T.ruleSoft) } } };
    });

    if (opts.vatColumnIndex != null) {
      const vc = excelRow.getCell(opts.vatColumnIndex + 1);
      vc.fill = fill(T.tint);
      vc.font = { name: FONT, size: 10, bold: true, color: vc.font?.color };
    }
    if (opts.categoryColumnIndex != null && opts.categoryValues) {
      const cc = excelRow.getCell(opts.categoryColumnIndex + 1);
      cc.font = {
        name: FONT,
        size: 10,
        bold: true,
        color: { argb: argb(schemeColor(opts.categoryValues[rIdx])) },
      };
    }
  });

  const lastRow = startRow + rows.length;
  ws.autoFilter = rows.length
    ? { from: { row: startRow, column: 1 }, to: { row: lastRow, column: columns.length } }
    : undefined;
  ws.views = [{ state: "frozen", ySplit: startRow, xSplit: 0, showGridLines: false }];

  return lastRow;
}

/** Title + period line shared by every sheet, merged across its full width. */
function titleBlock(ws: ExcelJS.Worksheet, title: string, report: ProcessedReport, span: number, color = T.ink) {
  ws.mergeCells(1, 1, 1, span);
  const t = ws.getCell(1, 1);
  t.value = title;
  t.font = { name: FONT, size: 14, bold: true, color: { argb: argb(color) } };
  ws.getRow(1).height = 22;

  ws.mergeCells(2, 1, 2, span);
  const s = ws.getCell(2, 1);
  s.value = `${report.meta.periodLabel}  ·  ${intFmt(report.meta.processedRows)} of ${intFmt(report.meta.totalRows)} transactions processed`;
  s.font = { name: FONT, size: 9.5, italic: true, color: { argb: argb(T.muted) } };
}

/* ------------------------------------------------------------------ *
 * SUMMARY — masthead, KPI strip, the country×category grid, and a
 * highlighted grand-total row per currency at the bottom.
 * ------------------------------------------------------------------ */

function buildSummarySheet(wb: ExcelJS.Workbook, report: ProcessedReport) {
  const ws = wb.addWorksheet("SUMMARY", { properties: { tabColor: { argb: argb(T.ink) } } });

  ws.mergeCells("A1:F1");
  const title = ws.getCell("A1");
  title.value = "FiscorAI — VAT Transaction Report";
  title.font = { name: FONT, size: 18, bold: true, color: { argb: argb(T.ink) } };
  ws.getRow(1).height = 28;

  ws.mergeCells("A2:F2");
  const subtitle = ws.getCell("A2");
  subtitle.value = `${report.meta.periodLabel}  ·  Generated ${new Date().toISOString().slice(0, 10)}`;
  subtitle.font = { name: FONT, size: 10.5, italic: true, color: { argb: argb(T.muted) } };

  let row = 4;

  if (report.meta.truncated && report.meta.planLimit != null) {
    ws.mergeCells(`A${row}:F${row}`);
    const cell = ws.getCell(`A${row}`);
    cell.value = `⚠ Plan limit reached — ${intFmt(report.meta.planLimit)} / ${intFmt(report.meta.totalRows)} transactions. Upgrade your plan to process the full period.`;
    cell.font = { name: FONT, size: 10, bold: true, color: { argb: argb(T.alert) } };
    cell.fill = fill(T.alertWash);
    cell.alignment = { vertical: "middle", wrapText: true };
    ws.getRow(row).height = 24;
    row += 2;
  }

  // Aggregate once, feeding both the KPI strip and the grid below it.
  const grand = new Map<string, Money>();
  const countries = new Set<string>();
  const categories = new Set<string>();
  const gridRows: (string | number)[][] = [];
  const gridCategories: string[] = [];

  for (const c of report.countries) {
    for (const cat of c.transactionCategories) {
      const all = cat.ALL?.[0];
      if (!all) continue;
      countries.add(c.country);
      categories.add(cat.category);
      bumpMoney(grand, all.currency || "EUR", all);
      gridRows.push([countryLabel(c.country), schemeTitle(cat.category), all.total, all.base, all.vat, all.currency]);
      gridCategories.push(cat.category);
    }
  }

  const primary = [...grand.entries()].sort((a, b) => b[1].total - a[1].total)[0];
  const kpis: Array<[string, string]> = [
    ["Transactions", intFmt(report.meta.totalRows)],
    ["Countries", String(countries.size)],
    ["Categories", String(categories.size)],
    [primary ? `VAT due (${primary[0]})` : "VAT due", primary ? moneyStr(primary[1].vat) : "0.00"],
  ];

  const labelRow = ws.getRow(row);
  const valueRow = ws.getRow(row + 1);
  kpis.forEach(([label, value], i) => {
    const labelCell = labelRow.getCell(i + 1);
    labelCell.value = label.toUpperCase();
    labelCell.font = { name: FONT, size: 8, bold: true, color: { argb: argb(T.muted) } };
    labelCell.alignment = { horizontal: "left", vertical: "middle" };
    const valueCell = valueRow.getCell(i + 1);
    valueCell.value = value;
    valueCell.font = { name: FONT, size: 16, bold: true, color: { argb: argb(T.ink) } };
    valueCell.alignment = { horizontal: "left", vertical: "middle" };
  });
  // Only paint the KPI columns that exist (not empty cols 5–6).
  for (let col = 1; col <= kpis.length; col++) {
    labelRow.getCell(col).fill = fill(T.wash);
    valueRow.getCell(col).fill = fill(T.wash);
  }
  labelRow.height = 14;
  valueRow.height = 24;
  row += 3;

  const columns: ColSpec[] = [
    { header: "Country", width: 26 },
    { header: "Category", width: 16 },
    { header: "Total", width: 14, money: true },
    { header: "Base", width: 14, money: true },
    { header: "VAT", width: 14, money: true },
    { header: "Currency", width: 10, align: "right" },
  ];
  const dataEndRow = writeTable(ws, {
    startRow: row,
    columns,
    rows: gridRows,
    vatColumnIndex: 4,
    categoryColumnIndex: 1,
    categoryValues: gridCategories,
  });

  // Grand total — the one figure this whole workbook exists to answer,
  // pulled out of the grid and put on its own dark, gold-accented banner.
  let totalRow = dataEndRow + 2;
  const sortedGrand = [...grand.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  for (const [currency, v] of sortedGrand) {
    const r = ws.getRow(totalRow);
    r.height = 24;
    // Same 6-column grid as the table above — keep Category blank so
    // Total / Base / VAT / Currency stay under their headers.
    const cells: Array<{ col: number; value: string | number; align: "left" | "right"; money?: boolean }> = [
      { col: 1, value: sortedGrand.length > 1 ? `GRAND TOTAL — ${currency}` : "GRAND TOTAL", align: "left" },
      { col: 2, value: "", align: "left" },
      { col: 3, value: v.total, align: "right", money: true },
      { col: 4, value: v.base, align: "right", money: true },
      { col: 5, value: v.vat, align: "right", money: true },
      { col: 6, value: currency, align: "right" },
    ];
    for (const spec of cells) {
      const cell = r.getCell(spec.col);
      cell.value = spec.value === "" ? null : spec.value;
      cell.fill = fill(T.ink);
      cell.font = { name: FONT, size: 11, bold: true, color: { argb: argb(WHITE) } };
      cell.alignment = { horizontal: spec.align, vertical: "middle" };
      if (spec.money) cell.numFmt = MONEY_FMT;
    }
    r.getCell(5).font = { name: FONT, size: 13, bold: true, color: { argb: argb(ACCENT) } };
    totalRow++;
  }

  ws.mergeCells(`A${totalRow + 1}:F${totalRow + 1}`);
  const note = ws.getCell(`A${totalRow + 1}`);
  note.value = "Totals stay separate per currency. Convert with your filing rate before submitting a return.";
  note.font = { name: FONT, size: 8.5, italic: true, color: { argb: argb(T.muted) } };
}

/* ------------------------------------------------------------------ *
 * DETAIL_VAT — every row broken out by VAT rate.
 * ------------------------------------------------------------------ */

function buildVatDetailSheet(wb: ExcelJS.Workbook, report: ProcessedReport) {
  const ws = wb.addWorksheet("DETAIL_VAT", { properties: { tabColor: { argb: argb(T.scheme["UNION-OSS"]) } } });
  titleBlock(ws, "Breakdown by VAT Rate", report, 7);

  const columns: ColSpec[] = [
    { header: "Country", width: 26 },
    { header: "Category", width: 16 },
    { header: "VAT Rate", width: 12, align: "right" },
    { header: "Total", width: 14, money: true },
    { header: "Base", width: 14, money: true },
    { header: "VAT", width: 14, money: true },
    { header: "Currency", width: 10, align: "right" },
  ];
  const rows: (string | number)[][] = [];
  const cats: string[] = [];
  for (const c of report.countries) {
    for (const cat of c.transactionCategories) {
      for (const r of cat.VAT || []) {
        rows.push([countryLabel(c.country), schemeTitle(cat.category), rateLabel(r.vat_percentage), r.total, r.base, r.vat, r.currency]);
        cats.push(cat.category);
      }
    }
  }
  writeTable(ws, { startRow: 4, columns, rows, vatColumnIndex: 5, categoryColumnIndex: 1, categoryValues: cats });
}

/* ------------------------------------------------------------------ *
 * DETAIL_TRANSACTION — every row broken out by transaction type.
 * ------------------------------------------------------------------ */

function buildTransactionDetailSheet(wb: ExcelJS.Workbook, report: ProcessedReport) {
  const ws = wb.addWorksheet("DETAIL_TRANSACTION", { properties: { tabColor: { argb: argb(T.scheme.REGULAR) } } });
  titleBlock(ws, "Breakdown by Transaction Type", report, 7);

  const columns: ColSpec[] = [
    { header: "Country", width: 26 },
    { header: "Category", width: 16 },
    { header: "Type", width: 24 },
    { header: "Total", width: 14, money: true },
    { header: "Base", width: 14, money: true },
    { header: "VAT", width: 14, money: true },
    { header: "Currency", width: 10, align: "right" },
  ];
  const rows: (string | number)[][] = [];
  const cats: string[] = [];
  for (const c of report.countries) {
    for (const cat of c.transactionCategories) {
      for (const r of cat.TRANSACTION || []) {
        rows.push([countryLabel(c.country), schemeTitle(cat.category), r.transaction_type, r.total, r.base, r.vat, r.currency]);
        cats.push(cat.category);
      }
    }
  }
  writeTable(ws, { startRow: 4, columns, rows, vatColumnIndex: 5, categoryColumnIndex: 1, categoryValues: cats });
}

/* ------------------------------------------------------------------ *
 * One small sheet per country × category — same visual language at a
 * smaller scale, tab-colored by reporting scheme so seller can jump
 * straight to e.g. every OSS sheet by tab color alone.
 * ------------------------------------------------------------------ */

function buildCountryCategorySheets(wb: ExcelJS.Workbook, report: ProcessedReport) {
  const seen = new Set<string>();
  for (const c of report.countries) {
    for (const cat of c.transactionCategories) {
      const name = sanitizeSheet(`${cat.category}-${c.country}`).slice(0, 28);
      if (seen.has(name)) continue;
      seen.add(name);

      const ws = wb.addWorksheet(name, { properties: { tabColor: { argb: argb(schemeColor(cat.category)) } } });
      titleBlock(ws, `${schemeTitle(cat.category)} — ${countryLabel(c.country)}`, report, 5, schemeColor(cat.category));

      const columns: ColSpec[] = [
        { header: "Type", width: 32 },
        { header: "Total", width: 14, money: true },
        { header: "Base", width: 14, money: true },
        { header: "VAT", width: 14, money: true },
        { header: "Currency", width: 10, align: "right" },
      ];
      const rows = (cat.TRANSACTION || []).map((r) => [r.transaction_type, r.total, r.base, r.vat, r.currency]);
      writeTable(ws, { startRow: 4, columns, rows, vatColumnIndex: 3 });
    }
  }
}

/* ------------------------------------------------------------------ *
 * Entry point
 * ------------------------------------------------------------------ */

export async function buildXlsx(report: ProcessedReport): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "FiscorAI";
  wb.created = new Date();

  buildSummarySheet(wb, report);
  buildVatDetailSheet(wb, report);
  buildTransactionDetailSheet(wb, report);
  buildCountryCategorySheets(wb, report);

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

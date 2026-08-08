import ExcelJS from "exceljs";
import type {
  CanonicalReportV2,
  DataQualityIssue,
  ReconciliationStatus,
  ReportView,
} from "./canonical-types.js";
import { rateToDisplayPercent } from "./decimal.js";

/* ------------------------------------------------------------------ *
 * Theme
 * ------------------------------------------------------------------ */

const FONT = "Calibri";
const NAVY = "0C1B2E";
const TEAL = "1A4D7A";
const WASH = "F4F7FA";
const ACCENT_SOFT = "E8F0F7";
const MUTED = "6B7A88";
const BODY = "2B3A48";
const WARNING_FILL = "FBF8EE";
const WARNING_TEXT = "8B6914";
const ERROR_FILL = "FBF2EC";
const ERROR_TEXT = "9C3B12";
const SUCCESS_TEXT = "1A5C45";
const MARKETPLACE_FILL = "F3F7FB";
const ALT_ROW = "F8FAFC";
const WHITE = "FFFFFF";

const MONEY: Record<string, string> = {
  EUR: '€#,##0.00;[Red]-€#,##0.00',
  GBP: '£#,##0.00;[Red]-£#,##0.00',
  SEK: '#,##0.00 "kr";[Red]-#,##0.00 "kr"',
};
const MONEY_GENERIC = '#,##0.00;[Red]-#,##0.00';
const PCT_FMT = "0%";
const COUNT_FMT = "0";

function fill(hex: string): ExcelJS.Fill {
  return { type: "pattern", pattern: "solid", fgColor: { argb: `FF${hex}` } };
}

function font(opts: Partial<ExcelJS.Font> = {}): Partial<ExcelJS.Font> {
  return { name: FONT, color: { argb: `FF${BODY}` }, ...opts };
}

function borderThin(): Partial<ExcelJS.Borders> {
  const edge: Partial<ExcelJS.Border> = { style: "thin", color: { argb: "FFD5DDE5" } };
  return { top: edge, left: edge, bottom: edge, right: edge };
}

function moneyFmt(currency: string): string {
  return MONEY[currency.toUpperCase()] || MONEY_GENERIC;
}

function readinessLabel(status: ReconciliationStatus): string {
  switch (status) {
    case "READY":
      return "Ready";
    case "READY_WITH_WARNINGS":
      return "Ready with warnings";
    case "PARTIAL":
      return "Partial — not for filing";
    case "NOT_READY":
      return "Not ready";
    default:
      return "Invalid — not for filing";
  }
}

function parsePeriod(period: string | null | undefined): string {
  if (!period) return "—";
  const m = period.match(/^(\d{4})-([A-Z]{3})$/i);
  if (!m) return period;
  const months: Record<string, string> = {
    JAN: "January",
    FEB: "February",
    MAR: "March",
    APR: "April",
    MAY: "May",
    JUN: "June",
    JUL: "July",
    AUG: "August",
    SEP: "September",
    OCT: "October",
    NOV: "November",
    DEC: "December",
  };
  return `${(months[m[2]!.toUpperCase()] || m[2]!.toUpperCase()).toUpperCase()} ${m[1]}`;
}

function formatGenerated(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${day} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function rowsRemoved(view: ReportView): number {
  return view.issues.filter((i) => i.code.includes("REMOVED")).length;
}

function rateToNumber(sourceRate: string | null, displayRate: string | null): number | null {
  if (sourceRate != null && sourceRate !== "") {
    const n = Number(sourceRate);
    if (Number.isFinite(n)) {
      return Math.abs(n) <= 1 ? n : n / 100;
    }
  }
  if (displayRate) {
    const m = displayRate.match(/^([\d.]+)%$/);
    if (m) return Number(m[1]) / 100;
  }
  return null;
}

function styleHeaderRow(ws: ExcelJS.Worksheet, row: number, colCount: number) {
  for (let c = 1; c <= colCount; c++) {
    const cell = ws.getCell(row, c);
    cell.font = font({ bold: true, color: { argb: `FF${WHITE}` }, size: 10 });
    cell.fill = fill(NAVY);
    cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
    cell.border = borderThin();
  }
  ws.getRow(row).height = 22;
}

function styleDataRow(ws: ExcelJS.Worksheet, row: number, colCount: number, alt: boolean) {
  for (let c = 1; c <= colCount; c++) {
    const cell = ws.getCell(row, c);
    cell.font = font({ size: 10 });
    cell.alignment = { vertical: "middle" };
    cell.border = borderThin();
    if (alt) cell.fill = fill(ALT_ROW);
  }
  ws.getRow(row).height = 18;
}

function setWidths(ws: ExcelJS.Worksheet, widths: number[]) {
  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });
}

/**
 * Missing-value policy for XLSX:
 * - null / undefined / ""  → true blank cell (ExcelJS null)
 * - never emit empty-string sharedStrings (those become index N and some
 *   viewers incorrectly render the index, e.g. 109, as a visible value)
 * - explicit 0 / 0.00 / "0%" remain as written
 */
export function asCellValue(value: unknown): ExcelJS.CellValue {
  if (value == null) return null;
  if (value === "") return null;
  if (typeof value === "number" && Number.isNaN(value)) return null;
  return value as ExcelJS.CellValue;
}

function writeCell(
  ws: ExcelJS.Worksheet,
  row: number,
  col: number,
  value: unknown,
  opts: { numFmt?: string; align?: "left" | "right" | "center"; muted?: boolean } = {},
) {
  const cell = ws.getCell(row, col);
  cell.value = asCellValue(value);
  if (opts.numFmt && cell.value != null && typeof cell.value === "number") {
    cell.numFmt = opts.numFmt;
  }
  if (opts.align) cell.alignment = { ...(cell.alignment || {}), horizontal: opts.align, vertical: "middle" };
  if (opts.muted) cell.font = font({ size: 9, color: { argb: `FF${MUTED}` } });
}

function textOrBlank(value: string | null | undefined): string | null {
  if (value == null) return null;
  const t = value.trim();
  return t === "" ? null : t;
}

function labelCell(ws: ExcelJS.Worksheet, addr: string, text: string) {
  const cell = ws.getCell(addr);
  cell.value = text;
  cell.font = font({ bold: true, size: 8, color: { argb: `FF${MUTED}` } });
}

function sheetNav(ws: ExcelJS.Worksheet, row: number) {
  const links: Array<[string, string]> = [
    ["Transaction detail", "TRANSACTIONS"],
    ["VAT breakdown", "VAT_BREAKDOWN"],
    ["Refunds", "REFUNDS"],
    ["Movements", "MOVEMENTS"],
    ["Data quality", "DATA_QUALITY"],
  ];
  labelCell(ws, `A${row}`, "WORKBOOK");
  row++;
  links.forEach(([label, sheet], i) => {
    const cell = ws.getCell(row, i + 1);
    cell.value = { text: label, hyperlink: `#'${sheet}'!A1` };
    cell.font = font({ size: 9, color: { argb: `FF${TEAL}` }, underline: true });
  });
  return row;
}

function marketplaceDestination(view: ReportView, scheme: string, currency: string): string {
  const match = view.schemeSummaries.find(
    (s) =>
      s.sourceTaxReportingScheme === scheme &&
      s.currency === currency &&
      s.taxCollectionResponsibility === "MARKETPLACE",
  );
  return match?.salesDestination ?? "—";
}

function paintBand(ws: ExcelJS.Worksheet, row: number, cols: number, hex: string) {
  for (let c = 1; c <= cols; c++) {
    ws.getCell(row, c).fill = fill(hex);
  }
}

function sectionLabel(ws: ExcelJS.Worksheet, row: number, text: string, cols = 8) {
  ws.mergeCells(row, 1, row, cols);
  const cell = ws.getCell(row, 1);
  cell.value = text;
  cell.font = font({ bold: true, size: 8, color: { argb: `FF${MUTED}` } });
  cell.alignment = { vertical: "middle" };
}

function kvRow(ws: ExcelJS.Worksheet, row: number, label: string, value: string | number, opts: { mono?: boolean; numFmt?: string } = {}) {
  ws.getCell(row, 1).value = label;
  ws.getCell(row, 1).font = font({ size: 9, color: { argb: `FF${MUTED}` } });
  ws.getCell(row, 1).alignment = { vertical: "middle" };
  ws.mergeCells(row, 2, row, 4);
  const v = ws.getCell(row, 2);
  v.value = value;
  v.font = font({
    bold: true,
    size: opts.mono ? 8 : 10,
    name: opts.mono ? "Consolas" : FONT,
  });
  v.alignment = { vertical: "middle", horizontal: typeof value === "number" ? "right" : "left" };
  if (opts.numFmt) v.numFmt = opts.numFmt;
}

function tableHead(ws: ExcelJS.Worksheet, row: number, headers: string[]) {
  headers.forEach((h, i) => {
    const cell = ws.getCell(row, i + 1);
    cell.value = h;
    cell.font = font({ bold: true, size: 9, color: { argb: `FF${WHITE}` } });
    cell.fill = fill(NAVY);
    cell.border = borderThin();
    cell.alignment = { vertical: "middle", horizontal: "left" };
  });
  ws.getRow(row).height = 20;
}

function buildSummary(wb: ExcelJS.Workbook, canonical: CanonicalReportV2) {
  const view = canonical.view;
  const p = view.provenance;
  const ws = wb.addWorksheet("SUMMARY", {
    properties: { defaultRowHeight: 18 },
    pageSetup: { orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 },
  });

  // One consistent 8-column grid for every SUMMARY block.
  // A label/text · B secondary · C money · D money/currency · E–H scheme detail / KPI extras
  setWidths(ws, [20, 18, 14, 14, 14, 12, 12, 12]);

  const COLS = 8;

  // Header band
  for (const row of [1, 2, 3, 4]) {
    ws.mergeCells(row, 1, row, COLS);
    paintBand(ws, row, COLS, NAVY);
  }
  ws.getCell("A1").value = "FISCORAI";
  ws.getCell("A1").font = font({ bold: true, size: 11, color: { argb: `FF${TEAL}` } });
  ws.getRow(1).height = 18;

  ws.getCell("A2").value = "VAT ACTIVITY REPORT";
  ws.getCell("A2").font = font({ bold: true, size: 10, color: { argb: `FF${WHITE}` } });

  ws.getCell("A3").value = parsePeriod(p.sourceActivityPeriod || p.requestedPeriodLabel);
  ws.getCell("A3").font = font({ bold: true, size: 20, color: { argb: `FF${WHITE}` } });
  ws.getRow(3).height = 28;

  ws.getCell("A4").value = `Generated ${formatGenerated(p.generatedAt)}    ·    Report ${p.reportId}`;
  ws.getCell("A4").font = font({ size: 9, color: { argb: "FFA8C5D8" } });
  ws.getRow(4).height = 18;

  let r = 6;

  // Status
  const warnings = view.executiveSummary.issueCounts.WARNING || 0;
  const removed = rowsRemoved(view);
  const statusTitle =
    canonical.reconciliationStatus === "READY_WITH_WARNINGS"
      ? "Ready with warnings"
      : readinessLabel(canonical.reconciliationStatus);
  const statusFill =
    canonical.reconciliationStatus === "READY"
      ? "EDF7F3"
      : canonical.reconciliationStatus === "READY_WITH_WARNINGS"
        ? WARNING_FILL
        : ERROR_FILL;
  const statusColor =
    canonical.reconciliationStatus === "READY"
      ? SUCCESS_TEXT
      : canonical.reconciliationStatus === "READY_WITH_WARNINGS"
        ? WARNING_TEXT
        : ERROR_TEXT;

  for (const offset of [0, 1, 2]) {
    ws.mergeCells(r + offset, 1, r + offset, COLS);
    paintBand(ws, r + offset, COLS, statusFill);
  }
  ws.getCell(r, 1).value = "STATUS";
  ws.getCell(r, 1).font = font({ bold: true, size: 8, color: { argb: `FF${statusColor}` } });
  r++;
  ws.getCell(r, 1).value = statusTitle;
  ws.getCell(r, 1).font = font({ bold: true, size: 13, color: { argb: `FF${NAVY}` } });
  r++;
  const statusBody = [
    "Financial reconciliation passed.",
    warnings ? `${warnings} item${warnings === 1 ? "" : "s"} require review.` : "No review warnings.",
    removed === 0 ? "No source rows were removed." : `${removed} source rows were removed.`,
  ].join("  ");
  ws.getCell(r, 1).value =
    canonical.reconciliationStatus === "READY" || canonical.reconciliationStatus === "READY_WITH_WARNINGS"
      ? statusBody
      : "This report is not ready for filing.";
  ws.getCell(r, 1).font = font({ size: 9 });
  r += 2;

  // KPIs — five equal columns A–E
  sectionLabel(ws, r, "PRIMARY METRICS", COLS);
  r++;
  const metrics: Array<[string, number]> = [
    ["SOURCE RECORDS", view.executiveSummary.sourceRecords],
    ["SALES", view.executiveSummary.transactionTypes.SALE || 0],
    ["REFUNDS", view.executiveSummary.transactionTypes.REFUND || 0],
    ["RETURNS", view.executiveSummary.transactionTypes.RETURN || 0],
    ["FC TRANSFERS", view.executiveSummary.transactionTypes.FC_TRANSFER || 0],
  ];
  metrics.forEach(([label], i) => {
    const cell = ws.getCell(r, i + 1);
    cell.value = label;
    cell.font = font({ bold: true, size: 8, color: { argb: `FF${MUTED}` } });
    cell.fill = fill(WASH);
    cell.border = borderThin();
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  });
  ws.getRow(r).height = 22;
  r++;
  metrics.forEach(([, value], i) => {
    const cell = ws.getCell(r, i + 1);
    cell.value = value;
    cell.font = font({ bold: true, size: 14, color: { argb: `FF${NAVY}` } });
    cell.fill = fill(WHITE);
    cell.border = borderThin();
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.numFmt = COUNT_FMT;
  });
  ws.getRow(r).height = 26;
  r += 2;

  // Seller VAT
  sectionLabel(ws, r, "SELLER VAT IDENTIFIED", COLS);
  r++;
  const sellerVat = view.executiveSummary.sellerVatIdentified[0];
  if (sellerVat) {
    ws.mergeCells(r, 1, r, 2);
    const cell = ws.getCell(r, 1);
    cell.value = Number(sellerVat.amount);
    cell.numFmt = moneyFmt(sellerVat.currency);
    cell.font = font({ bold: true, size: 22, color: { argb: `FF${NAVY}` } });
    cell.fill = fill(ACCENT_SOFT);
    cell.border = borderThin();
    cell.alignment = { vertical: "middle", horizontal: "left" };
    ws.getCell(r, 2).fill = fill(ACCENT_SOFT);
    ws.getCell(r, 2).border = borderThin();
    ws.getRow(r).height = 32;
    r++;
    ws.mergeCells(r, 1, r, 2);
    ws.getCell(r, 1).value = `Source-reported seller VAT · ${sellerVat.currency}`;
    ws.getCell(r, 1).font = font({ size: 9, color: { argb: `FF${MUTED}` } });
    ws.getCell(r, 1).fill = fill(ACCENT_SOFT);
    ws.getCell(r, 2).fill = fill(ACCENT_SOFT);
  }
  r += 2;

  // Marketplace — columns A–D
  sectionLabel(ws, r, "MARKETPLACE-RESPONSIBLE ACTIVITY", COLS);
  r++;
  tableHead(ws, r, ["Destination", "Scheme", "Activity", "Currency"]);
  r++;
  for (const row of view.executiveSummary.marketplaceActivity) {
    const vals: Array<string | number> = [
      marketplaceDestination(view, row.scheme, row.currency),
      row.scheme,
      Number(row.amount),
      row.currency,
    ];
    vals.forEach((v, i) => {
      const cell = ws.getCell(r, i + 1);
      cell.value = v;
      cell.font = font({ size: 10 });
      cell.border = borderThin();
      cell.fill = fill(MARKETPLACE_FILL);
      cell.alignment = { vertical: "middle", horizontal: i === 2 ? "right" : "left" };
    });
    ws.getCell(r, 3).numFmt = moneyFmt(row.currency);
    r++;
  }
  r++;

  // Currency summary — columns A–D (same grid as marketplace)
  sectionLabel(ws, r, "CURRENCY SUMMARY", COLS);
  r++;
  tableHead(ws, r, ["Currency", "Activity incl.", "Base", "VAT"]);
  r++;
  for (const total of view.totalsByCurrency) {
    const vals: Array<string | number> = [
      total.currency,
      Number(total.activityIncl),
      Number(total.activityExcl),
      Number(total.vat),
    ];
    vals.forEach((v, i) => {
      const cell = ws.getCell(r, i + 1);
      cell.value = v;
      cell.font = font({ size: 10, bold: i === 0 });
      cell.border = borderThin();
      cell.fill = fill(WASH);
      cell.alignment = { vertical: "middle", horizontal: i === 0 ? "left" : "right" };
    });
    for (const c of [2, 3, 4]) {
      ws.getCell(r, c).numFmt = moneyFmt(total.currency);
    }
    r++;
  }
  r++;

  // Report integrity — A label, B:D value
  sectionLabel(ws, r, "REPORT INTEGRITY", COLS);
  r++;
  const integrity: Array<[string, string | number]> = [
    [
      "Reconciliation",
      canonical.reconciliationStatus === "READY" || canonical.reconciliationStatus === "READY_WITH_WARNINGS"
        ? "Passed"
        : "Failed",
    ],
    ["Source rows", p.sourceRowCount],
    ["Processed rows", canonical.rows.length],
    ["Rows removed", rowsRemoved(view)],
    ["Currencies", view.executiveSummary.currencies.join(", ") || "—"],
    ["FX conversion", "None"],
  ];
  for (const [k, v] of integrity) {
    kvRow(ws, r, k, v, typeof v === "number" ? { numFmt: COUNT_FMT } : {});
    r++;
  }
  r++;

  // Provenance — A label, B:D value (no overlapping merges with later tables)
  sectionLabel(ws, r, "PROVENANCE", COLS);
  r++;
  const prov: Array<[string, string]> = [
    ["Source file", p.sourceFileName],
    ["Source file hash", p.sourceFileHash],
    ["Source records", String(p.sourceRowCount)],
    ["Activity period", p.sourceActivityPeriod || p.sourceActivityPeriods.join(", ") || "—"],
    ["Generated at", p.generatedAt],
    ["Processor version", p.processorVersion],
    ["Report model version", p.canonicalReportModelVersion],
    ["Reconciliation status", p.reconciliationStatus],
    ["Report ID", p.reportId],
  ];
  for (const [k, v] of prov) {
    kvRow(ws, r, k, v, { mono: k.includes("hash") || k === "Report ID" });
    r++;
  }
  r += 2;

  r = sheetNav(ws, r) + 2;

  // Scheme detail — full A–H aligned table (fixed previous off-by-one shift)
  sectionLabel(ws, r, "SCHEME DETAIL", COLS);
  r++;
  const schemeHeaders = [
    "Scheme",
    "Responsibility",
    "Destination",
    "Activity incl.",
    "Base",
    "VAT",
    "Currency",
    "Transactions",
  ];
  tableHead(ws, r, schemeHeaders);
  const schemeHeaderRow = r;
  r++;
  for (const row of view.schemeSummaries) {
    const vals: Array<string | number> = [
      row.sourceTaxReportingScheme,
      row.taxCollectionResponsibility,
      row.salesDestination,
      Number(row.activityIncl),
      Number(row.activityExcl),
      Number(row.vat),
      row.currency,
      row.transactionCount,
    ];
    vals.forEach((v, i) => {
      const cell = ws.getCell(r, i + 1);
      cell.value = v;
      cell.font = font({ size: 9 });
      cell.border = borderThin();
      cell.alignment = {
        vertical: "middle",
        horizontal: i >= 3 && i <= 5 || i === 7 ? "right" : "left",
      };
      if (row.taxCollectionResponsibility === "MARKETPLACE") cell.fill = fill(MARKETPLACE_FILL);
    });
    for (const c of [4, 5, 6]) {
      ws.getCell(r, c).numFmt = moneyFmt(row.currency);
    }
    ws.getCell(r, 8).numFmt = COUNT_FMT;
    r++;
  }
  if (view.schemeSummaries.length) {
    ws.autoFilter = {
      from: { row: schemeHeaderRow, column: 1 },
      to: { row: r - 1, column: 8 },
    };
  }
}

function buildTransactions(wb: ExcelJS.Workbook, canonical: CanonicalReportV2) {
  const ws = wb.addWorksheet("TRANSACTIONS");
  const headers = [
    "Source Row",
    "Activity Period",
    "Transaction Type",
    "Event ID",
    "Marketplace",
    "Scheme",
    "Responsibility",
    "Sale Departure",
    "Sale Arrival",
    "Physical Departure",
    "Physical Arrival",
    "VAT Imputation Country",
    "Taxable Jurisdiction",
    "Sales Destination (derived)",
    "Currency",
    "Activity Incl.",
    "Base",
    "VAT",
    "Source VAT Rate",
    "Display VAT Rate",
    "Resolution Source",
    "Issues",
  ];
  styleHeaderRow(ws, 1, headers.length);
  headers.forEach((h, i) => {
    ws.getCell(1, i + 1).value = h;
  });
  setWidths(ws, [10, 13, 14, 24, 14, 16, 14, 12, 12, 14, 14, 16, 16, 18, 10, 13, 12, 12, 13, 13, 26, 14]);

  const issueByRow = new Map<number, DataQualityIssue[]>();
  for (const issue of canonical.view.issues) {
    if (issue.sourceRow == null) continue;
    const list = issueByRow.get(issue.sourceRow) || [];
    list.push(issue);
    issueByRow.set(issue.sourceRow, list);
  }

  let r = 2;
  for (const row of canonical.rows) {
    const currency = textOrBlank(row.transactionCurrencyCode.value);
    const displayRate = rateToDisplayPercent(row.priceVatRatePercent.raw);
    const issues = issueByRow.get(row.sourceRow) || [];
    const issueLabel = issues.length ? [...new Set(issues.map((i) => i.severity))].join(", ") : null;

    const values: unknown[] = [
      row.sourceRow,
      textOrBlank(row.activityPeriod.value),
      textOrBlank(row.transactionType.value),
      textOrBlank(row.transactionEventId.value),
      textOrBlank(row.marketplace.value),
      textOrBlank(row.taxReportingScheme.value),
      textOrBlank(row.taxCollectionResponsibility.value),
      textOrBlank(row.saleDepartCountry.value),
      textOrBlank(row.saleArrivalCountry.value),
      textOrBlank(row.departureCountry.value),
      textOrBlank(row.arrivalCountry.value),
      textOrBlank(row.vatCalculationImputationCountry.value),
      textOrBlank(row.taxableJurisdiction.value),
      textOrBlank(row.derived.salesDestination.value),
      currency,
      row.activityValueIncl.value != null ? Number(row.activityValueIncl.value) : null,
      row.activityValueExcl.value != null ? Number(row.activityValueExcl.value) : null,
      row.activityVat.value != null ? Number(row.activityVat.value) : null,
      textOrBlank(row.priceVatRatePercent.raw),
      displayRate,
      textOrBlank(row.refundLink.provenance),
      issueLabel,
    ];
    values.forEach((v, i) => writeCell(ws, r, i + 1, v));
    styleDataRow(ws, r, headers.length, r % 2 === 0);

    for (const c of [16, 17, 18]) {
      const cell = ws.getCell(r, c);
      if (typeof cell.value === "number") {
        cell.numFmt = currency ? moneyFmt(currency) : MONEY_GENERIC;
      }
      cell.alignment = { horizontal: "right", vertical: "middle" };
    }
    for (const c of [19, 20]) {
      const cell = ws.getCell(r, c);
      if (cell.value != null) cell.font = font({ size: 9, color: { argb: `FF${MUTED}` } });
    }

    if ((row.transactionType.value || "").toUpperCase() === "REFUND") {
      for (const c of [16, 17, 18]) {
        if (typeof ws.getCell(r, c).value === "number") {
          ws.getCell(r, c).font = font({ size: 10, color: { argb: `FF${ERROR_TEXT}` } });
        }
      }
    }
    if ((row.taxCollectionResponsibility.value || "").toUpperCase() === "MARKETPLACE") {
      ws.getCell(r, 7).fill = fill(MARKETPLACE_FILL);
      ws.getCell(r, 7).font = font({ size: 10, bold: true, color: { argb: `FF${TEAL}` } });
    }
    if (issues.some((i) => i.severity === "WARNING" || i.severity === "ERROR" || i.severity === "BLOCKER")) {
      const sev = issues.some((i) => i.severity === "ERROR" || i.severity === "BLOCKER") ? "ERROR" : "WARNING";
      ws.getCell(r, 22).fill = fill(sev === "ERROR" ? ERROR_FILL : WARNING_FILL);
      ws.getCell(r, 22).font = font({
        size: 9,
        bold: true,
        color: { argb: `FF${sev === "ERROR" ? ERROR_TEXT : WARNING_TEXT}` },
      });
    }

    r++;
  }

  ws.views = [{ state: "frozen", ySplit: 1, xSplit: 2, showGridLines: true }];
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(r - 1, 1), column: headers.length } };
}

function buildVatBreakdown(wb: ExcelJS.Workbook, view: ReportView) {
  const ws = wb.addWorksheet("VAT_BREAKDOWN");
  const headers = [
    "Scheme",
    "Jurisdiction",
    "Rate",
    "Activity",
    "Base",
    "VAT",
    "Currency",
    "Transactions",
    "Source rate",
    "Display rate",
  ];
  styleHeaderRow(ws, 1, headers.length);
  headers.forEach((h, i) => {
    const cell = ws.getCell(1, i + 1);
    cell.value = h;
    if (i >= 8) cell.font = font({ bold: true, size: 9, color: { argb: "FFB0BEC8" } });
  });
  setWidths(ws, [16, 16, 10, 13, 12, 12, 10, 12, 12, 12]);

  let r = 2;
  for (const row of view.vatRateBreakdown) {
    const rateNum = rateToNumber(row.sourceRate, row.displayRate);
    writeCell(ws, r, 1, row.sourceTaxReportingScheme);
    writeCell(ws, r, 2, row.jurisdiction);
    writeCell(ws, r, 3, rateNum, { numFmt: rateNum != null ? PCT_FMT : undefined, align: "right" });
    writeCell(ws, r, 4, Number(row.activityIncl), { numFmt: moneyFmt(row.currency), align: "right" });
    writeCell(ws, r, 5, Number(row.activityExcl), { numFmt: moneyFmt(row.currency), align: "right" });
    writeCell(ws, r, 6, Number(row.vat), { numFmt: moneyFmt(row.currency), align: "right" });
    writeCell(ws, r, 7, row.currency);
    writeCell(ws, r, 8, row.transactionCount, { numFmt: COUNT_FMT, align: "right" });
    writeCell(ws, r, 9, textOrBlank(row.sourceRate), { muted: true });
    writeCell(ws, r, 10, row.displayRate ?? "—", { muted: true, align: "right" });

    styleDataRow(ws, r, headers.length, r % 2 === 0);
    if (rateNum != null) ws.getCell(r, 3).numFmt = PCT_FMT;
    for (const c of [4, 5, 6]) {
      ws.getCell(r, c).numFmt = moneyFmt(row.currency);
      ws.getCell(r, c).alignment = { horizontal: "right", vertical: "middle" };
    }
    ws.getCell(r, 8).numFmt = COUNT_FMT;
    for (const c of [9, 10]) {
      ws.getCell(r, c).font = font({ size: 9, color: { argb: `FF${MUTED}` } });
    }
    r++;
  }

  ws.views = [{ state: "frozen", ySplit: 1, showGridLines: true }];
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(r - 1, 1), column: headers.length } };
}

function buildRefunds(wb: ExcelJS.Workbook, view: ReportView) {
  const ws = wb.addWorksheet("REFUNDS");
  setWidths(ws, [11, 24, 14, 14, 10, 28, 16, 12]);

  const refundCount = view.executiveSummary.transactionTypes.REFUND || view.refundSummaries.length;
  const eurRefund = view.transactionTypeSummaries.find((t) => t.transactionType === "REFUND" && t.currency === "EUR");

  ws.mergeCells("A1:H1");
  ws.getCell("A1").value = "REFUND ACTIVITY";
  ws.getCell("A1").font = font({ bold: true, size: 14, color: { argb: `FF${NAVY}` } });
  ws.getCell("A1").fill = fill(WASH);

  ws.getCell("A2").value = "Transactions";
  ws.getCell("A2").font = font({ size: 9, color: { argb: `FF${MUTED}` } });
  ws.getCell("B2").value = refundCount;
  ws.getCell("B2").font = font({ bold: true, size: 12 });
  ws.getCell("B2").numFmt = COUNT_FMT;

  ws.getCell("A3").value = "Net activity";
  ws.getCell("A3").font = font({ size: 9, color: { argb: `FF${MUTED}` } });
  if (eurRefund) {
    ws.getCell("B3").value = Number(eurRefund.activityIncl);
    ws.getCell("B3").numFmt = moneyFmt("EUR");
    ws.getCell("B3").font = font({ bold: true, size: 12, color: { argb: `FF${ERROR_TEXT}` } });
  }

  const headers = [
    "Source Row",
    "Event ID",
    "Destination",
    "Activity Amount",
    "Currency",
    "Resolution Source",
    "Matched Source Row",
    "Issue Status",
  ];
  const headerRow = 5;
  styleHeaderRow(ws, headerRow, headers.length);
  headers.forEach((h, i) => {
    ws.getCell(headerRow, i + 1).value = h;
  });

  let r = 6;
  for (const row of view.refundSummaries) {
    const related = view.issues.filter(
      (i) => i.sourceRow === row.sourceRow || (row.transactionEventId && i.transactionEventId === row.transactionEventId),
    );
    const issueStatus = related.length ? [...new Set(related.map((i) => i.severity))].join(", ") : null;
    writeCell(ws, r, 1, row.sourceRow);
    writeCell(ws, r, 2, textOrBlank(row.transactionEventId));
    writeCell(ws, r, 3, textOrBlank(row.salesDestination));
    writeCell(ws, r, 4, Number(row.activityIncl), { numFmt: moneyFmt(row.currency), align: "right" });
    writeCell(ws, r, 5, row.currency);
    writeCell(ws, r, 6, row.linkProvenance);
    writeCell(ws, r, 7, row.matchedSourceRow ?? null, { align: "right" });
    writeCell(ws, r, 8, issueStatus);
    styleDataRow(ws, r, headers.length, r % 2 === 0);
    ws.getCell(r, 4).font = font({ size: 10, color: { argb: `FF${ERROR_TEXT}` } });
    ws.getCell(r, 4).numFmt = moneyFmt(row.currency);
    ws.getCell(r, 4).alignment = { horizontal: "right", vertical: "middle" };
    r++;
  }

  ws.views = [{ state: "frozen", ySplit: headerRow, showGridLines: true }];
  if (view.refundSummaries.length) {
    ws.autoFilter = {
      from: { row: headerRow, column: 1 },
      to: { row: r - 1, column: headers.length },
    };
  }
}

function buildMovements(wb: ExcelJS.Workbook, view: ReportView) {
  const ws = wb.addWorksheet("MOVEMENTS");
  setWidths(ws, [11, 14, 24, 10, 12, 12]);

  const returns = view.executiveSummary.transactionTypes.RETURN || 0;
  const transfers = view.executiveSummary.transactionTypes.FC_TRANSFER || 0;

  ws.mergeCells("A1:F1");
  ws.getCell("A1").value = "OPERATIONAL MOVEMENTS";
  ws.getCell("A1").font = font({ bold: true, size: 14, color: { argb: `FF${NAVY}` } });
  ws.getCell("A1").fill = fill(WASH);

  ws.getCell("A2").value = "Records";
  ws.getCell("B2").value = view.movementSummaries.length;
  ws.getCell("B2").font = font({ bold: true, size: 16, color: { argb: `FF${NAVY}` } });
  ws.getCell("B2").numFmt = COUNT_FMT;

  ws.getCell("A3").value = "Returns";
  ws.getCell("B3").value = returns;
  ws.getCell("C3").value = "FC transfers";
  ws.getCell("D3").value = transfers;
  ws.getCell("B3").numFmt = COUNT_FMT;
  ws.getCell("D3").numFmt = COUNT_FMT;

  const headers = ["Source Row", "Type", "Event ID", "Quantity", "Departure", "Arrival"];
  const headerRow = 5;
  styleHeaderRow(ws, headerRow, headers.length);
  headers.forEach((h, i) => {
    ws.getCell(headerRow, i + 1).value = h;
  });

  let r = 6;
  for (const row of view.movementSummaries) {
    const qty =
      row.qty != null && row.qty !== ""
        ? Number.isFinite(Number(row.qty))
          ? Number(row.qty)
          : row.qty
        : null;
    writeCell(ws, r, 1, row.sourceRow);
    writeCell(ws, r, 2, row.transactionType);
    writeCell(ws, r, 3, textOrBlank(row.transactionEventId));
    writeCell(ws, r, 4, qty, { align: "right" });
    writeCell(ws, r, 5, textOrBlank(row.departureCountry));
    writeCell(ws, r, 6, textOrBlank(row.arrivalCountry || row.saleArrivalCountry));
    styleDataRow(ws, r, headers.length, r % 2 === 0);
    if (row.transactionType === "FC_TRANSFER") {
      ws.getCell(r, 2).fill = fill(ACCENT_SOFT);
      ws.getCell(r, 2).font = font({ size: 10, bold: true, color: { argb: `FF${TEAL}` } });
    } else if (row.transactionType === "RETURN") {
      ws.getCell(r, 2).fill = fill(WASH);
    }
    r++;
  }

  ws.views = [{ state: "frozen", ySplit: headerRow, showGridLines: true }];
  if (view.movementSummaries.length) {
    ws.autoFilter = {
      from: { row: headerRow, column: 1 },
      to: { row: r - 1, column: headers.length },
    };
  }
}

function buildDataQuality(wb: ExcelJS.Workbook, view: ReportView, status: ReconciliationStatus) {
  const ws = wb.addWorksheet("DATA_QUALITY");
  setWidths(ws, [11, 30, 11, 22, 14, 16, 16, 12, 10, 52, 40]);

  const passed = status === "READY" || status === "READY_WITH_WARNINGS";
  const counts = view.executiveSummary.issueCounts;

  ws.mergeCells("A1:K1");
  ws.getCell("A1").value = "DATA QUALITY";
  ws.getCell("A1").font = font({ bold: true, size: 14, color: { argb: `FF${NAVY}` } });
  ws.getCell("A1").fill = fill(WASH);

  ws.getCell("A2").value = "Financial reconciliation";
  ws.getCell("B2").value = passed ? "Passed" : "Failed";
  ws.getCell("B2").font = font({
    bold: true,
    size: 11,
    color: { argb: `FF${passed ? SUCCESS_TEXT : ERROR_TEXT}` },
  });

  ws.getCell("A3").value = "Warnings";
  ws.getCell("B3").value = counts.WARNING || 0;
  ws.getCell("C3").value = "Errors";
  ws.getCell("D3").value = (counts.ERROR || 0) + (counts.BLOCKER || 0);
  ws.getCell("E3").value = "Informational";
  ws.getCell("F3").value = counts.INFO || 0;
  for (const addr of ["B3", "D3", "F3"]) ws.getCell(addr).numFmt = COUNT_FMT;

  const headers = [
    "Severity",
    "Code",
    "Source Row",
    "Event ID",
    "Field",
    "Source Value",
    "Derived Value",
    "Amount",
    "Currency",
    "Message",
    "Recommended Action",
  ];
  const headerRow = 5;
  styleHeaderRow(ws, headerRow, headers.length);
  headers.forEach((h, i) => {
    ws.getCell(headerRow, i + 1).value = h;
  });

  let r = 6;
  for (const issue of view.issues) {
    writeCell(ws, r, 1, issue.severity);
    writeCell(ws, r, 2, issue.code);
    writeCell(ws, r, 3, issue.sourceRow ?? null);
    writeCell(ws, r, 4, textOrBlank(issue.transactionEventId));
    writeCell(ws, r, 5, textOrBlank(issue.field));
    writeCell(ws, r, 6, textOrBlank(issue.sourceValue));
    writeCell(ws, r, 7, textOrBlank(issue.derivedValue));
    writeCell(
      ws,
      r,
      8,
      issue.amount != null && issue.amount !== "" ? Number(issue.amount) : null,
      issue.currency ? { numFmt: moneyFmt(issue.currency), align: "right" } : { align: "right" },
    );
    writeCell(ws, r, 9, textOrBlank(issue.currency));
    writeCell(ws, r, 10, issue.message);
    writeCell(ws, r, 11, textOrBlank(issue.recommendedAction));
    styleDataRow(ws, r, headers.length, r % 2 === 0);

    ws.getCell(r, 10).alignment = { vertical: "middle", wrapText: true };
    ws.getCell(r, 11).alignment = { vertical: "middle", wrapText: true };
    ws.getRow(r).height = 32;

    if (issue.severity === "WARNING") {
      ws.getCell(r, 1).fill = fill(WARNING_FILL);
      ws.getCell(r, 1).font = font({ bold: true, size: 9, color: { argb: `FF${WARNING_TEXT}` } });
    } else if (issue.severity === "ERROR" || issue.severity === "BLOCKER") {
      ws.getCell(r, 1).fill = fill(ERROR_FILL);
      ws.getCell(r, 1).font = font({ bold: true, size: 9, color: { argb: `FF${ERROR_TEXT}` } });
    } else {
      ws.getCell(r, 1).font = font({ size: 9, color: { argb: `FF${MUTED}` } });
    }
    r++;
  }

  ws.views = [{ state: "frozen", ySplit: headerRow, showGridLines: true }];
  if (view.issues.length) {
    ws.autoFilter = {
      from: { row: headerRow, column: 1 },
      to: { row: r - 1, column: headers.length },
    };
  }
}

export async function buildXlsxFromCanonical(canonical: CanonicalReportV2): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "FiscorAI";
  wb.created = new Date();
  wb.company = "FiscorAI";
  wb.description = "VAT Activity Report";

  buildSummary(wb, canonical);
  buildTransactions(wb, canonical);
  buildVatBreakdown(wb, canonical.view);
  buildRefunds(wb, canonical.view);
  buildMovements(wb, canonical.view);
  buildDataQuality(wb, canonical.view, canonical.reconciliationStatus);

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

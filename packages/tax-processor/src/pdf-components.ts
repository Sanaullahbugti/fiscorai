import type PDFKit from "pdfkit";
import type { ReconciliationStatus, ReportView, SchemeSummaryRow } from "./canonical-types.js";
import { formatMoney } from "./canonical-summary.js";
import { formatDisplayMoney } from "./decimal.js";
import { DEFAULT_THEME, type PdfTheme } from "./pdf.js";

/* ------------------------------------------------------------------ *
 * Premium report theme (extends shared PdfTheme)
 * ------------------------------------------------------------------ */

export type ReportTheme = PdfTheme & {
  navy: string;
  accent: string;
  accentSoft: string;
  pageBg: string;
  surface: string;
  success: string;
  successWash: string;
  warning: string;
  warningWash: string;
  marketplaceWash: string;
};

export const REPORT_THEME: ReportTheme = {
  ...DEFAULT_THEME,
  navy: "#0C1B2E",
  accent: "#1A4D7A",
  accentSoft: "#E8F0F7",
  pageBg: "#FAFAF8",
  surface: "#FFFFFF",
  success: "#1A5C45",
  successWash: "#EDF7F3",
  warning: "#8B6914",
  warningWash: "#FBF8EE",
  marketplaceWash: "#F3F7FB",
};

export const PAGE = { margin: 48, footer: 52, headH: 20, rowH: 18 };

export type Doc = PDFKit.PDFDocument;

export type TableColumn = {
  label: string;
  width: number;
  align?: "left" | "right" | "center";
  mono?: boolean;
};

export type TableRowStyle = {
  bold?: boolean;
  band?: boolean;
  negative?: boolean[];
  muted?: boolean[];
  schemeEmphasis?: boolean;
  marketplace?: boolean;
  rowH?: number;
};

/* ------------------------------------------------------------------ *
 * Layout engine
 * ------------------------------------------------------------------ */

export class CanonicalSheet {
  y: number;
  readonly left: number;
  readonly right: number;
  readonly width: number;
  readonly bottom: number;
  pageIndex = 0;

  constructor(
    private doc: Doc,
    private t: ReportTheme,
  ) {
    this.left = PAGE.margin;
    this.width = doc.page.width - PAGE.margin * 2;
    this.right = this.left + this.width;
    this.bottom = doc.page.height - PAGE.footer;
    this.y = PAGE.margin;
  }

  gap(n: number) {
    this.y += n;
  }

  rule(color = this.t.ruleSoft, thickness = 0.5, advance = 6) {
    this.doc
      .save()
      .lineWidth(thickness)
      .strokeColor(color)
      .moveTo(this.left, this.y)
      .lineTo(this.right, this.y)
      .stroke()
      .restore();
    this.y += advance;
  }

  eyebrow(
    text: string,
    x: number,
    y: number,
    color: string,
    w?: number,
    align: "left" | "right" | "center" = "left",
  ) {
    this.doc
      .font("Helvetica-Bold")
      .fontSize(6.8)
      .fillColor(color)
      .text(text.toUpperCase(), x, y, {
        width: w,
        align,
        characterSpacing: 0.85,
        lineBreak: false,
      });
  }

  ensure(height: number): boolean {
    if (this.y + height <= this.bottom) return false;
    this.doc.addPage();
    this.pageIndex += 1;
    this.paintPageBackground();
    this.y = PAGE.margin;
    return true;
  }

  paintPageBackground() {
    this.doc.save().rect(0, 0, this.doc.page.width, this.doc.page.height).fill(this.t.pageBg).restore();
  }

  surfaceStroke(x: number, y: number, w: number, h: number, fill = this.t.surface, stroke = this.t.ruleSoft) {
    this.doc.save().lineWidth(0.6).strokeColor(stroke).rect(x, y, w, h).fillAndStroke(fill, stroke).restore();
  }
}

/* ------------------------------------------------------------------ *
 * Formatting helpers (display only — no financial aggregation)
 * ------------------------------------------------------------------ */

const MONTHS: Record<string, string> = {
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

export function parsePeriodLabel(period: string | null | undefined): { month: string; year: string; raw: string } {
  const raw = (period || "—").trim();
  const m = raw.match(/^(\d{4})-([A-Z]{3})$/i);
  if (!m) return { month: raw, year: "", raw };
  const year = m[1]!;
  const month = (MONTHS[m[2]!.toUpperCase()] || m[2]!.toUpperCase()).toUpperCase();
  return { month, year, raw };
}

export function displayMoney(value: string, currency: string): string {
  return formatMoney(currency, value);
}

export function displayMoneyPlain(value: string, currency: string): string {
  return formatDisplayMoney(value, currency).replace(` ${currency}`, "");
}

export function responsibilityLabel(value: string): string {
  const v = value.toUpperCase();
  if (v === "SELLER") return "Seller";
  if (v === "MARKETPLACE") return "Marketplace";
  return value;
}

export function rowsRemovedCount(view: ReportView): number {
  return view.issues.filter((i) => i.code.includes("REMOVED")).length;
}

export function warningReviewCount(view: ReportView): number {
  return view.executiveSummary.issueCounts.WARNING || 0;
}

export function statusPresentation(
  status: ReconciliationStatus,
  view: ReportView,
): {
  eyebrow: string;
  title: string;
  body: string;
  tone: "success" | "warning" | "alert";
} {
  const warnings = warningReviewCount(view);
  const removed = rowsRemovedCount(view);
  const removedLine =
    removed === 0 ? "No source rows were removed." : `${removed} source row${removed === 1 ? "" : "s"} removed automatically.`;

  switch (status) {
    case "READY":
      return {
        eyebrow: "Status",
        title: "Ready",
        body: `Financial reconciliation passed.\n${removedLine}`,
        tone: "success",
      };
    case "READY_WITH_WARNINGS":
      return {
        eyebrow: "Status",
        title: `Ready with warnings · ${warnings} item${warnings === 1 ? "" : "s"} to review`,
        body: `Financial reconciliation passed.\n${removedLine}`,
        tone: "warning",
      };
    case "PARTIAL":
      return {
        eyebrow: "Status",
        title: "Partial report",
        body: "Only part of the source period was processed. Do not use for filing without completing the full period.",
        tone: "alert",
      };
    case "NOT_READY":
      return {
        eyebrow: "Status",
        title: "Not ready",
        body: "Processing did not complete successfully. Resolve the issues listed in the review notes before filing.",
        tone: "alert",
      };
    default:
      return {
        eyebrow: "Status",
        title: "Invalid report",
        body: "This report failed validation and must not be used for filing.",
        tone: "alert",
      };
  }
}

export function marketplaceDisplayRows(view: ReportView): Array<{
  destination: string;
  scheme: string;
  amount: string;
  currency: string;
}> {
  return view.executiveSummary.marketplaceActivity.map((row) => {
    const match = view.schemeSummaries.find(
      (s) =>
        s.sourceTaxReportingScheme === row.scheme &&
        s.currency === row.currency &&
        s.taxCollectionResponsibility === "MARKETPLACE",
    );
    return {
      destination: match?.salesDestination ?? "—",
      scheme: row.scheme,
      amount: row.amount,
      currency: row.currency,
    };
  });
}

export function refundTotalForCurrency(view: ReportView, currency: string): string | null {
  const row = view.transactionTypeSummaries.find(
    (r) => r.transactionType === "REFUND" && r.currency === currency,
  );
  return row?.activityIncl ?? null;
}

export function reviewNotes(view: ReportView, status: ReconciliationStatus) {
  const reconciliationPassed = status === "READY" || status === "READY_WITH_WARNINGS";
  const duplicateWarnings = view.issues.filter(
    (i) => i.severity === "WARNING" && i.code === "DUPLICATE_TRANSACTION_IDENTIFIER",
  ).length;
  const rowsRemoved = rowsRemovedCount(view);
  return { reconciliationPassed, duplicateWarnings, rowsRemoved, issueCounts: view.executiveSummary.issueCounts };
}

/* ------------------------------------------------------------------ *
 * Design primitives
 * ------------------------------------------------------------------ */

export function reportHeader(doc: Doc, s: CanonicalSheet, t: ReportTheme, view: ReportView) {
  const p = view.provenance;
  const period = parsePeriodLabel(p.sourceActivityPeriod || p.requestedPeriodLabel);
  const bandH = 82;

  doc.save().rect(0, 0, doc.page.width, bandH).fill(t.navy).restore();

  s.eyebrow("FiscorAI", s.left, 20, "#A8C5D8", s.width * 0.5);
  s.eyebrow("VAT Activity Report", s.left, 32, "#FFFFFF", s.width * 0.55);

  doc
    .font("Helvetica-Bold")
    .fontSize(30)
    .fillColor("#FFFFFF")
    .text(period.month, s.left, 48, { lineBreak: false });

  if (period.year) {
    doc
      .font("Helvetica")
      .fontSize(30)
      .fillColor("#A8C5D8")
      .text(period.year, s.left + doc.widthOfString(period.month) + 10, 48, { lineBreak: false });
  }

  const metaY = 52;
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor("#FFFFFFAA")
    .text(`Generated ${p.generatedAt.slice(0, 10)}`, s.left, metaY, {
      width: s.width,
      align: "right",
      lineBreak: false,
    });
  doc.text(`Report ${p.reportId}`, s.left, metaY + 12, { width: s.width, align: "right", lineBreak: false });

  s.y = bandH + 18;
}

export function sectionHeader(
  doc: Doc,
  s: CanonicalSheet,
  t: ReportTheme,
  eyebrow: string,
  title: string,
  note?: string,
) {
  s.eyebrow(eyebrow, s.left, s.y, t.muted, s.width);
  s.y += 11;
  doc.font("Helvetica-Bold").fontSize(13).fillColor(t.ink).text(title, s.left, s.y, { lineBreak: false });
  s.y += note ? 17 : 14;
  if (note) {
    doc.font("Helvetica").fontSize(8.5).fillColor(t.muted).text(note, s.left, s.y, { width: s.width * 0.92 });
    s.y += doc.heightOfString(note, { width: s.width * 0.92 }) + 8;
  }
}

export function metricStrip(
  doc: Doc,
  s: CanonicalSheet,
  t: ReportTheme,
  metrics: Array<[string, string]>,
) {
  const count = metrics.length;
  const h = 50;
  const colW = s.width / count;
  s.surfaceStroke(s.left, s.y, s.width, h, t.surface, t.ruleSoft);

  metrics.forEach(([label, value], i) => {
    const x = s.left + colW * i;
    if (i > 0) {
      doc
        .save()
        .lineWidth(0.5)
        .strokeColor(t.ruleSoft)
        .moveTo(x, s.y + 10)
        .lineTo(x, s.y + h - 10)
        .stroke()
        .restore();
    }
    s.eyebrow(label, x + 10, s.y + 11, t.muted, colW - 14);
    doc
      .font("Helvetica-Bold")
      .fontSize(15)
      .fillColor(t.ink)
      .text(value, x + 10, s.y + 24, { width: colW - 14, lineBreak: false });
  });

  s.y += h + 14;
}

export function statusBadge(doc: Doc, s: CanonicalSheet, t: ReportTheme, status: ReconciliationStatus, view: ReportView) {
  const pres = statusPresentation(status, view);
  const fill = pres.tone === "success" ? t.successWash : pres.tone === "warning" ? t.warningWash : t.alertWash;
  const accent = pres.tone === "success" ? t.success : pres.tone === "warning" ? t.warning : t.alert;
  const pad = 16;
  const innerW = s.width - pad * 2 - 4;

  doc.font("Helvetica-Bold").fontSize(11);
  const titleH = doc.heightOfString(pres.title, { width: innerW });
  doc.font("Helvetica").fontSize(8.5);
  const bodyH = doc.heightOfString(pres.body, { width: innerW });
  const boxH = 12 + 12 + titleH + 5 + bodyH + 12;

  s.surfaceStroke(s.left, s.y, s.width, boxH, fill, t.ruleSoft);
  doc.save().rect(s.left, s.y, 3, boxH).fill(accent).restore();

  s.eyebrow(pres.eyebrow, s.left + pad, s.y + 12, accent);
  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor(t.ink)
    .text(pres.title, s.left + pad, s.y + 24, { width: innerW });
  doc
    .font("Helvetica")
    .fontSize(8.5)
    .fillColor(t.body)
    .text(pres.body, s.left + pad, s.y + 24 + titleH + 5, { width: innerW });

  s.y += boxH + 14;
}

export function financialHero(
  doc: Doc,
  s: CanonicalSheet,
  t: ReportTheme,
  label: string,
  amount: string,
  currency: string,
  caption: string,
) {
  const boxH = 84;
  s.surfaceStroke(s.left, s.y, s.width, boxH, t.surface, t.ruleSoft);
  doc.save().rect(s.left, s.y, s.width, 4).fill(t.navy).restore();
  doc.save().rect(s.left, s.y + 4, 4, boxH - 4).fill(t.accent).restore();

  s.eyebrow(label, s.left + 20, s.y + 16, t.muted);
  doc
    .font("Helvetica-Bold")
    .fontSize(30)
    .fillColor(t.navy)
    .text(displayMoney(amount, currency), s.left + 20, s.y + 32, { lineBreak: false });
  doc
    .font("Helvetica")
    .fontSize(8.5)
    .fillColor(t.muted)
    .text(caption, s.left + 20, s.y + 64, { lineBreak: false });

  s.y += boxH + 14;
}

export function schemeBadge(doc: Doc, x: number, y: number, t: ReportTheme, scheme: string) {
  doc.font("Helvetica-Bold").fontSize(6.8);
  const w = Math.min(doc.widthOfString(scheme) + 14, 130);
  doc.save().fillColor(t.accentSoft).rect(x, y, w, 15).fill().restore();
  doc.fillColor(t.accent).text(scheme, x + 7, y + 4, {
    width: w - 10,
    lineBreak: false,
  });
  return w;
}

export function marketplaceSection(doc: Doc, s: CanonicalSheet, t: ReportTheme, rows: ReturnType<typeof marketplaceDisplayRows>) {
  if (!rows.length) return;

  sectionHeader(doc, s, t, "Responsibility", "Marketplace-responsible activity");

  for (const row of rows) {
    const rowH = 40;
    s.surfaceStroke(s.left, s.y, s.width, rowH, t.marketplaceWash, t.ruleSoft);
    doc.save().rect(s.left, s.y, 3, rowH).fill(t.accent).restore();

    doc.font("Helvetica-Bold").fontSize(10).fillColor(t.ink).text(row.destination, s.left + 16, s.y + 8, {
      width: 140,
      lineBreak: false,
    });
    doc.font("Helvetica").fontSize(7.5).fillColor(t.muted).text(row.currency, s.left + 16, s.y + 23, {
      lineBreak: false,
    });

    schemeBadge(doc, s.left + 160, s.y + 12, t, row.scheme);

    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor(t.navy)
      .text(displayMoney(row.amount, row.currency), s.left, s.y + 12, {
        width: s.width - 16,
        align: "right",
        lineBreak: false,
      });

    s.y += rowH + 8;
  }

  s.gap(4);
}

export function currencyChips(doc: Doc, s: CanonicalSheet, t: ReportTheme, currencies: string[]) {
  s.eyebrow("Currencies", s.left, s.y, t.muted);
  s.y += 12;

  let x = s.left;
  for (const cur of currencies) {
    const chipW = doc.widthOfString(cur) + 18;
    doc.save().fillColor(t.wash).rect(x, s.y, chipW, 18).fill().restore();
    doc.font("Helvetica-Bold").fontSize(8).fillColor(t.ink).text(cur, x + 9, s.y + 5, { lineBreak: false });
    x += chipW + 8;
  }

  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(t.muted)
    .text("No FX conversion", s.left, s.y + 5, { width: s.width, align: "right", lineBreak: false });

  s.y += 26;
}

export function reportIntegrityStrip(doc: Doc, s: CanonicalSheet, t: ReportTheme, view: ReportView, status: ReconciliationStatus) {
  const passed = status === "READY" || status === "READY_WITH_WARNINGS";
  const items: Array<[string, string]> = [
    ["Source rows", String(view.executiveSummary.sourceRecords)],
    ["Reconciliation", passed ? "Passed" : "Failed"],
    ["Currencies", String(view.executiveSummary.currencies.length)],
    ["FX conversion", "None"],
  ];

  s.eyebrow("Report integrity", s.left, s.y, t.muted);
  s.y += 12;

  const h = 42;
  const colW = s.width / items.length;
  s.surfaceStroke(s.left, s.y, s.width, h, t.surface, t.ruleSoft);

  items.forEach(([label, value], i) => {
    const x = s.left + colW * i;
    if (i > 0) {
      doc
        .save()
        .lineWidth(0.5)
        .strokeColor(t.ruleSoft)
        .moveTo(x, s.y + 8)
        .lineTo(x, s.y + h - 8)
        .stroke()
        .restore();
    }
    s.eyebrow(label, x + 10, s.y + 9, t.muted, colW - 14);
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(t.ink)
      .text(value, x + 10, s.y + 22, { width: colW - 14, lineBreak: false });
  });

  s.y += h + 8;
}

export function dataTableHead(doc: Doc, s: CanonicalSheet, t: ReportTheme, columns: TableColumn[]) {
  doc.save().rect(s.left, s.y, s.width, PAGE.headH).fill(t.navy).restore();
  let x = s.left;
  columns.forEach((col) => {
    doc
      .font("Helvetica-Bold")
      .fontSize(7)
      .fillColor("#FFFFFFD9")
      .text(col.label, x + 8, s.y + 6.5, {
        width: col.width - 12,
        align: col.align || "left",
        lineBreak: false,
      });
    x += col.width;
  });
  s.y += PAGE.headH;
}

export function dataTableRow(
  doc: Doc,
  s: CanonicalSheet,
  t: ReportTheme,
  columns: TableColumn[],
  cells: string[],
  style: TableRowStyle = {},
) {
  const rowH = style.rowH ?? PAGE.rowH;
  if (style.marketplace) {
    doc.save().rect(s.left, s.y, s.width, rowH).fill(t.marketplaceWash).restore();
  } else if (style.band) {
    doc.save().rect(s.left, s.y, s.width, rowH).fill(t.wash).restore();
  }

  let x = s.left;
  cells.forEach((cell, i) => {
    const col = columns[i]!;
    const align = col.align || "left";
    const isScheme = style.schemeEmphasis && i === 0;
    const font = col.mono ? "Courier" : isScheme || style.bold ? "Helvetica-Bold" : "Helvetica";
    const color = style.negative?.[i]
      ? t.alert
      : style.muted?.[i]
        ? t.muted
        : isScheme || style.bold
          ? t.ink
          : t.body;

    doc.font(font).fontSize(col.mono ? 7.5 : isScheme ? 8.4 : 8.5).fillColor(color).text(cell, x + 8, s.y + 5.5, {
      width: col.width - 12,
      align,
      lineBreak: false,
    });
    x += col.width;
  });

  s.y += rowH;
  // Hairline separator without extra vertical advance (keeps tables compact).
  doc
    .save()
    .lineWidth(0.35)
    .strokeColor(t.ruleSoft)
    .moveTo(s.left, s.y)
    .lineTo(s.right, s.y)
    .stroke()
    .restore();
}

export function currencyTotalStrip(
  doc: Doc,
  s: CanonicalSheet,
  t: ReportTheme,
  currency: string,
  activity: string,
  base: string,
  vat: string,
) {
  const h = 30;
  doc.save().rect(s.left, s.y, s.width, h).fill(t.navy).restore();
  doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#FFFFFF").text(currency, s.left + 12, s.y + 10, { lineBreak: false });

  const parts = [
    `Activity ${displayMoney(activity, currency)}`,
    `Base ${displayMoney(base, currency)}`,
    `VAT ${displayMoney(vat, currency)}`,
  ];
  doc
    .font("Helvetica")
    .fontSize(8.5)
    .fillColor("#FFFFFFCC")
    .text(parts.join("    "), s.left + 52, s.y + 10, { width: s.width - 64, align: "right", lineBreak: false });

  s.y += h + 14;
}

export function currencySection(
  doc: Doc,
  s: CanonicalSheet,
  t: ReportTheme,
  currency: string,
  rows: SchemeSummaryRow[],
  total: { activityIncl: string; activityExcl: string; vat: string } | undefined,
  columns: TableColumn[],
  continued = false,
) {
  const sectionH = 42 + PAGE.headH + rows.length * (PAGE.rowH + 6) + 44;
  if (s.ensure(sectionH)) {
    sectionHeader(doc, s, t, "Tax activity", continued ? `${currency} activity (continued)` : `${currency} activity`);
  } else {
    doc.font("Helvetica-Bold").fontSize(11).fillColor(t.navy).text(`${currency} activity${continued ? " (continued)" : ""}`, s.left, s.y, {
      lineBreak: false,
    });
    s.y += 16;
    doc.save().rect(s.left, s.y, 28, 2).fill(t.accent).restore();
    s.y += 10;
  }

  dataTableHead(doc, s, t, columns);

  rows.forEach((row, idx) => {
    if (s.ensure(PAGE.rowH + PAGE.headH + 8)) {
      dataTableHead(doc, s, t, columns);
    }
    const neg = Number(row.activityIncl) < 0;
    const isMarketplace = row.taxCollectionResponsibility.toUpperCase() === "MARKETPLACE";
    dataTableRow(
      doc,
      s,
      t,
      columns,
      [
        row.sourceTaxReportingScheme,
        responsibilityLabel(row.taxCollectionResponsibility),
        row.salesDestination,
        displayMoneyPlain(row.activityIncl, row.currency),
        row.activityExcl === "0.00" ? "0.00" : displayMoneyPlain(row.activityExcl, row.currency),
        displayMoneyPlain(row.vat, row.currency),
        String(row.transactionCount),
      ],
      {
        schemeEmphasis: true,
        marketplace: isMarketplace,
        band: !isMarketplace && idx % 2 === 1,
        muted: [false, true, false, false, false, false, false],
        negative: [false, false, false, neg, false, false, false],
      },
    );
  });

  if (total) {
    currencyTotalStrip(doc, s, t, currency, total.activityIncl, total.activityExcl, total.vat);
  } else {
    s.gap(8);
  }
}

export function reportFooter(doc: Doc, t: ReportTheme, periodLabel: string, reportId: string, page: number, total: number) {
  doc.page.margins.bottom = 0;
  const left = PAGE.margin;
  const width = doc.page.width - PAGE.margin * 2;
  const y = doc.page.height - PAGE.footer + 6;

  doc
    .save()
    .lineWidth(0.5)
    .strokeColor(t.rule)
    .moveTo(left, y)
    .lineTo(left + width, y)
    .stroke()
    .restore();

  doc
    .font("Helvetica")
    .fontSize(7.5)
    .fillColor(t.muted)
    .text(`${periodLabel}  •  FiscorAI Report ${reportId}`, left, y + 8, { width: width * 0.78, lineBreak: false });

  doc.text(`${page} / ${total}`, left, y + 8, { width, align: "right", lineBreak: false });
}

export const ACTIVITY_COLUMNS: TableColumn[] = [
  { label: "Scheme", width: 102, align: "left" },
  { label: "Responsibility", width: 78, align: "left" },
  { label: "Destination", width: 88, align: "left" },
  { label: "Activity incl.", width: 66, align: "right" },
  { label: "Base", width: 56, align: "right" },
  { label: "VAT", width: 56, align: "right" },
  { label: "Txns", width: 39, align: "right" },
];

export const VAT_RATE_COLUMNS: TableColumn[] = [
  { label: "Scheme", width: 102, align: "left" },
  { label: "Jurisdiction", width: 92, align: "left" },
  { label: "Rate", width: 44, align: "right" },
  { label: "Activity", width: 72, align: "right" },
  { label: "Base", width: 68, align: "right" },
  { label: "VAT", width: 68, align: "right" },
];

export const REFUND_COLUMNS: TableColumn[] = [
  { label: "Event ID", width: 220, align: "left", mono: true },
  { label: "Destination", width: 140, align: "left" },
  { label: "Amount", width: 87, align: "right" },
];

export const MOVEMENT_COLUMNS: TableColumn[] = [
  { label: "Type", width: 88, align: "left" },
  { label: "Event ID", width: 188, align: "left", mono: true },
  { label: "Qty", width: 36, align: "right" },
  { label: "Departure", width: 68, align: "left" },
  { label: "Arrival", width: 67, align: "left" },
];

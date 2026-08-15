import PDFDocument from "pdfkit";
import type { ProcessedReport, TransactionRow } from "./types.js";

/* ------------------------------------------------------------------ *
 * Theme
 * ------------------------------------------------------------------ */

export type PdfTheme = {
  ink: string;
  body: string;
  muted: string;
  rule: string;
  ruleSoft: string;
  wash: string;
  tint: string;
  alert: string;
  alertWash: string;
  scheme: Record<string, string>;
};

export const DEFAULT_THEME: PdfTheme = {
  ink: "#10202F",
  body: "#2B3A48",
  muted: "#6B7A88",
  rule: "#D5DDE5",
  ruleSoft: "#E9EEF3",
  wash: "#F4F7FA",
  tint: "#EFF5F2",
  alert: "#9C3B12",
  alertWash: "#FBF2EC",
  scheme: {
    "UNION-OSS": "#1D5C8A",
    REGULAR: "#146B57",
    VOEC: "#6A4A93",
    EMPTY: "#77858F",
  },
};

export type PdfOptions = {
  /** Company or filer name shown in the masthead eyebrow. */
  filerName?: string;
  /** One line under the title. */
  subtitle?: string;
  theme?: Partial<PdfTheme>;
  /** Include the per VAT rate appendix. Default true. */
  vatDetail?: boolean;
  /** Languages for the plan notice. Default all five. */
  noticeLanguages?: Array<"en" | "es" | "de" | "fr" | "it">;
};

export const SCHEME_TITLES: Record<string, string> = {
  "UNION-OSS": "Union OSS",
  REGULAR: "Regular",
  VOEC: "VOEC",
  EMPTY: "Non-classified",
};

const SCHEME_NOTES: Record<string, string> = {
  "UNION-OSS": "Cross-border B2C sales declared through the One Stop Shop return.",
  REGULAR: "Domestic and local-registration sales, declared in each country's own return.",
  VOEC: "Low-value goods declared under the Norwegian VOEC scheme.",
  EMPTY: "Rows with no reporting scheme in the source file. Review these before filing.",
};

const SCHEME_ORDER = ["UNION-OSS", "REGULAR", "VOEC", "EMPTY"];

/* ------------------------------------------------------------------ *
 * Geometry
 * ------------------------------------------------------------------ */

const PAGE = { margin: 44, footer: 54 };
const COLS = { country: 155, total: 92, base: 92, vat: 92, currency: 76 };
const HEAD_H = 19;
const ROW_H = 17;

type Doc = PDFKit.PDFDocument;

/* ------------------------------------------------------------------ *
 * Formatting: fixed, so output never drifts with the host locale
 * ------------------------------------------------------------------ */

function num(n: number): string {
  const neg = n < 0;
  const [whole, frac] = Math.abs(n).toFixed(2).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${neg ? "-" : ""}${grouped}.${frac}`;
}

function int(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function rateLabel(raw: string | number): string {
  const s = String(raw ?? "").trim();
  if (!s || s.toUpperCase() === "ALL") return "Unrated";
  const dash = s.lastIndexOf("-");
  const tail = dash >= 0 ? s.slice(dash + 1) : s;
  const n = Number(tail);
  return Number.isFinite(n) ? `${n}%` : s;
}

/* ------------------------------------------------------------------ *
 * Data shaping
 * ------------------------------------------------------------------ */

type Money = { total: number; base: number; vat: number };
type Line = Money & { country: string; currency: string };
type VatLine = Line & { rate: string };

type Section = {
  scheme: string;
  lines: Line[];
  subtotals: Map<string, Money>;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function bump(m: Map<string, Money>, currency: string, v: Money) {
  const cur = m.get(currency) || { total: 0, base: 0, vat: 0 };
  cur.total = round2(cur.total + v.total);
  cur.base = round2(cur.base + v.base);
  cur.vat = round2(cur.vat + v.vat);
  m.set(currency, cur);
}

function collect(report: ProcessedReport) {
  const sections = new Map<string, Section>();
  const vatLines = new Map<string, VatLine[]>();
  const grand = new Map<string, Money>();
  const countries = new Set<string>();

  for (const c of report.countries) {
    for (const cat of c.transactionCategories) {
      const all = cat.ALL?.[0];
      if (!all) continue;

      countries.add(c.country);

      const section =
        sections.get(cat.category) ||
        ({ scheme: cat.category, lines: [], subtotals: new Map() } as Section);

      const line: Line = {
        country: c.country,
        total: all.total,
        base: all.base,
        vat: all.vat,
        currency: all.currency || "EUR",
      };
      section.lines.push(line);
      bump(section.subtotals, line.currency, line);
      bump(grand, line.currency, line);
      sections.set(cat.category, section);

      const detail = (cat.VAT || []) as TransactionRow[];
      if (detail.length) {
        const list = vatLines.get(cat.category) || [];
        for (const r of detail) {
          list.push({
            country: c.country,
            rate: rateLabel(r.vat_percentage),
            total: r.total,
            base: r.base,
            vat: r.vat,
            currency: r.currency || "EUR",
          });
        }
        vatLines.set(cat.category, list);
      }
    }
  }

  for (const s of sections.values()) {
    s.lines.sort(
      (a, b) => a.currency.localeCompare(b.currency) || a.country.localeCompare(b.country),
    );
  }

  const ordered = [
    ...SCHEME_ORDER.filter((k) => sections.has(k)).map((k) => sections.get(k)!),
    ...[...sections.values()].filter((s) => !SCHEME_ORDER.includes(s.scheme)),
  ];

  return { sections: ordered, vatLines, grand, countryCount: countries.size };
}

/* ------------------------------------------------------------------ *
 * Layout engine
 * ------------------------------------------------------------------ */

class Sheet {
  y: number;
  readonly left: number;
  readonly right: number;
  readonly width: number;
  readonly bottom: number;

  constructor(private doc: Doc) {
    this.left = PAGE.margin;
    this.width = doc.page.width - PAGE.margin * 2;
    this.right = this.left + this.width;
    this.bottom = doc.page.height - PAGE.footer;
    this.y = PAGE.margin;
  }

  /** Reserve vertical space, breaking to a new page when it will not fit. */
  ensure(height: number): boolean {
    if (this.y + height <= this.bottom) return false;
    this.doc.addPage();
    this.y = PAGE.margin;
    return true;
  }

  rule(color: string, thickness = 0.6) {
    this.doc
      .save()
      .lineWidth(thickness)
      .strokeColor(color)
      .moveTo(this.left, this.y)
      .lineTo(this.right, this.y)
      .stroke()
      .restore();
  }

  gap(h: number) {
    this.y += h;
  }

  /** Small letterspaced label: the utility voice of the document. */
  eyebrow(
    text: string,
    x: number,
    y: number,
    color: string,
    width?: number,
    align: "left" | "right" = "left",
  ) {
    this.doc
      .font("Helvetica-Bold")
      .fontSize(6.8)
      .fillColor(color)
      .text(text.toUpperCase(), x, y, {
        width,
        align,
        characterSpacing: 0.9,
        lineBreak: false,
      });
  }
}

/* ------------------------------------------------------------------ *
 * Entry point
 * ------------------------------------------------------------------ */

export async function buildPdf(
  report: ProcessedReport,
  options: PdfOptions = {},
): Promise<Buffer> {
  const theme: PdfTheme = {
    ...DEFAULT_THEME,
    ...options.theme,
    scheme: { ...DEFAULT_THEME.scheme, ...(options.theme?.scheme || {}) },
  };

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: PAGE.margin,
      bufferPages: true,
      info: {
        Title: `VAT transaction report ${report.meta.periodLabel}`,
        Author: options.filerName || "VAT reporting",
        Subject: "Indirect tax compliance summary",
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const data = collect(report);
    const sheet = new Sheet(doc);

    masthead(doc, sheet, theme, report, options);
    if (report.meta.truncated && report.meta.planLimit != null) {
      notice(doc, sheet, theme, report.meta.planLimit, options.noticeLanguages, report.meta.totalRows);
    }
    glance(doc, sheet, theme, report, data);

    if (!data.sections.length) {
      empty(doc, sheet, theme);
    } else {
      for (const section of data.sections) schemeSection(doc, sheet, theme, section);
      grandTotals(doc, sheet, theme, data.grand);
      if (options.vatDetail !== false) vatAppendix(doc, sheet, theme, data);
    }

    footers(doc, theme, report);
    doc.end();
  });
}

/* ------------------------------------------------------------------ *
 * Blocks
 * ------------------------------------------------------------------ */

function masthead(
  doc: Doc,
  s: Sheet,
  t: PdfTheme,
  report: ProcessedReport,
  options: PdfOptions,
) {
  doc.rect(s.left, s.y, 46, 3).fill(t.ink);
  s.y += 14;

  s.eyebrow(options.filerName || "VAT transaction report", s.left, s.y, t.muted);
  s.y += 13;

  doc
    .font("Helvetica-Bold")
    .fontSize(23)
    .fillColor(t.ink)
    .text(report.meta.periodLabel, s.left, s.y, { lineBreak: false });

  doc
    .font("Helvetica")
    .fontSize(8.5)
    .fillColor(t.muted)
    .text(`Generated ${new Date().toISOString().slice(0, 10)}`, s.left, s.y + 8, {
      width: s.width,
      align: "right",
      lineBreak: false,
    });

  s.y += 32;

  const subtitle =
    options.subtitle || "Taxable activity by country and reporting scheme";
  doc.font("Helvetica").fontSize(9).fillColor(t.body).text(subtitle, s.left, s.y, {
    width: s.width * 0.7,
  });
  s.y += doc.heightOfString(subtitle, { width: s.width * 0.7 }) + 8;

  s.rule(t.ink, 0.9);
  s.gap(16);
}

const NOTICE_TEXT: Record<string, (n: string, total: string) => string> = {
  en: (n, total) =>
    `This report covers ${n} / ${total} transactions in the file. Move to a higher plan to process the full period.`,
  es: (n, total) =>
    `Este informe cubre ${n} / ${total} transacciones del archivo. Contrate un plan superior para procesar el periodo completo.`,
  de: (n, total) =>
    `Dieser Bericht umfasst ${n} / ${total} Transaktionen der Datei. Für den vollständigen Zeitraum schließen Sie bitte einen höheren Tarif ab.`,
  fr: (n, total) =>
    `Ce rapport couvre ${n} / ${total} transactions du fichier. Souscrivez un plan supérieur pour traiter la période complète.`,
  it: (n, total) =>
    `Questo report copre ${n} / ${total} transazioni del file. Attiva un piano superiore per elaborare l'intero periodo.`,
};

function notice(
  doc: Doc,
  s: Sheet,
  t: PdfTheme,
  limit: number,
  langs: PdfOptions["noticeLanguages"] = ["en", "es", "de", "fr", "it"],
  totalRows?: number,
) {
  const n = int(limit);
  const total = int(totalRows ?? limit);
  const head = NOTICE_TEXT.en(n, total);
  const rest = langs.filter((l) => l !== "en").map((l) => NOTICE_TEXT[l](n, total));

  const padX = 16;
  const innerW = s.width - padX - 18;

  doc.font("Helvetica-Bold").fontSize(9);
  const headH = doc.heightOfString(head, { width: innerW });
  doc.font("Helvetica").fontSize(7.6);
  const restH = rest.reduce(
    (acc, line) => acc + doc.heightOfString(line, { width: innerW }) + 3,
    0,
  );
  const boxH = 12 + 12 + headH + (rest.length ? 8 + restH : 0) + 10;

  s.ensure(boxH + 10);

  doc.rect(s.left, s.y, s.width, boxH).fill(t.alertWash);
  doc.rect(s.left, s.y, 2.5, boxH).fill(t.alert);

  let y = s.y + 12;
  s.eyebrow("Partial report", s.left + padX, y, t.alert);
  y += 13;

  doc.font("Helvetica-Bold").fontSize(9).fillColor(t.ink).text(head, s.left + padX, y, {
    width: innerW,
  });
  y += headH + (rest.length ? 8 : 0);

  doc.font("Helvetica").fontSize(7.6).fillColor(t.muted);
  for (const line of rest) {
    doc.text(line, s.left + padX, y, { width: innerW });
    y += doc.heightOfString(line, { width: innerW }) + 3;
  }

  s.y += boxH + 20;
}

function glance(
  doc: Doc,
  s: Sheet,
  t: PdfTheme,
  report: ProcessedReport,
  data: ReturnType<typeof collect>,
) {
  const primary = [...data.grand.entries()].sort((a, b) => b[1].total - a[1].total)[0];

  const cells: Array<[string, string, string?]> = [
    ["Transactions in file", int(report.meta.totalRows)],
    [
      "Processed",
      int(report.meta.processedRows),
      report.meta.truncated ? `of ${int(report.meta.totalRows)}` : undefined,
    ],
    ["Countries", int(data.countryCount)],
    ["VAT collected", primary ? num(primary[1].vat) : "0.00", primary ? primary[0] : undefined],
  ];

  const h = 52;
  s.ensure(h + 8);
  const cw = s.width / cells.length;

  doc.rect(s.left, s.y, s.width, h).fill(t.wash);

  cells.forEach(([label, value, note], i) => {
    const x = s.left + cw * i;
    if (i > 0) {
      doc
        .save()
        .lineWidth(0.6)
        .strokeColor(t.rule)
        .moveTo(x, s.y + 11)
        .lineTo(x, s.y + h - 11)
        .stroke()
        .restore();
    }
    s.eyebrow(label, x + 14, s.y + 12, t.muted, cw - 20);
    doc
      .font("Helvetica-Bold")
      .fontSize(15)
      .fillColor(t.ink)
      .text(value, x + 14, s.y + 25, { width: cw - 20, lineBreak: false });
    if (note) {
      const vw = doc.widthOfString(value);
      doc
        .font("Helvetica")
        .fontSize(7.5)
        .fillColor(t.muted)
        .text(note, x + 14 + vw + 5, s.y + 34, { width: cw - 24 - vw, lineBreak: false });
    }
  });

  s.y += h + 26;
}

function sectionHeader(doc: Doc, s: Sheet, t: PdfTheme, section: Section) {
  const color = t.scheme[section.scheme] || t.ink;
  const title = SCHEME_TITLES[section.scheme] || section.scheme;
  const note = SCHEME_NOTES[section.scheme];

  s.ensure(HEAD_H + ROW_H * 2 + (note ? 46 : 32));

  doc.rect(s.left, s.y + 2, 7, 7).fill(color);
  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .fillColor(t.ink)
    .text(title, s.left + 15, s.y, { lineBreak: false });

  const countries = new Set(section.lines.map((l) => l.country)).size;
  s.eyebrow(
    `${countries} ${countries === 1 ? "country" : "countries"}`,
    s.left,
    s.y + 4,
    t.muted,
    s.width,
    "right",
  );

  s.y += 16;
  if (note) {
    doc.font("Helvetica").fontSize(8).fillColor(t.muted).text(note, s.left + 15, s.y, {
      width: s.width - 15,
    });
    s.y += doc.heightOfString(note, { width: s.width - 15 }) + 6;
  }
  s.y += 2;
}

/** Repeated header for a table that spilled onto a new page. */
function continuedHead(
  doc: Doc,
  s: Sheet,
  t: PdfTheme,
  label: string,
  first: string,
  extra?: string,
) {
  s.eyebrow(`${label} continued`, s.left, s.y, t.muted, s.width);
  s.gap(13);
  return tableHead(doc, s, t, first, extra);
}

function tableHead(doc: Doc, s: Sheet, t: PdfTheme, first: string, extra?: string) {
  const widths = extra
    ? [COLS.country - 46, 46, COLS.total, COLS.base, COLS.vat, COLS.currency]
    : [COLS.country, COLS.total, COLS.base, COLS.vat, COLS.currency];
  const labels = extra
    ? [first, extra, "Total", "Net", "VAT", "Cur"]
    : [first, "Total", "Net", "VAT", "Cur"];

  doc.rect(s.left, s.y, s.width, HEAD_H).fill(t.ink);

  let x = s.left;
  labels.forEach((label, i) => {
    const align: "left" | "right" = i === 0 || (extra && i === 1) ? "left" : "right";
    s.eyebrow(label, x + 8, s.y + 6.5, "#FFFFFF", widths[i] - 16, align);
    x += widths[i];
  });

  s.y += HEAD_H;
  return widths;
}

function tableRow(
  doc: Doc,
  s: Sheet,
  t: PdfTheme,
  widths: number[],
  cells: string[],
  opts: { bold?: boolean; negative?: boolean[]; band?: boolean } = {},
) {
  const vatIndex = widths.length - 2;

  if (opts.band) {
    doc.rect(s.left, s.y, s.width, ROW_H).fill(t.wash);
  } else {
    const vx = s.left + widths.slice(0, vatIndex).reduce((a, b) => a + b, 0);
    doc.rect(vx, s.y, widths[vatIndex], ROW_H).fill(t.tint);
  }

  doc.font(opts.bold ? "Helvetica-Bold" : "Helvetica").fontSize(8.6);

  let x = s.left;
  cells.forEach((cell, i) => {
    const align: "left" | "right" =
      i === 0 || (widths.length === 6 && i === 1) ? "left" : "right";
    doc
      .fillColor(opts.negative?.[i] ? t.alert : opts.bold ? t.ink : t.body)
      .text(cell, x + 8, s.y + 5, { width: widths[i] - 16, align, lineBreak: false });
    x += widths[i];
  });

  s.y += ROW_H;
  s.rule(t.ruleSoft);
}

function moneyRow(
  doc: Doc,
  s: Sheet,
  t: PdfTheme,
  widths: number[],
  head: string[],
  v: Money & { currency: string },
  bold = false,
) {
  tableRow(doc, s, t, widths, [...head, num(v.total), num(v.base), num(v.vat), v.currency], {
    bold,
    band: bold,
    negative: [...head.map(() => false), v.total < 0, v.base < 0, v.vat < 0, false],
  });
}

function schemeSection(doc: Doc, s: Sheet, t: PdfTheme, section: Section) {
  const label = SCHEME_TITLES[section.scheme] || section.scheme;
  sectionHeader(doc, s, t, section);

  let widths = tableHead(doc, s, t, "Country");
  const resume = () => continuedHead(doc, s, t, label, "Country");
  const multi = section.subtotals.size > 1;

  for (const [cur, subtotal] of section.subtotals) {
    if (multi) {
      if (s.ensure(ROW_H * 2 + 24)) widths = resume();
      s.gap(6);
      s.eyebrow(`Reported in ${cur}`, s.left + 8, s.y, t.muted, s.width);
      s.gap(12);
    }

    for (const line of section.lines.filter((l) => l.currency === cur)) {
      if (s.ensure(ROW_H + 6)) widths = resume();
      moneyRow(doc, s, t, widths, [line.country], line);
    }

    if (s.ensure(ROW_H + 6)) widths = resume();
    s.rule(t.ink, 0.8);
    moneyRow(doc, s, t, widths, [`Subtotal ${cur}`], { ...subtotal, currency: cur }, true);
  }

  s.gap(24);
}

function grandTotals(doc: Doc, s: Sheet, t: PdfTheme, grand: Map<string, Money>) {
  s.ensure(HEAD_H + ROW_H * grand.size + 60);

  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .fillColor(t.ink)
    .text("All schemes", s.left, s.y, { lineBreak: false });
  s.y += 16;

  const note =
    "Totals stay separate per currency. Convert with your filing rate before submitting a return.";
  doc.font("Helvetica").fontSize(8).fillColor(t.muted).text(note, s.left, s.y, {
    width: s.width,
  });
  s.y += doc.heightOfString(note, { width: s.width }) + 8;

  const widths = tableHead(doc, s, t, "Currency");
  for (const [cur, v] of [...grand.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    moneyRow(doc, s, t, widths, [cur], { ...v, currency: cur }, true);
  }
  s.gap(22);
}

function vatAppendix(doc: Doc, s: Sheet, t: PdfTheme, data: ReturnType<typeof collect>) {
  const schemes = data.sections.filter((sec) => (data.vatLines.get(sec.scheme) || []).length);
  if (!schemes.length) return;

  s.ensure(90);
  s.rule(t.rule);
  s.gap(16);
  s.eyebrow("Appendix", s.left, s.y, t.muted);
  s.y += 13;
  doc
    .font("Helvetica-Bold")
    .fontSize(14)
    .fillColor(t.ink)
    .text("Breakdown by VAT rate", s.left, s.y, { lineBreak: false });
  s.y += 26;

  for (const sec of schemes) {
    const lines = (data.vatLines.get(sec.scheme) || [])
      .slice()
      .sort(
        (a, b) =>
          a.country.localeCompare(b.country) ||
          a.rate.localeCompare(b.rate, undefined, { numeric: true }),
      );

    s.ensure(HEAD_H + ROW_H * 2 + 30);
    doc.rect(s.left, s.y + 2, 7, 7).fill(t.scheme[sec.scheme] || t.ink);
    doc
      .font("Helvetica-Bold")
      .fontSize(10.5)
      .fillColor(t.ink)
      .text(SCHEME_TITLES[sec.scheme] || sec.scheme, s.left + 15, s.y, { lineBreak: false });
    s.y += 18;

    const label = SCHEME_TITLES[sec.scheme] || sec.scheme;
    let widths = tableHead(doc, s, t, "Country", "Rate");
    for (const line of lines) {
      if (s.ensure(ROW_H + 6)) widths = continuedHead(doc, s, t, label, "Country", "Rate");
      moneyRow(doc, s, t, widths, [line.country, line.rate], line);
    }
    s.gap(20);
  }
}

function empty(doc: Doc, s: Sheet, t: PdfTheme) {
  doc.rect(s.left, s.y, s.width, 76).fill(t.wash);
  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor(t.ink)
    .text("No taxable activity in this period", s.left + 16, s.y + 22, { width: s.width - 32 });
  doc
    .font("Helvetica")
    .fontSize(8.5)
    .fillColor(t.muted)
    .text(
      "The file was read but contained no rows to report. Check that the export covers the right date range.",
      s.left + 16,
      s.y + 41,
      { width: s.width - 32 },
    );
  s.y += 92;
}

function footers(doc: Doc, t: PdfTheme, report: ProcessedReport) {
  const range = doc.bufferedPageRange();
  const left = PAGE.margin;

  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    // Footer text sits below the bottom margin. Without this, pdfkit treats it
    // as overflow and silently appends a blank page for every footer drawn.
    doc.page.margins.bottom = 0;

    const width = doc.page.width - PAGE.margin * 2;
    const y = doc.page.height - PAGE.footer + 8;

    doc
      .save()
      .lineWidth(0.6)
      .strokeColor(t.rule)
      .moveTo(left, y)
      .lineTo(left + width, y)
      .stroke()
      .restore();

    doc
      .font("Helvetica")
      .fontSize(7.5)
      .fillColor(t.muted)
      .text(
        `${report.meta.periodLabel}   ${int(report.meta.processedRows)} of ${int(report.meta.totalRows)} transactions processed   Confidential`,
        left,
        y + 9,
        { width: width * 0.75, lineBreak: false },
      );

    doc.text(`${i + 1} / ${range.count}`, left, y + 9, { width, align: "right" });
  }
}

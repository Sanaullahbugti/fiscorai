import PDFDocument from "pdfkit";
import type { CanonicalReportV2 } from "./canonical-types.js";
import {
  ACTIVITY_COLUMNS,
  CanonicalSheet,
  MOVEMENT_COLUMNS,
  PAGE,
  REFUND_COLUMNS,
  REPORT_THEME,
  VAT_RATE_COLUMNS,
  currencyChips,
  currencySection,
  dataTableHead,
  dataTableRow,
  displayMoney,
  financialHero,
  marketplaceDisplayRows,
  marketplaceSection,
  metricStrip,
  refundTotalForCurrency,
  reportFooter,
  reportHeader,
  reportIntegrityStrip,
  sectionHeader,
  statusBadge,
  type ReportTheme,
} from "./pdf-components.js";
import type { PdfOptions } from "./pdf.js";

export async function buildPdfFromCanonical(
  canonical: CanonicalReportV2,
  options: PdfOptions = {},
): Promise<Buffer> {
  const theme: ReportTheme = {
    ...REPORT_THEME,
    ...options.theme,
    scheme: { ...REPORT_THEME.scheme, ...(options.theme?.scheme || {}) },
  };
  const view = canonical.view;
  const p = view.provenance;
  const periodLabel = p.sourceActivityPeriod || p.requestedPeriodLabel;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 0,
      bufferPages: true,
      info: {
        Title: `VAT Activity Report ${periodLabel}`,
        Author: "FiscorAI",
        Subject: "VAT activity report",
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const s = new CanonicalSheet(doc, theme);
    s.paintPageBackground();

    /* ── Page 1: Executive report ─────────────────────────────────── */
    reportHeader(doc, s, theme, view);
    statusBadge(doc, s, theme, canonical.reconciliationStatus, view);

    const tx = view.executiveSummary.transactionTypes;
    metricStrip(doc, s, theme, [
      ["Source records", String(view.executiveSummary.sourceRecords)],
      ["Sales", String(tx.SALE || 0)],
      ["Refunds", String(tx.REFUND || 0)],
      ["Returns", String(tx.RETURN || 0)],
      ["FC transfers", String(tx.FC_TRANSFER || 0)],
    ]);

    const sellerVat = view.executiveSummary.sellerVatIdentified[0];
    if (sellerVat) {
      financialHero(
        doc,
        s,
        theme,
        "Seller VAT identified",
        sellerVat.amount,
        sellerVat.currency,
        `Source-reported seller VAT · ${sellerVat.currency}`,
      );
    }

    marketplaceSection(doc, s, theme, marketplaceDisplayRows(view));

    if (view.executiveSummary.currencies.length) {
      currencyChips(doc, s, theme, view.executiveSummary.currencies);
    }

    s.gap(6);
    reportIntegrityStrip(doc, s, theme, view, canonical.reconciliationStatus);

    /* ── Page 2: Tax activity by currency ───────────────────────── */
    doc.addPage();
    s.pageIndex += 1;
    s.paintPageBackground();
    s.y = PAGE.margin;

    sectionHeader(
      doc,
      s,
      theme,
      "Tax activity",
      "Activity by currency",
      "Totals remain separate per currency. No foreign-exchange conversion is applied.",
    );

    const currencies = [...view.executiveSummary.currencies].sort();
    for (const currency of currencies) {
      const rows = view.schemeSummaries.filter((r) => r.currency === currency);
      const total = view.totalsByCurrency.find((t) => t.currency === currency);
      currencySection(doc, s, theme, currency, rows, total, ACTIVITY_COLUMNS);
    }

    /* ── Page 3: VAT detail + refund activity ───────────────────── */
    doc.addPage();
    s.pageIndex += 1;
    s.paintPageBackground();
    s.y = PAGE.margin;

    if (view.vatRateBreakdown.length) {
      sectionHeader(doc, s, theme, "Detail", "VAT rate breakdown");
      dataTableHead(doc, s, theme, VAT_RATE_COLUMNS);

      for (const row of view.vatRateBreakdown) {
        if (s.ensure(PAGE.rowH + PAGE.headH + 8)) dataTableHead(doc, s, theme, VAT_RATE_COLUMNS);
        const rate = row.displayRate ?? "—";
        const rateMuted = rate === "—";
        dataTableRow(
          doc,
          s,
          theme,
          VAT_RATE_COLUMNS,
          [
            row.sourceTaxReportingScheme,
            row.jurisdiction,
            rate,
            displayMoney(row.activityIncl, row.currency).replace(` ${row.currency}`, ""),
            displayMoney(row.activityExcl, row.currency).replace(` ${row.currency}`, ""),
            displayMoney(row.vat, row.currency).replace(` ${row.currency}`, ""),
          ],
          {
            schemeEmphasis: true,
            muted: [false, false, rateMuted, false, false, false],
          },
        );
      }
      s.gap(16);
    }

    if (view.refundSummaries.length) {
      const refundCount = view.executiveSummary.transactionTypes.REFUND || view.refundSummaries.length;
      const eurRefundTotal = refundTotalForCurrency(view, "EUR");

      sectionHeader(doc, s, theme, "Refunds", "Refund activity");
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor(theme.body)
        .text(`${refundCount} transactions`, s.left, s.y, { lineBreak: false });
      if (eurRefundTotal) {
        doc
          .font("Helvetica-Bold")
          .fontSize(12)
          .fillColor(theme.alert)
          .text(displayMoney(eurRefundTotal, "EUR"), s.left, s.y, {
            width: s.width,
            align: "right",
            lineBreak: false,
          });
      }
      s.y += 18;

      dataTableHead(doc, s, theme, REFUND_COLUMNS);
      for (const row of view.refundSummaries) {
        if (s.ensure(PAGE.rowH + PAGE.headH + 8)) dataTableHead(doc, s, theme, REFUND_COLUMNS);
        dataTableRow(
          doc,
          s,
          theme,
          REFUND_COLUMNS,
          [
            row.transactionEventId || "—",
            row.salesDestination || "—",
            displayMoney(row.activityIncl, row.currency),
          ],
          { negative: [false, false, true] },
        );
      }
    }

    /* ── Page 4: Operational movements (intentional page) ───────── */
    if (view.movementSummaries.length) {
      doc.addPage();
      s.pageIndex += 1;
      s.paintPageBackground();
      s.y = PAGE.margin;

      const returns = view.executiveSummary.transactionTypes.RETURN || 0;
      const transfers = view.executiveSummary.transactionTypes.FC_TRANSFER || 0;
      sectionHeader(
        doc,
        s,
        theme,
        "Operations",
        "Operational movements",
        "Non-monetary fulfilment and inventory movements preserved from the source report.",
      );

      const countStr = String(view.movementSummaries.length);
      doc
        .font("Helvetica-Bold")
        .fontSize(22)
        .fillColor(theme.ink)
        .text(countStr, s.left, s.y, { lineBreak: false });
      const countW = doc.widthOfString(countStr);
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor(theme.muted)
        .text("records", s.left + countW + 8, s.y + 8, { lineBreak: false });
      s.y += 28;

      doc
        .font("Helvetica")
        .fontSize(9.5)
        .fillColor(theme.body)
        .text(`${returns} Returns    ${transfers} FC transfers`, s.left, s.y, { lineBreak: false });
      s.y += 20;

      dataTableHead(doc, s, theme, MOVEMENT_COLUMNS);
      for (const row of view.movementSummaries) {
        if (s.ensure(PAGE.rowH + PAGE.headH + 8)) dataTableHead(doc, s, theme, MOVEMENT_COLUMNS);
        const isTransfer = row.transactionType === "FC_TRANSFER";
        dataTableRow(
          doc,
          s,
          theme,
          MOVEMENT_COLUMNS,
          [
            row.transactionType,
            row.transactionEventId || "—",
            row.qty ?? "—",
            row.departureCountry || "—",
            row.arrivalCountry || row.saleArrivalCountry || "—",
          ],
          { band: isTransfer },
        );
      }
    }

    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      reportFooter(doc, theme, periodLabel, p.reportId, i + 1, range.count);
    }

    doc.end();
  });
}

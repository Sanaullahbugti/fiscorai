import type { CanonicalReportV2 } from "./canonical-types.js";
import { decimalToNumber } from "./decimal.js";
import type { CategoryBucket, CountryResult, ProcessedReport, TransactionRow } from "./types.js";

function toNum(value: string | null): number {
  if (value == null) return 0;
  return decimalToNumber(value);
}

/** Precision-lossy projection for existing API/UI consumers. */
export function toLegacyProcessedReport(
  canonical: CanonicalReportV2,
  periodLabel: string,
  totalRows: number,
  plan?: { truncated: boolean; planLimit: number | null },
): ProcessedReport {
  const byCountry = new Map<string, Map<string, CategoryBucket>>();

  for (const row of canonical.rows) {
    const scheme = row.taxReportingScheme.value?.trim() || "EMPTY";
    const country = row.derived.reportingDestination.value || "NO COUNTRY";
    const currency = row.transactionCurrencyCode.value || "";
    const txType = (row.transactionType.value || "").toUpperCase();

    if (!byCountry.has(country)) byCountry.set(country, new Map());
    const catMap = byCountry.get(country)!;
    if (!catMap.has(scheme)) {
      catMap.set(scheme, { category: scheme, ALL: [], VAT: [], TRANSACTION: [] });
    }
    const bucket = catMap.get(scheme)!;

    const incl = row.activityValueIncl.value;
    const excl = row.activityValueExcl.value;
    const vat = row.activityVat.value;

    if (incl != null) {
      const allRow: TransactionRow = {
        transaction_type: txType,
        exp_country: row.derived.salesDestination.value || "",
        vat_percentage: row.priceVatRatePercent.value ?? "",
        total: toNum(incl),
        base: excl != null ? toNum(excl) : 0,
        vat: vat != null ? toNum(vat) : 0,
        currency,
      };

      if (bucket.ALL?.length) {
        const prev = bucket.ALL[0]!;
        if (prev.currency === currency || !prev.currency) {
          prev.total += allRow.total;
          prev.base += allRow.base;
          prev.vat += allRow.vat;
          prev.currency = currency;
        }
      } else {
        bucket.ALL = [allRow];
      }

      if (txType === "SALE" || txType === "REFUND") {
        const txRows = bucket.TRANSACTION || [];
        const existing = txRows.find((t) => t.transaction_type === txType && t.currency === currency);
        if (existing) {
          existing.total += allRow.total;
          existing.base += allRow.base;
          existing.vat += allRow.vat;
        } else {
          txRows.push({ ...allRow });
        }
        bucket.TRANSACTION = txRows;
      }

      const rateLabel = row.priceVatRatePercent.value ?? "ALL";
      const vatRows = bucket.VAT || [];
      const vatExisting = vatRows.find(
        (v) => String(v.vat_percentage) === String(rateLabel) && v.currency === currency,
      );
      if (vatExisting) {
        vatExisting.total += allRow.total;
        vatExisting.base += allRow.base;
        vatExisting.vat += allRow.vat;
      } else {
        vatRows.push({ ...allRow, vat_percentage: rateLabel });
      }
      bucket.VAT = vatRows;
    }
  }

  const countries: CountryResult[] = [...byCountry.entries()].map(([country, catMap]) => ({
    country,
    transactionCategories: [...catMap.values()],
  }));

  countries.sort((a, b) => a.country.localeCompare(b.country));

  return {
    countries,
    meta: {
      totalRows,
      processedRows: canonical.rows.length,
      truncated: plan?.truncated ?? false,
      planLimit: plan?.planLimit ?? null,
      periodLabel,
      reconciliationStatus: canonical.reconciliationStatus,
      reportId: canonical.view.provenance.reportId,
      sourceActivityPeriod: canonical.view.provenance.sourceActivityPeriod,
      sourceFileName: canonical.view.provenance.sourceFileName,
      sourceFileHash: canonical.view.provenance.sourceFileHash,
      processorVersion: canonical.view.provenance.processorVersion,
      generatedAt: canonical.view.provenance.generatedAt,
    },
  };
}

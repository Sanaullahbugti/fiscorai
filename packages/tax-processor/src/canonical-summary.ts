import type { ReportView, SchemeSummaryRow, TransactionTypeSummary } from "./canonical-types.js";
import { roundMoney } from "./decimal.js";

export type CurrencyRollup = {
  currency: string;
  sales: number;
  refunds: number;
  vat: number;
  net: number;
};

export type SchemeRollup = {
  scheme: string;
  currency: string;
  sales: number;
  vat: number;
};

export type CanonicalAggregate = {
  byCurrency: CurrencyRollup[];
  byScheme: SchemeRollup[];
  currencies: string[];
  multiCurrency: boolean;
  /** Primary-currency totals when exactly one currency is present; otherwise null. */
  single: CurrencyRollup | null;
};

function toNum(s: string): number {
  return Number(roundMoney(s));
}

function sumType(rows: TransactionTypeSummary[], type: string, currency: string, field: "activityIncl" | "vat") {
  return rows
    .filter((r) => r.transactionType === type && r.currency === currency)
    .reduce((acc, r) => acc + toNum(r[field]), 0);
}

export function aggregateFromReportView(view: ReportView): CanonicalAggregate {
  const currencies = [...new Set(view.totalsByCurrency.map((t) => t.currency))].sort();
  const typeRows = view.transactionTypeSummaries;

  const byCurrency: CurrencyRollup[] = currencies.map((currency) => {
    const sales = sumType(typeRows, "SALE", currency, "activityIncl");
    const refunds = sumType(typeRows, "REFUND", currency, "activityIncl");
    const vat = toNum(view.totalsByCurrency.find((t) => t.currency === currency)?.vat ?? "0");
    return {
      currency,
      sales: Number(roundMoney(String(sales))),
      refunds: Number(roundMoney(String(refunds))),
      vat,
      net: Number(roundMoney(String(sales + refunds))),
    };
  });

  const schemeMap = new Map<string, SchemeRollup>();
  for (const row of view.schemeSummaries) {
    const key = `${row.sourceTaxReportingScheme}@@${row.currency}`;
    const prev = schemeMap.get(key) || {
      scheme: row.sourceTaxReportingScheme,
      currency: row.currency,
      sales: 0,
      vat: 0,
    };
    prev.sales += toNum(row.activityIncl);
    prev.vat += toNum(row.vat);
    schemeMap.set(key, prev);
  }

  const byScheme = [...schemeMap.values()]
    .map((s) => ({
      scheme: s.scheme,
      currency: s.currency,
      sales: Number(roundMoney(String(s.sales))),
      vat: Number(roundMoney(String(s.vat))),
    }))
    .filter((s) => Math.abs(s.sales) >= 0.005 || Math.abs(s.vat) >= 0.005)
    .sort((a, b) => Math.abs(b.vat) - Math.abs(a.vat));

  return {
    byCurrency,
    byScheme,
    currencies,
    multiCurrency: currencies.length > 1,
    single: byCurrency.length === 1 ? byCurrency[0]! : null,
  };
}

export function formatMoney(currency: string, amount: string | number): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  const value = Number(roundMoney(String(n)));
  const absFormatted = Math.abs(value).toLocaleString("en-IE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const negative = value < 0;
  switch (currency.toUpperCase()) {
    case "EUR":
      return negative ? `-€${absFormatted}` : `€${absFormatted}`;
    case "GBP":
      return negative ? `-£${absFormatted}` : `£${absFormatted}`;
    case "SEK":
      return negative ? `-${absFormatted} kr` : `${absFormatted} kr`;
    default:
      return negative ? `-${currency} ${absFormatted}` : `${currency} ${absFormatted}`;
  }
}

export function schemeVatByCurrency(summaries: SchemeSummaryRow[], scheme: string, currency: string): number {
  return summaries
    .filter((s) => s.sourceTaxReportingScheme === scheme && s.currency === currency)
    .reduce((acc, s) => acc + toNum(s.vat), 0);
}

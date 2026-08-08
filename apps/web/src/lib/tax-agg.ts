import type { CanonicalViewRef, Country } from "@/types/api";
import { CATEGORY_COLORS } from "@/constants";

export type CountryAgg = {
  country: string;
  currency?: string;
  sales: number;
  refunds: number;
  vat: number;
  cats: Array<{ category: string; sale: number; currency?: string }>;
};

export type AggregateResult = {
  sales: number;
  refunds: number;
  vat: number;
  byCat: Record<string, number>;
  byCountry: CountryAgg[];
  net: number;
  currencies: string[];
  multiCurrency: boolean;
  byCurrency: Array<{ currency: string; sales: number; refunds: number; vat: number; net: number }>;
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function formatMoney(currency: string, amount: number): string {
  const value = round2(amount);
  const formatted = value.toLocaleString("en-IE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  switch (currency.toUpperCase()) {
    case "EUR":
      return `€${formatted}`;
    case "GBP":
      return `£${formatted}`;
    case "SEK":
      return `${formatted} kr`;
    default:
      return `${currency} ${formatted}`;
  }
}

export function aggregateFromCanonical(canonical: CanonicalViewRef): AggregateResult {
  const view = canonical.view;
  const byCurrency = view.totalsByCurrency.map((t) => {
    const sales = view.transactionTypeSummaries
      .filter((r) => r.transactionType === "SALE" && r.currency === t.currency)
      .reduce((acc, r) => acc + Number(r.activityIncl), 0);
    const refunds = view.transactionTypeSummaries
      .filter((r) => r.transactionType === "REFUND" && r.currency === t.currency)
      .reduce((acc, r) => acc + Number(r.activityIncl), 0);
    return {
      currency: t.currency,
      sales: round2(sales),
      refunds: round2(refunds),
      vat: round2(Number(t.vat)),
      net: round2(sales + refunds),
    };
  });

  const byCat: Record<string, number> = {};
  for (const row of view.schemeSummaries) {
    const key = row.currency ? `${row.sourceTaxReportingScheme} (${row.currency})` : row.sourceTaxReportingScheme;
    byCat[key] = round2((byCat[key] || 0) + Number(row.activityIncl));
  }

  const countryMap = new Map<string, CountryAgg>();
  for (const row of view.schemeSummaries) {
    const dest = row.salesDestination || "—";
    const key = `${dest}@@${row.currency}`;
    const prev = countryMap.get(key) || {
      country: dest,
      currency: row.currency,
      sales: 0,
      refunds: 0,
      vat: 0,
      cats: [],
    };
    prev.sales = round2(prev.sales + Number(row.activityIncl));
    prev.vat = round2(prev.vat + Number(row.vat));
    prev.cats.push({
      category: row.sourceTaxReportingScheme,
      sale: round2(Number(row.activityIncl)),
      currency: row.currency,
    });
    countryMap.set(key, prev);
  }

  for (const refund of view.refundSummaries) {
    const dest = refund.salesDestination || "—";
    const key = `${dest}@@${refund.currency}`;
    const prev = countryMap.get(key) || {
      country: dest,
      currency: refund.currency,
      sales: 0,
      refunds: 0,
      vat: 0,
      cats: [],
    };
    prev.refunds = round2(prev.refunds + Number(refund.activityIncl));
    countryMap.set(key, prev);
  }

  const primary = byCurrency.length === 1 ? byCurrency[0]! : null;
  return {
    sales: primary?.sales ?? 0,
    refunds: primary?.refunds ?? 0,
    vat: primary?.vat ?? 0,
    net: primary?.net ?? 0,
    byCat,
    byCountry: [...countryMap.values()],
    currencies: byCurrency.map((c) => c.currency),
    multiCurrency: byCurrency.length > 1,
    byCurrency,
  };
}

export function aggregateCountries(data: Country[], canonical?: CanonicalViewRef | null): AggregateResult {
  if (canonical?.view) return aggregateFromCanonical(canonical);

  let sales = 0;
  let refunds = 0;
  let vat = 0;
  const byCat: Record<string, number> = {};
  const byCountry: CountryAgg[] = [];
  const currencies = new Set<string>();

  for (const c of data || []) {
    let cs = 0;
    let cr = 0;
    let cv = 0;
    const cats: CountryAgg["cats"] = [];
    for (const cat of c.transactionCategories || []) {
      let sale = 0;
      for (const t of cat.transactions?.TRANSACTION || []) {
        if (t.currency) currencies.add(t.currency);
        if (t.transaction_type === "SALE") {
          sales += t.total;
          cs += t.total;
          sale += t.total;
          byCat[cat.category] = (byCat[cat.category] || 0) + t.total;
        } else if (t.transaction_type === "REFUND") {
          refunds += t.total;
          cr += t.total;
        }
      }
      for (const a of cat.transactions?.ALL || []) {
        vat += a.vat;
        cv += a.vat;
        if (a.currency) currencies.add(a.currency);
      }
      cats.push({ category: cat.category, sale });
    }
    byCountry.push({ country: c.country, sales: cs, refunds: cr, vat: cv, cats });
  }

  const byCurrency = [...currencies].map((currency) => ({ currency, sales: 0, refunds: 0, vat: 0, net: 0 }));

  return {
    sales,
    refunds,
    vat,
    byCat,
    byCountry,
    net: sales + refunds,
    currencies: [...currencies],
    multiCurrency: currencies.size > 1,
    byCurrency,
  };
}

export function eur(n: number) {
  return formatMoney("EUR", n);
}

export function categoryColor(cat: string) {
  const base = cat.replace(/\s*\([A-Z]{3}\)$/, "");
  return CATEGORY_COLORS[base] || CATEGORY_COLORS[cat] || "#888";
}

import { aggregateCountries, eur, formatMoney } from "@/lib/tax-agg";
import type { CanonicalViewRef, Country } from "@/types/api";

export type ReviewCheck = {
  sev: "info" | "warning" | "critical";
  title: string;
  detail: string;
};

export type ReviewFiling = {
  scheme: string;
  what: string;
  amount: string;
  due: string;
  note: string;
};

export function buildReviewChecks(
  data: Country[],
  opts: { planActive?: boolean; canonical?: CanonicalViewRef | null },
): { checks: ReviewCheck[]; filings: ReviewFiling[]; agg: ReturnType<typeof aggregateCountries> } {
  const agg = aggregateCountries(data, opts.canonical);
  const checks: ReviewCheck[] = [];

  const unresolved = agg.byCountry.filter(
    (c) => c.country === "NO COUNTRY" || c.country === "—" || c.country === "(blank)",
  );
  for (const nc of unresolved) {
    if (Math.abs(nc.sales) <= 0) continue;
    const amount = nc.currency ? formatMoney(nc.currency, nc.sales) : eur(nc.sales);
    checks.push({
      sev: "critical",
      title: "Rows with unresolved destination context",
      detail: `${amount} of activity lacks a resolved sales destination. Review source country fields with your adviser before relying on these figures.`,
    });
  }

  for (const c of agg.byCountry) {
    if (!c.sales) continue;
    const ratio = (Math.abs(c.refunds) / c.sales) * 100;
    if (ratio > 7) {
      const amount = c.currency ? formatMoney(c.currency, c.refunds) : eur(c.refunds);
      checks.push({
        sev: "warning",
        title: `High refund rate in ${c.country}`,
        detail: `${ratio.toFixed(1)}% of sales were refunded (${amount}). Check that credit notes land in the same period as the original sale.`,
      });
    }
  }

  if (!opts.planActive) {
    checks.push({
      sev: "critical",
      title: "Free plan caps this analysis at 50 transactions",
      detail: "Figures here may be partial. Upgrade under Plans & billing and re-upload the same period for a complete set.",
    });
  }

  for (const [scheme, amount] of Object.entries(agg.byCat)) {
    if (!/VOEC/i.test(scheme) || Math.abs(amount) < 0.005) continue;
    const currencyMatch = scheme.match(/\(([A-Z]{3})\)$/);
    const currency = currencyMatch?.[1];
    checks.push({
      sev: "info",
      title: "Non-EU scheme activity present",
      detail: `${currency ? formatMoney(currency, amount) : eur(amount)} under ${scheme}. Confirm filing treatment with your adviser.`,
    });
  }

  const filings: ReviewFiling[] = [];
  if (opts.canonical?.view) {
    for (const row of opts.canonical.view.schemeSummaries) {
      if (row.sourceTaxReportingScheme !== "UNION-OSS") continue;
      if (Math.abs(Number(row.vat)) < 0.005) continue;
      filings.push({
        scheme: `UNION-OSS (${row.currency})`,
        what: "Source-reported UNION-OSS VAT amount.",
        amount: formatMoney(row.currency, Number(row.vat)),
        due: "Confirm with adviser",
        note: "Illustrative OSS calendar only — your Member State deadlines may differ.",
      });
    }
  } else if (agg.byCat["UNION-OSS"]) {
    filings.push({
      scheme: "UNION-OSS",
      what: "Source-reported UNION-OSS VAT amount.",
      amount: eur(
        data.reduce(
          (s, c) =>
            s +
            c.transactionCategories
              .filter((x) => x.category === "UNION-OSS")
              .reduce((t, x) => t + (x.transactions.ALL || []).reduce((z, r) => z + r.vat, 0), 0),
          0,
        ),
      ),
      due: "Confirm with adviser",
      note: "Illustrative OSS calendar only — your Member State deadlines may differ.",
    });
  }

  return { checks, filings, agg };
}

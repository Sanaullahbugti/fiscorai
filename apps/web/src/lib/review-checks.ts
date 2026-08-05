import { aggregateCountries, eur } from "@/lib/tax-agg";
import type { Country } from "@/types/api";

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
  opts: { planActive?: boolean },
): { checks: ReviewCheck[]; filings: ReviewFiling[]; agg: ReturnType<typeof aggregateCountries> } {
  const agg = aggregateCountries(data);
  const checks: ReviewCheck[] = [];

  const nc = agg.byCountry.find((c) => c.country === "NO COUNTRY");
  if (nc && Math.abs(nc.sales) > 0) {
    checks.push({
      sev: "critical",
      title: "Unclassified rows in the report",
      detail: `${eur(nc.sales)} of sales carry no jurisdiction. Usually a missing arrival country or a marketplace field Amazon left blank — these are not covered by any return until they are classified.`,
    });
  }

  for (const c of agg.byCountry) {
    if (!c.sales) continue;
    const ratio = (Math.abs(c.refunds) / c.sales) * 100;
    if (ratio > 7) {
      checks.push({
        sev: "warning",
        title: `High refund rate in ${c.country}`,
        detail: `${ratio.toFixed(1)}% of sales were refunded (${eur(c.refunds)}).  Check that credit notes land in the same period as the original sale.`,
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

  if (agg.byCat.VOEC) {
    checks.push({
      sev: "info",
      title: "Non-EU schemes present",
      detail: `${eur(agg.byCat.VOEC)} under VOEC-type schemes (UK / CH / NO). These are filed separately from your EU returns.`,
    });
  }

  const filings: ReviewFiling[] = [];
  if (agg.byCat["UNION-OSS"]) {
    filings.push({
      scheme: "OSS return",
      what: "One EU return covering OSS destinations.",
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
      due: "End of month after quarter",
      note: "EU OSS usual calendar — confirm with your adviser for your Member State.",
    });
  }

  return { checks, filings, agg };
}

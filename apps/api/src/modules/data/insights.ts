import type { AllDataSummary, PeriodSummary } from "../analyst/analyst.summary.js";
import { periodLabel } from "../analyst/analyst.summary.js";
import type { PeriodInput } from "./storage.repository.js";

type TxRow = {
  transaction_type?: string;
  vat_percentage?: string | number;
  total?: number;
  base?: number;
  vat?: number;
  currency?: string;
};

type Category = {
  category?: string;
  transactions?: {
    ALL?: TxRow[];
    VAT?: TxRow[];
    TRANSACTION?: TxRow[];
  };
};

type Country = {
  country?: string;
  transactionCategories?: Category[];
};

export type ProcessMeta = {
  totalRows: number;
  processedRows: number;
  truncated: boolean;
  planLimit: number | null;
  periodLabel: string;
};

export type InsightAlert = {
  sev: "info" | "warning" | "critical";
  code: string;
  title: string;
  detail: string;
};

export type InsightsPayload = {
  period: {
    fileType: string;
    year: string | number;
    month?: string | number;
    quarter?: string;
    label: string;
  };
  totals: { sales: number; refunds: number; vat: number; net: number };
  pulse: {
    priorLabel: string | null;
    salesDeltaPct: number | null;
    refundsDeltaPct: number | null;
    vatDeltaPct: number | null;
    verdict: string;
  };
  byRate: Array<{ rate: string; total: number; base: number; vat: number }>;
  schemeMix: Array<{ scheme: string; sales: number; vat: number; salesSharePct: number }>;
  watchlist: Array<{
    country: string;
    sales: number;
    refunds: number;
    vat: number;
    refundRatePct: number | null;
  }>;
  alerts: InsightAlert[];
  meta: ProcessMeta | null;
  filingHints: Array<{ scheme: string; amount: number; due: string; note: string }>;
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function pctDelta(current: number, prior: number): number | null {
  if (!Number.isFinite(prior) || Math.abs(prior) < 0.005) return null;
  return round2(((current - prior) / Math.abs(prior)) * 100);
}

function samePeriod(a: PeriodSummary["period"], b: PeriodInput) {
  if (String(a.fileType) !== String(b.fileType) || Number(a.year) !== Number(b.year)) return false;
  if (b.fileType === "monthly") return String(a.month) === String(Number(b.month));
  return String(a.quarter || "").toUpperCase() === String(b.quarter || "").toUpperCase();
}

/** Chronological rank for monthly/quarterly periods (higher = newer). */
function periodRank(p: PeriodSummary["period"]) {
  const y = Number(p.year);
  if (p.fileType === "monthly") return y * 12 + Number(p.month || 0);
  const q = Number(String(p.quarter || "").replace(/\D/g, "") || 0);
  return y * 12 + q * 3;
}

function ossDueForPeriod(input: PeriodInput): { due: string; note: string } {
  if (input.fileType === "quarterly") {
    const q = String(input.quarter || "").toUpperCase();
    const year = Number(input.year);
    const map: Record<string, { month: number; day: number; yearOff: number }> = {
      Q1: { month: 4, day: 30, yearOff: 0 },
      Q2: { month: 7, day: 31, yearOff: 0 },
      Q3: { month: 10, day: 31, yearOff: 0 },
      Q4: { month: 1, day: 31, yearOff: 1 },
    };
    const m = map[q] || map.Q1;
    const dueYear = year + m.yearOff;
    const due = `${dueYear}-${String(m.month).padStart(2, "0")}-${String(m.day).padStart(2, "0")}`;
    return { due, note: "EU OSS: last day of the month following the quarter (your Member State may vary)." };
  }
  // Monthly sellers often still file OSS quarterly — point at the quarter containing the month.
  const month = Number(input.month);
  const q = month <= 3 ? "Q1" : month <= 6 ? "Q2" : month <= 9 ? "Q3" : "Q4";
  return ossDueForPeriod({ ...input, fileType: "quarterly", quarter: q });
}

function aggregatePeriod(countries: Country[]) {
  let sales = 0;
  let refunds = 0;
  let vat = 0;
  const byCatSales: Record<string, number> = {};
  const byCatVat: Record<string, number> = {};
  const byRate = new Map<string, { total: number; base: number; vat: number }>();
  const byCountry: InsightsPayload["watchlist"] = [];

  for (const c of countries || []) {
    let cs = 0;
    let cr = 0;
    let cv = 0;
    for (const cat of c.transactionCategories || []) {
      const name = String(cat.category || "UNKNOWN");
      for (const t of cat.transactions?.TRANSACTION || []) {
        const total = Number(t.total) || 0;
        if (t.transaction_type === "SALE") {
          sales += total;
          cs += total;
          byCatSales[name] = (byCatSales[name] || 0) + total;
        } else if (t.transaction_type === "REFUND") {
          refunds += total;
          cr += total;
        }
      }
      for (const a of cat.transactions?.ALL || []) {
        const v = Number(a.vat) || 0;
        vat += v;
        cv += v;
        byCatVat[name] = (byCatVat[name] || 0) + v;
      }
      for (const row of cat.transactions?.VAT || []) {
        const rate = String(row.vat_percentage ?? "ALL").split("-").pop() || "ALL";
        const cur = byRate.get(rate) || { total: 0, base: 0, vat: 0 };
        cur.total += Number(row.total) || 0;
        cur.base += Number(row.base) || 0;
        cur.vat += Number(row.vat) || 0;
        byRate.set(rate, cur);
      }
    }
    byCountry.push({
      country: String(c.country || "UNKNOWN"),
      sales: round2(cs),
      refunds: round2(cr),
      vat: round2(cv),
      refundRatePct: cs > 0 ? round2((Math.abs(cr) / cs) * 100) : null,
    });
  }

  const salesAbs = Math.max(0, sales);
  const schemeMix = Object.keys({ ...byCatSales, ...byCatVat })
    .map((scheme) => ({
      scheme,
      sales: round2(byCatSales[scheme] || 0),
      vat: round2(byCatVat[scheme] || 0),
      salesSharePct: salesAbs > 0 ? round2(((byCatSales[scheme] || 0) / salesAbs) * 100) : 0,
    }))
    .filter((s) => Math.abs(s.sales) >= 0.005 || Math.abs(s.vat) >= 0.005)
    .sort((a, b) => Math.abs(b.vat) - Math.abs(a.vat));

  const rates = [...byRate.entries()]
    .map(([rate, v]) => ({
      rate,
      total: round2(v.total),
      base: round2(v.base),
      vat: round2(v.vat),
    }))
    .sort((a, b) => Math.abs(b.vat) - Math.abs(a.vat));

  const watchlist = [...byCountry]
    .filter((c) => Math.abs(c.vat) >= 0.005 || Math.abs(c.sales) >= 0.005)
    .sort((a, b) => Math.abs(b.vat) - Math.abs(a.vat))
    .slice(0, 8);

  return {
    totals: {
      sales: round2(sales),
      refunds: round2(refunds),
      vat: round2(vat),
      net: round2(sales + refunds),
    },
    byRate: rates,
    schemeMix,
    watchlist,
    byCountry,
  };
}

function buildVerdict(pulse: {
  vatDeltaPct: number | null;
  salesDeltaPct: number | null;
  refundsDeltaPct: number | null;
}): string {
  if (pulse.vatDeltaPct == null && pulse.salesDeltaPct == null) {
    return "First period on file — upload another month to see change over time.";
  }
  const vat = pulse.vatDeltaPct;
  if (vat != null && Math.abs(vat) >= 1) {
    const dir = vat > 0 ? "up" : "down";
    return `VAT due is ${dir} ${Math.abs(vat).toFixed(1)}% vs the prior period.`;
  }
  if (pulse.salesDeltaPct != null && Math.abs(pulse.salesDeltaPct) >= 1) {
    const dir = pulse.salesDeltaPct > 0 ? "up" : "down";
    return `Net sales are ${dir} ${Math.abs(pulse.salesDeltaPct).toFixed(1)}% vs the prior period.`;
  }
  return "VAT and sales are roughly flat vs the prior period.";
}

export function buildInsights(opts: {
  period: PeriodInput;
  countries: Country[];
  meta: ProcessMeta | null;
  overview: AllDataSummary | null;
  planActive: boolean;
}): InsightsPayload {
  const agg = aggregatePeriod(opts.countries);
  const label = periodLabel(opts.period);

  const sameType = (opts.overview?.byPeriod || []).filter(
    (p) => String(p.period.fileType) === String(opts.period.fileType),
  );
  const ordered = [...sameType].sort((a, b) => periodRank(a.period) - periodRank(b.period));
  const idx = ordered.findIndex((p) => samePeriod(p.period, opts.period));
  const prior = idx > 0 ? ordered[idx - 1] : null;

  const salesDeltaPct = prior ? pctDelta(agg.totals.sales, prior.totals.sales) : null;
  const refundsDeltaPct = prior
    ? pctDelta(Math.abs(agg.totals.refunds), Math.abs(prior.totals.refunds))
    : null;
  const vatDeltaPct = prior ? pctDelta(agg.totals.vat, prior.totals.vat) : null;

  const pulse = {
    priorLabel: prior ? prior.period.label : null,
    salesDeltaPct,
    refundsDeltaPct,
    vatDeltaPct,
    verdict: "",
  };
  pulse.verdict = buildVerdict(pulse);

  const alerts: InsightAlert[] = [];

  const nc = agg.byCountry.find((c) => c.country === "NO COUNTRY");
  if (nc && Math.abs(nc.sales) > 0) {
    alerts.push({
      sev: "critical",
      code: "NO_COUNTRY",
      title: "Unclassified rows in the report",
      detail: `€${Math.abs(nc.sales).toFixed(2)} of sales carry no jurisdiction — not covered by any return until classified.`,
    });
  }

  for (const c of agg.byCountry) {
    if (!c.sales || c.refundRatePct == null) continue;
    if (c.refundRatePct > 7) {
      alerts.push({
        sev: "warning",
        code: `REFUND_${c.country}`,
        title: `High refund rate in ${c.country}`,
        detail: `${c.refundRatePct}% of sales were refunded (€${Math.abs(c.refunds).toFixed(2)}).`,
      });
    }
  }

  if (opts.meta?.truncated) {
    alerts.push({
      sev: "critical",
      code: "TRUNCATED",
      title: "Plan limit truncated this analysis",
      detail: `Processed ${opts.meta.processedRows} of ${opts.meta.totalRows} rows${
        opts.meta.planLimit != null ? ` (cap ${opts.meta.planLimit})` : ""
      }. Upgrade and re-upload for complete figures.`,
    });
  } else if (!opts.planActive) {
    alerts.push({
      sev: "warning",
      code: "FREE_PLAN",
      title: "Free plan may cap transaction processing",
      detail: "If figures look incomplete, upgrade under Plans & billing and re-upload this period.",
    });
  }

  if (agg.schemeMix.some((s) => s.scheme === "VOEC" && Math.abs(s.sales) > 0)) {
    const voec = agg.schemeMix.find((s) => s.scheme === "VOEC")!;
    alerts.push({
      sev: "info",
      code: "VOEC",
      title: "Non-EU schemes present",
      detail: `€${Math.abs(voec.sales).toFixed(2)} under VOEC-type schemes — filed separately from EU returns.`,
    });
  }

  if (vatDeltaPct != null && vatDeltaPct >= 15) {
    alerts.push({
      sev: "warning",
      code: "VAT_SPIKE",
      title: "VAT due spiked vs prior period",
      detail: `VAT due is up ${vatDeltaPct.toFixed(1)}% compared with ${prior?.period.label}.`,
    });
  }

  const filingHints: InsightsPayload["filingHints"] = [];
  const oss = agg.schemeMix.find((s) => s.scheme === "UNION-OSS");
  if (oss && Math.abs(oss.vat) >= 0.005) {
    const due = ossDueForPeriod(opts.period);
    filingHints.push({
      scheme: "OSS return",
      amount: oss.vat,
      due: due.due,
      note: due.note,
    });
  }

  return {
    period: {
      fileType: opts.period.fileType,
      year: opts.period.year,
      month: opts.period.month,
      quarter: opts.period.quarter,
      label,
    },
    totals: agg.totals,
    pulse,
    byRate: agg.byRate,
    schemeMix: agg.schemeMix,
    watchlist: agg.watchlist,
    alerts,
    meta: opts.meta,
    filingHints,
  };
}

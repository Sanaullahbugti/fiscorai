type TxRow = {
  transaction_type?: string;
  total?: number;
  vat?: number;
};

type Category = {
  category?: string;
  transactions?: {
    ALL?: TxRow[];
    TRANSACTION?: TxRow[];
  };
};

type Country = {
  country?: string;
  transactionCategories?: Category[];
};

export type PeriodSummary = {
  period: {
    fileType: string;
    year: string | number;
    month?: string | number;
    quarter?: string;
    label: string;
  };
  totals: {
    sales: number;
    refunds: number;
    vat: number;
    net: number;
  };
  byCategory: Record<string, number>;
  topCountries: Array<{
    country: string;
    sales: number;
    refunds: number;
    vat: number;
    refundRatePct: number | null;
  }>;
  countryCount: number;
};

export type AllDataSummary = {
  scope: "all_uploaded_periods";
  periodCount: number;
  overall: {
    sales: number;
    refunds: number;
    vat: number;
    net: number;
    byCategory: Record<string, number>;
    topCountries: PeriodSummary["topCountries"];
    countryCount: number;
  };
  byPeriod: PeriodSummary[];
};

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function periodLabel(period: {
  fileType: string;
  year: string | number;
  month?: string | number;
  quarter?: string;
}): string {
  if (period.fileType === "quarterly") {
    return `${String(period.quarter || "").toUpperCase()} ${period.year}`;
  }
  const m = Number(period.month) - 1;
  const name = MONTH_NAMES[m] || String(period.month);
  return `${name} ${period.year}`;
}

/** Compact aggregate for Gemini prompts — totals, categories, top countries only. */
export function buildPeriodSummary(
  countries: Country[],
  period: {
    fileType: string;
    year: string | number;
    month?: string | number;
    quarter?: string;
  },
): PeriodSummary {
  let sales = 0;
  let refunds = 0;
  let vat = 0;
  const byCategory: Record<string, number> = {};
  const byCountry: PeriodSummary["topCountries"] = [];

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
          byCategory[name] = (byCategory[name] || 0) + total;
        } else if (t.transaction_type === "REFUND") {
          refunds += total;
          cr += total;
        }
      }
      for (const a of cat.transactions?.ALL || []) {
        const v = Number(a.vat) || 0;
        vat += v;
        cv += v;
      }
    }
    const country = String(c.country || "??");
    byCountry.push({
      country,
      sales: round2(cs),
      refunds: round2(cr),
      vat: round2(cv),
      refundRatePct: cs > 0 ? round2((Math.abs(cr) / cs) * 100) : null,
    });
  }

  const topCountries = [...byCountry].sort((a, b) => b.vat - a.vat).slice(0, 12);

  return {
    period: { ...period, label: periodLabel(period) },
    totals: {
      sales: round2(sales),
      refunds: round2(refunds),
      vat: round2(vat),
      net: round2(sales + refunds),
    },
    byCategory: Object.fromEntries(
      Object.entries(byCategory).map(([k, v]) => [k, round2(v)]),
    ),
    topCountries,
    countryCount: byCountry.length,
  };
}

/** Roll up every uploaded period for Analyst (overall + per-period breakdown). */
export function buildAllDataSummary(
  loaded: Array<{
    period: {
      fileType: string;
      year: string | number;
      month?: string | number;
      quarter?: string;
    };
    countries: Country[];
  }>,
  maxPeriods = 36,
): AllDataSummary {
  const byPeriod = loaded.slice(0, maxPeriods).map(({ period, countries }) =>
    buildPeriodSummary(countries, period),
  );

  let sales = 0;
  let refunds = 0;
  let vat = 0;
  const byCategory: Record<string, number> = {};
  const countryMap = new Map<
    string,
    { country: string; sales: number; refunds: number; vat: number }
  >();

  for (const p of byPeriod) {
    sales += p.totals.sales;
    refunds += p.totals.refunds;
    vat += p.totals.vat;
    for (const [k, v] of Object.entries(p.byCategory)) {
      byCategory[k] = (byCategory[k] || 0) + v;
    }
    for (const c of p.topCountries) {
      const prev = countryMap.get(c.country) || {
        country: c.country,
        sales: 0,
        refunds: 0,
        vat: 0,
      };
      prev.sales += c.sales;
      prev.refunds += c.refunds;
      prev.vat += c.vat;
      countryMap.set(c.country, prev);
    }
  }

  const topCountries = [...countryMap.values()]
    .map((c) => ({
      country: c.country,
      sales: round2(c.sales),
      refunds: round2(c.refunds),
      vat: round2(c.vat),
      refundRatePct: c.sales > 0 ? round2((Math.abs(c.refunds) / c.sales) * 100) : null,
    }))
    .sort((a, b) => b.vat - a.vat)
    .slice(0, 12);

  return {
    scope: "all_uploaded_periods",
    periodCount: byPeriod.length,
    overall: {
      sales: round2(sales),
      refunds: round2(refunds),
      vat: round2(vat),
      net: round2(sales + refunds),
      byCategory: Object.fromEntries(
        Object.entries(byCategory).map(([k, v]) => [k, round2(v)]),
      ),
      topCountries,
      countryCount: countryMap.size,
    },
    byPeriod,
  };
}

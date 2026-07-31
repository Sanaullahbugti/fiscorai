import { parse } from "csv-parse/sync";
import {
  JURISDICTION_NAMES,
  PLAN_LIMITS,
  type CategoryBucket,
  type CountryResult,
  type PlanCode,
  type ProcessOptions,
  type ProcessedReport,
  type TransactionRow,
} from "./types.js";

type CsvRow = Record<string, string>;

function money(v: string | undefined): number {
  const s = (v || "").trim();
  if (!s) return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function titleCountry(raw: string): string {
  const key = raw.trim().toUpperCase();
  if (!key) return "NO COUNTRY";
  return JURISDICTION_NAMES[key] || raw.trim().replace(/\b\w/g, (c) => c.toUpperCase());
}

function schemeCategory(scheme: string): string {
  const s = (scheme || "").trim().toUpperCase();
  if (s === "UNION-OSS") return "UNION-OSS";
  if (s.includes("VOEC")) return "VOEC";
  if (s === "REGULAR") return "REGULAR";
  if (!s) return "EMPTY";
  return s;
}

function resolveCountry(row: CsvRow, category: string): string {
  const juris = (row.TAXABLE_JURISDICTION || "").trim();
  if (juris) return titleCountry(juris);
  if (category === "UNION-OSS") {
    const arrival = (row.ARRIVAL_COUNTRY || row.SALE_ARRIVAL_COUNTRY || "").trim();
    if (arrival) return titleCountry(arrival);
  }
  if (category === "VOEC") {
    const depart = (row.DEPARTURE_COUNTRY || "").trim();
    if (depart) return titleCountry(depart);
  }
  if (category === "REGULAR") {
    const arrival = (row.ARRIVAL_COUNTRY || "").trim();
    if (arrival) return titleCountry(arrival);
  }
  return "NO COUNTRY";
}

function planLimit(plan: PlanCode, fileType: "monthly" | "quarterly"): number | null {
  return PLAN_LIMITS[plan][fileType];
}

function emptyRow(partial: Partial<TransactionRow> = {}): TransactionRow {
  return {
    transaction_type: "",
    exp_country: "",
    vat_percentage: "",
    total: 0,
    base: 0,
    vat: 0,
    currency: "EUR",
    ...partial,
  };
}

type AggKey = string;

function keyOf(country: string, category: string): AggKey {
  return `${country}@@${category}`;
}

export function processCsv(csvText: string, options: ProcessOptions): ProcessedReport {
  const records = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    bom: true,
  }) as CsvRow[];

  const limit = planLimit(options.planCode, options.fileType);
  const truncated = limit != null && records.length > limit;
  const rows = limit != null ? records.slice(0, limit) : records;

  type Bucket = {
    country: string;
    category: string;
    all: { total: number; base: number; vat: number; currency: string };
    byType: Map<string, { total: number; base: number; vat: number; currency: string; exp: string }>;
    byVat: Map<string, { total: number; base: number; vat: number; currency: string }>;
  };

  const map = new Map<AggKey, Bucket>();

  for (const row of rows) {
    const category = schemeCategory(row.TAX_REPORTING_SCHEME);
    let country = resolveCountry(row, category);
    if (category === "EMPTY") country = "NO COUNTRY";

    const k = keyOf(country, category);
    let b = map.get(k);
    if (!b) {
      b = {
        country,
        category,
        all: { total: 0, base: 0, vat: 0, currency: "EUR" },
        byType: new Map(),
        byVat: new Map(),
      };
      map.set(k, b);
    }

    const total = money(row.TOTAL_ACTIVITY_VALUE_AMT_VAT_INCL);
    const base = money(row.TOTAL_ACTIVITY_VALUE_AMT_VAT_EXCL);
    const vat = money(row.TOTAL_ACTIVITY_VALUE_VAT_AMT);
    const currency = (row.TRANSACTION_CURRENCY_CODE || "EUR").trim() || "EUR";
    const txType = (row.TRANSACTION_TYPE || "").trim() || "SALE";

    b.all.total += total;
    b.all.base += base;
    b.all.vat += vat;
    b.all.currency = currency;

    const typeKey = txType === "RETURN" ? "REFUND" : txType === "REFUND" ? "REFUND" : txType === "SALE" ? "SALE" : txType;
    if (typeKey === "SALE" || typeKey === "REFUND") {
      const prev = b.byType.get(typeKey) || {
        total: 0,
        base: 0,
        vat: 0,
        currency,
        exp: category === "VOEC" ? country : "",
      };
      prev.total += total;
      prev.base += base;
      prev.vat += vat;
      prev.currency = currency;
      b.byType.set(typeKey, prev);
    }

    const rateRaw = (row.PRICE_OF_ITEMS_VAT_RATE_PERCENT || "").trim();
    const rateNum = rateRaw ? Number(rateRaw) : NaN;
    const vatLabel =
      Number.isFinite(rateNum) && rateNum > 0
        ? `${country}-${rateNum}`
        : rateRaw || "ALL";
    const vatPrev = b.byVat.get(vatLabel) || { total: 0, base: 0, vat: 0, currency };
    vatPrev.total += total;
    vatPrev.base += base;
    vatPrev.vat += vat;
    vatPrev.currency = currency;
    b.byVat.set(vatLabel, vatPrev);
  }

  const byCountry = new Map<string, CategoryBucket[]>();
  for (const b of map.values()) {
    const ALL = [
      emptyRow({
        total: round2(b.all.total),
        base: round2(b.all.base),
        vat: round2(b.all.vat),
        currency: b.all.currency,
      }),
    ];
    const TRANSACTION = [...b.byType.entries()].map(([type, v]) =>
      emptyRow({
        transaction_type: type,
        exp_country: v.exp,
        total: round2(v.total),
        base: round2(v.base),
        vat: round2(v.vat),
        currency: v.currency,
      }),
    );
    const VAT = [...b.byVat.entries()].map(([label, v]) =>
      emptyRow({
        vat_percentage: label.includes("-") ? label : Number(label) || label,
        total: round2(v.total),
        base: round2(v.base),
        vat: round2(v.vat),
        currency: v.currency,
      }),
    );

    const cat: CategoryBucket = { category: b.category, ALL, TRANSACTION, VAT };
    const list = byCountry.get(b.country) || [];
    list.push(cat);
    byCountry.set(b.country, list);
  }

  const countries: CountryResult[] = [...byCountry.entries()].map(([country, transactionCategories]) => ({
    country,
    transactionCategories,
  }));

  countries.sort((a, b) => a.country.localeCompare(b.country));

  return {
    countries,
    meta: {
      totalRows: records.length,
      processedRows: rows.length,
      truncated,
      planLimit: limit,
      periodLabel: options.periodLabel,
    },
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function toApiCountries(report: ProcessedReport) {
  return report.countries.map((c) => ({
    country: c.country,
    transactionCategories: c.transactionCategories.map((cat) => ({
      category: cat.category,
      transactions: {
        ALL: cat.ALL || [],
        VAT: cat.VAT || [],
        TRANSACTION: cat.TRANSACTION || [],
      },
    })),
  }));
}

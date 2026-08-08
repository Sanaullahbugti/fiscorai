import Decimal from "./decimal-import.js";

const ROUND_HALF_UP = 4;

Decimal.set({ precision: 40, rounding: ROUND_HALF_UP });

export type ParsedDecimal = {
  raw: string | null;
  value: string | null;
};

/** Parse a source monetary/rate field. Blank stays blank; zero stays zero. */
export function parseDecimal(raw: string | null | undefined): ParsedDecimal {
  const s = (raw ?? "").trim();
  if (!s) return { raw: null, value: null };
  try {
    const d = new Decimal(s);
    if (!d.isFinite()) return { raw: s, value: null };
    return { raw: s, value: d.toFixed() };
  } catch {
    return { raw: s, value: null };
  }
}

export function isZeroDecimal(value: string | null | undefined): boolean {
  if (value == null) return false;
  return new Decimal(value).isZero();
}

export function isNegativeDecimal(value: string | null | undefined): boolean {
  if (value == null) return false;
  return new Decimal(value).isNegative() && !new Decimal(value).isZero();
}

export function isPositiveDecimal(value: string | null | undefined): boolean {
  if (value == null) return false;
  return new Decimal(value).isPositive() && !new Decimal(value).isZero();
}

export function addDecimal(a: string, b: string): string {
  return new Decimal(a).plus(b).toFixed();
}

export function sumDecimals(values: Array<string | null | undefined>): string {
  let total = new Decimal(0);
  for (const v of values) {
    if (v != null && v !== "") total = total.plus(v);
  }
  return total.toFixed();
}

/** Round to currency presentation scale at aggregation boundaries. */
export function roundMoney(value: string, scale = 2): string {
  return new Decimal(value).toDecimalPlaces(scale, ROUND_HALF_UP).toFixed(scale);
}

export function decimalToNumber(value: string): number {
  return new Decimal(value).toNumber();
}

export function formatDisplayMoney(value: string | null, currency?: string | null): string {
  if (value == null) return "—";
  const n = new Decimal(value);
  const neg = n.isNegative();
  const abs = n.abs().toDecimalPlaces(2, ROUND_HALF_UP);
  const [whole, frac] = abs.toFixed(2).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const out = `${neg ? "-" : ""}${grouped}.${frac}`;
  return currency ? `${out} ${currency}` : out;
}

/** Normalize Amazon decimal rate (0.19) to display percent (19). */
export function rateToDisplayPercent(raw: string | null): string | null {
  if (raw == null || raw.trim() === "") return null;
  try {
    const d = new Decimal(raw.trim());
    if (!d.isFinite()) return null;
    if (d.isZero()) return "0%";
    if (d.abs().lessThanOrEqualTo(1)) {
      const pct = d.times(100).toDecimalPlaces(2, ROUND_HALF_UP).toNumber();
      return `${pct % 1 === 0 ? pct.toFixed(0) : pct.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")}%`;
    }
    const pct = d.toDecimalPlaces(2, ROUND_HALF_UP).toNumber();
    return `${pct % 1 === 0 ? pct.toFixed(0) : pct.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")}%`;
  } catch {
    return null;
  }
}

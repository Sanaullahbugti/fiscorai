// Priced below the incumbent EU VAT-analyser tool sellers already know
// (Free / EUR19.90 / EUR49.90 / EUR99.90) — FiscorAI competes on the same
// tiers at a meaningfully lower price, not just on features.
export const PLAN_PRICES: Record<string, number> = {
  Free: 0,
  Basic: 14.99,
  Standard: 39.99,
  Pro: 79.99,
};

/** Plan amounts in cents (EUR) — display / Payment history; Lemon variants own live price. */
export const PLAN_AMOUNT_CENTS: Record<string, number> = {
  Free: 0,
  Basic: 1499,
  Standard: 3999,
  Pro: 7999,
};

export const PAID_PLANS = ["Basic", "Standard", "Pro"] as const;

export function planToCode(plan: string): "0" | "1" | "2" | "3" {
  const p = plan.toLowerCase();
  if (p === "free") return "0";
  if (p === "basic") return "1";
  if (p === "standard") return "2";
  if (p === "pro") return "3";
  return "0";
}

export function normalizePlan(plan?: string): string {
  if (!plan) return "Free";
  const p = plan.charAt(0).toUpperCase() + plan.slice(1).toLowerCase();
  if (["Free", "Basic", "Standard", "Pro"].includes(p)) return p;
  return "Free";
}

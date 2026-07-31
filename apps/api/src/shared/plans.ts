export const PLAN_PRICES: Record<string, number> = {
  Free: 0,
  Basic: 19.9,
  Standard: 49.9,
  Pro: 99.9,
};

/** Stripe unit amounts in cents (EUR). */
export const PLAN_AMOUNT_CENTS: Record<string, number> = {
  Free: 0,
  Basic: 1990,
  Standard: 4990,
  Pro: 9990,
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

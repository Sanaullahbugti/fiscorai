import type { Country } from "@/types/api";
import { CATEGORY_COLORS } from "@/constants";

export function aggregateCountries(data: Country[]) {
  let sales = 0;
  let refunds = 0;
  let vat = 0;
  const byCat: Record<string, number> = {};
  const byCountry: Array<{
    country: string;
    sales: number;
    refunds: number;
    vat: number;
    cats: Array<{ category: string; sale: number }>;
  }> = [];

  for (const c of data || []) {
    let cs = 0;
    let cr = 0;
    let cv = 0;
    const cats: Array<{ category: string; sale: number }> = [];
    for (const cat of c.transactionCategories || []) {
      let sale = 0;
      for (const t of cat.transactions?.TRANSACTION || []) {
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
      }
      cats.push({ category: cat.category, sale });
    }
    byCountry.push({ country: c.country, sales: cs, refunds: cr, vat: cv, cats });
  }

  return { sales, refunds, vat, byCat, byCountry, net: sales + refunds };
}

export function eur(n: number) {
  return `€${(Math.round(n * 100) / 100).toLocaleString("en-IE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function categoryColor(cat: string) {
  return CATEGORY_COLORS[cat] || "#888";
}

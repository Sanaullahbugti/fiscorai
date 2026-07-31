import { describe, expect, it } from "vitest";
import { aggregateCountries, categoryColor, eur } from "./tax-agg";
import type { Country } from "@/types/api";

const sample: Country[] = [
  {
    country: "Germany",
    transactionCategories: [
      {
        category: "UNION-OSS",
        transactions: {
          ALL: [{ total: 107.1, base: 90, vat: 17.1, currency: "EUR" }],
          TRANSACTION: [
            { transaction_type: "SALE", total: 119, base: 100, vat: 19, currency: "EUR" },
            { transaction_type: "REFUND", total: -11.9, base: -10, vat: -1.9, currency: "EUR" },
          ],
        },
      },
    ],
  },
  {
    country: "Italy",
    transactionCategories: [
      {
        category: "REGULAR",
        transactions: {
          ALL: [{ total: 122, base: 100, vat: 22, currency: "EUR" }],
          TRANSACTION: [
            { transaction_type: "SALE", total: 122, base: 100, vat: 22, currency: "EUR" },
          ],
        },
      },
    ],
  },
];

describe("aggregateCountries", () => {
  it("sums sales, refunds, vat, and net", () => {
    const agg = aggregateCountries(sample);
    expect(agg.sales).toBeCloseTo(241);
    expect(agg.refunds).toBeCloseTo(-11.9);
    expect(agg.net).toBeCloseTo(229.1);
    expect(agg.vat).toBeCloseTo(39.1);
    expect(agg.byCat["UNION-OSS"]).toBeCloseTo(119);
    expect(agg.byCat.REGULAR).toBeCloseTo(122);
    expect(agg.byCountry).toHaveLength(2);
  });

  it("handles empty input", () => {
    const agg = aggregateCountries([]);
    expect(agg.sales).toBe(0);
    expect(agg.refunds).toBe(0);
    expect(agg.vat).toBe(0);
    expect(agg.byCountry).toEqual([]);
  });
});

describe("eur", () => {
  it("formats euro amounts", () => {
    expect(eur(119)).toMatch(/^€/);
    expect(eur(119)).toContain("119");
  });
});

describe("categoryColor", () => {
  it("returns known and fallback colors", () => {
    expect(categoryColor("UNION-OSS")).toBe("#C8862B");
    expect(categoryColor("UNKNOWN")).toBe("#888");
  });
});

import { describe, expect, it } from "vitest";
import { buildAllDataSummary, buildPeriodSummary, periodLabel } from "./analyst.summary.js";

const sampleCountries = [
  {
    country: "DE",
    transactionCategories: [
      {
        category: "UNION-OSS",
        transactions: {
          TRANSACTION: [
            { transaction_type: "SALE", total: 1000 },
            { transaction_type: "REFUND", total: -50 },
          ],
          ALL: [{ vat: 190 }],
        },
      },
      {
        category: "REGULAR",
        transactions: {
          TRANSACTION: [{ transaction_type: "SALE", total: 200 }],
          ALL: [{ vat: 38 }],
        },
      },
    ],
  },
  {
    country: "FR",
    transactionCategories: [
      {
        category: "UNION-OSS",
        transactions: {
          TRANSACTION: [{ transaction_type: "SALE", total: 500 }],
          ALL: [{ vat: 100 }],
        },
      },
    ],
  },
];

describe("buildPeriodSummary", () => {
  it("aggregates sales, refunds, VAT, and categories", () => {
    const summary = buildPeriodSummary(sampleCountries, {
      fileType: "monthly",
      year: 2026,
      month: 3,
    });

    expect(summary.period.label).toBe("March 2026");
    expect(summary.totals.sales).toBe(1700);
    expect(summary.totals.refunds).toBe(-50);
    expect(summary.totals.vat).toBe(328);
    expect(summary.byCategory["UNION-OSS"]).toBe(1500);
    expect(summary.byCategory.REGULAR).toBe(200);
    expect(summary.topCountries[0].country).toBe("DE");
    expect(summary.topCountries[0].refundRatePct).toBe(4.17);
    expect(summary.countryCount).toBe(2);
  });
});

describe("buildAllDataSummary", () => {
  it("rolls up multiple periods into overall totals", () => {
    const all = buildAllDataSummary([
      {
        period: { fileType: "monthly", year: 2026, month: 3 },
        countries: sampleCountries,
      },
      {
        period: { fileType: "monthly", year: 2026, month: 2 },
        countries: [
          {
            country: "DE",
            transactionCategories: [
              {
                category: "UNION-OSS",
                transactions: {
                  TRANSACTION: [{ transaction_type: "SALE", total: 100 }],
                  ALL: [{ vat: 19 }],
                },
              },
            ],
          },
        ],
      },
    ]);

    expect(all.scope).toBe("all_uploaded_periods");
    expect(all.periodCount).toBe(2);
    expect(all.overall.sales).toBe(1800);
    expect(all.overall.vat).toBe(347);
    expect(all.byPeriod).toHaveLength(2);
    expect(all.byPeriod[0].period.label).toBe("March 2026");
    expect(periodLabel({ fileType: "quarterly", year: 2025, quarter: "Q1" })).toBe("Q1 2025");
  });
});

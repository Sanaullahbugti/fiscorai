import { describe, expect, it } from "vitest";
import {
  filterFromScope,
  inferSinglePeriodFromText,
  lastUserText,
  looksLikeVatPeriodQuestion,
} from "./analyst.attach.js";

const periods = [
  {
    label: "January 2026",
    fileType: "monthly" as const,
    year: 2026,
    month: "1",
  },
  {
    label: "March 2026",
    fileType: "monthly" as const,
    year: 2026,
    month: "3",
  },
  {
    label: "Q1 2026",
    fileType: "quarterly" as const,
    year: 2026,
    quarter: "Q1",
  },
];

describe("inferSinglePeriodFromText", () => {
  it("matches a full month label in a summary question", () => {
    expect(inferSinglePeriodFromText("Give me January 2026 summary", periods)).toEqual({
      fileType: "monthly",
      year: 2026,
      month: "1",
      quarter: undefined,
    });
  });

  it("matches Q1 2026", () => {
    expect(inferSinglePeriodFromText("Show Q1 2026 VAT summary", periods)).toEqual({
      fileType: "quarterly",
      year: 2026,
      month: undefined,
      quarter: "Q1",
    });
  });

  it("matches abbreviated jan 2026", () => {
    expect(inferSinglePeriodFromText("bring me jan 2026 summery", periods)).toEqual({
      fileType: "monthly",
      year: 2026,
      month: "1",
      quarter: undefined,
    });
  });

  it("does not attach for an overall VAT question", () => {
    expect(inferSinglePeriodFromText("whats my vat?", periods)).toBeNull();
  });

  it("returns null when two periods are named", () => {
    expect(
      inferSinglePeriodFromText("Compare January 2026 and March 2026", periods),
    ).toBeNull();
  });
});

describe("filterFromScope", () => {
  it("returns a filter for a locked monthly scope", () => {
    expect(filterFromScope({ type: "monthly", year: 2026, month: "1" })).toEqual({
      fileType: "monthly",
      year: 2026,
      month: "1",
    });
  });

  it("returns null for all scope", () => {
    expect(filterFromScope({ type: "all" })).toBeNull();
  });
});

describe("looksLikeVatPeriodQuestion", () => {
  it("detects jan 2026 summary including the summery typo", () => {
    expect(looksLikeVatPeriodQuestion("bring me jan 2026 summery")).toBe(true);
    expect(looksLikeVatPeriodQuestion("Show January 2026 VAT summary")).toBe(true);
  });

  it("leaves pure strategy growth questions alone", () => {
    expect(looksLikeVatPeriodQuestion("How can I increase my Amazon sales?")).toBe(false);
  });
});

describe("lastUserText", () => {
  it("reads the latest user text part", () => {
    expect(
      lastUserText([
        { role: "user", parts: [{ type: "text", text: "older" }] },
        { role: "assistant", parts: [{ type: "text", text: "ok" }] },
        { role: "user", parts: [{ type: "text", text: "January summary" }] },
      ]),
    ).toBe("January summary");
  });
});

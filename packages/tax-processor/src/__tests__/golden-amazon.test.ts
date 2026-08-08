import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { processCanonicalReport } from "../pipeline.js";
import { sumActivityIncl, sumVat } from "../report-model.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const goldenCsv = readFileSync(join(__dirname, "fixtures/63260020335.csv"), "utf8");

const goldenInput = {
  planCode: "3" as const,
  fileType: "monthly" as const,
  requestedPeriodLabel: "2025-MAR",
  sourceFileName: "63260020335.csv",
  sourceFileHash: "fixture",
  requestedYear: 2025,
  requestedMonth: 3,
};

describe("63260020335.csv golden regression", () => {
  const result = processCanonicalReport(goldenCsv, goldenInput);
  const rows = result.canonical!.rows;

  it("reconciles successfully", () => {
    expect(["READY", "READY_WITH_WARNINGS"]).toContain(result.reconciliationStatus);
    expect(result.issues.some((i) => i.severity === "BLOCKER")).toBe(false);
    expect(result.canonical).not.toBeNull();
  });

  it("has 144 source rows", () => {
    expect(rows.length).toBe(144);
  });

  it("transaction type counts", () => {
    const types = result.canonical!.view.executiveSummary.transactionTypes;
    expect(types.SALE).toBe(123);
    expect(types.REFUND).toBe(8);
    expect(types.RETURN).toBe(9);
    expect(types.FC_TRANSFER).toBe(4);
  });

  it("scheme counts", () => {
    const schemes = result.canonical!.view.executiveSummary.schemes;
    expect(schemes.REGULAR).toBe(117);
    expect(schemes["UNION-OSS"]).toBe(4);
    expect(schemes["UK_VOEC-IMPORT"]).toBe(7);
    expect(schemes.CH_VOEC).toBe(3);
    expect(schemes["(blank)"]).toBe(13);
  });

  it("responsibility counts", () => {
    const resp = result.canonical!.view.executiveSummary.responsibilities;
    expect(resp.SELLER).toBe(121);
    expect(resp.MARKETPLACE).toBe(10);
    expect(resp["(blank)"]).toBe(13);
  });

  it("REGULAR EUR totals", () => {
    const isRegularEur = (r: (typeof rows)[0]) =>
      (r.taxReportingScheme.value || "") === "REGULAR" && r.transactionCurrencyCode.value === "EUR";
    const sale = sumActivityIncl(rows, (r) => isRegularEur(r) && r.transactionType.value === "SALE");
    const refund = sumActivityIncl(rows, (r) => isRegularEur(r) && r.transactionType.value === "REFUND");
    const net = sumActivityIncl(rows, (r) => isRegularEur(r) && (r.transactionType.value === "SALE" || r.transactionType.value === "REFUND"));
    const vat = sumVat(rows, (r) => isRegularEur(r));
    expect(sale).toBe("1662.71");
    expect(refund).toBe("-124.67");
    expect(net).toBe("1538.04");
    expect(vat).toBe("9.90");
  });

  it("REGULAR SEK totals", () => {
    const isRegularSek = (r: (typeof rows)[0]) =>
      (r.taxReportingScheme.value || "") === "REGULAR" && r.transactionCurrencyCode.value === "SEK";
    expect(sumActivityIncl(rows, isRegularSek)).toBe("338.83");
    expect(sumVat(rows, isRegularSek)).toBe("0.00");
  });

  it("UNION-OSS EUR totals", () => {
    const isOss = (r: (typeof rows)[0]) => (r.taxReportingScheme.value || "") === "UNION-OSS";
    expect(sumActivityIncl(rows, isOss)).toBe("55.85");
    const excl = rows.filter(isOss).reduce((s, r) => s + Number(r.activityValueExcl.value || 0), 0);
    expect(excl.toFixed(2)).toBe("46.16");
    expect(sumVat(rows, isOss)).toBe("9.69");
  });

  it("CH_VOEC and UK_VOEC-IMPORT marketplace totals", () => {
    const ch = result.canonical!.view.schemeSummaries.find(
      (s) => s.sourceTaxReportingScheme === "CH_VOEC" && s.currency === "EUR",
    );
    const uk = result.canonical!.view.schemeSummaries.find(
      (s) => s.sourceTaxReportingScheme === "UK_VOEC-IMPORT" && s.currency === "GBP",
    );
    expect(ch?.activityIncl).toBe("45.13");
    expect(ch?.taxCollectionResponsibility).toBe("MARKETPLACE");
    expect(uk?.activityIncl).toBe("79.24");
    expect(uk?.taxCollectionResponsibility).toBe("MARKETPLACE");
  });

  it("seller VAT identified", () => {
    const sellerVat = result.canonical!.view.executiveSummary.sellerVatIdentified.find((s) => s.currency === "EUR");
    expect(sellerVat?.amount).toBe("19.59");
  });

  it("never collapses CH_VOEC EUR + UK_VOEC GBP into fake EUR total", () => {
    const fakeVoec = result.canonical!.view.schemeSummaries.find(
      (s) => s.sourceTaxReportingScheme === "VOEC" && s.currency === "EUR",
    );
    expect(fakeVoec).toBeUndefined();
    const crossIssue = result.issues.find((i) => i.code === "CROSS_CURRENCY_VOEC_COLLAPSE");
    expect(crossIssue).toBeUndefined();
    const combined = result.canonical!.view.schemeSummaries.find((s) => s.activityIncl === "124.37");
    expect(combined).toBeUndefined();
  });

  it("uses source activity period 2025-MAR", () => {
    expect(result.canonical!.view.provenance.sourceActivityPeriod).toBe("2025-MAR");
  });

  it("rejects wrong requested period", () => {
    const wrong = processCanonicalReport(goldenCsv, { ...goldenInput, requestedPeriodLabel: "2026-JAN", requestedYear: 2026, requestedMonth: 1 });
    expect(wrong.reconciliationStatus).toBe("NOT_READY");
    expect(wrong.issues.some((i) => i.code === "PERIOD_MISMATCH")).toBe(true);
  });
});

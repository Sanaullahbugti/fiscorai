import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { runAudit } from "../audit.js";
import { deriveAllContext } from "../context.js";
import { linkRefunds } from "../link.js";
import { parseAmazonCsv } from "../parse.js";
import { processCanonicalReport } from "../pipeline.js";

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

describe("runAudit", () => {
  const result = processCanonicalReport(goldenCsv, goldenInput);
  const linked = linkRefunds(deriveAllContext(parseAmazonCsv(goldenCsv).rows));
  const view = result.canonical!.view;

  it("passes golden fixture without BLOCKER issues", () => {
    const audit = runAudit(linked, view, result.issues);
    expect(audit.issues.some((i) => i.severity === "BLOCKER")).toBe(false);
    expect(["READY", "READY_WITH_WARNINGS"]).toContain(audit.reconciliationStatus);
  });

  it("detects row count mismatch as BLOCKER", () => {
    const badView = {
      ...view,
      executiveSummary: { ...view.executiveSummary, sourceRecords: 0 },
    };
    const badAudit = runAudit(linked, badView, []);
    expect(badAudit.issues.some((i) => i.code === "ROW_COUNT_MISMATCH")).toBe(true);
    expect(badAudit.reconciliationStatus).toBe("NOT_READY");
  });
});

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { deriveAllContext } from "../context.js";
import { linkRefunds } from "../link.js";
import { parseAmazonCsv } from "../parse.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const goldenCsv = readFileSync(join(__dirname, "fixtures/63260020335.csv"), "utf8");

describe("linkRefunds", () => {
  const rows = linkRefunds(deriveAllContext(parseAmazonCsv(goldenCsv).rows));

  it("keeps exact transaction types", () => {
    const types = rows.reduce<Record<string, number>>((acc, r) => {
      const t = (r.transactionType.value || "").toUpperCase();
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    }, {});
    expect(types.REFUND).toBe(8);
    expect(types.RETURN).toBe(9);
    expect(types.FC_TRANSFER).toBe(4);
  });

  it("matches refunds by exact TRANSACTION_EVENT_ID where unique", () => {
    const matched = rows.filter(
      (r) =>
        (r.transactionType.value || "").toUpperCase() === "REFUND" &&
        r.refundLink.status === "matched",
    );
    expect(matched.length).toBeGreaterThanOrEqual(4);
    for (const refund of matched) {
      expect(refund.refundLink.matchedSourceRow).toBeGreaterThan(0);
      expect(refund.refundLink.provenance).toBe("MATCHED_ORIGINAL_TRANSACTION");
    }
  });

  it("does not label matched refunds as NO COUNTRY when sale context exists", () => {
    const refunds = rows.filter((r) => (r.transactionType.value || "").toUpperCase() === "REFUND");
    for (const refund of refunds) {
      const dest = refund.derived.salesDestination.value;
      if (refund.refundLink.status === "matched") {
        expect(dest).not.toBe("NO COUNTRY");
      }
    }
  });
});

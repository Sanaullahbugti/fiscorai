import { describe, expect, it } from "vitest";
import { getApiErrorCode, parsePeriodMismatch } from "./api-error";

function axiosErr(body: unknown) {
  return { response: { data: body } };
}

describe("parsePeriodMismatch", () => {
  it("reads PERIOD_MISMATCH from issues", () => {
    const info = parsePeriodMismatch(
      axiosErr({
        message: "Period mismatch: …",
        data: {
          issues: [
            {
              code: "PERIOD_MISMATCH",
              severity: "BLOCKER",
              sourceValue: "2025-APR",
              derivedValue: "2026-JAN",
            },
          ],
        },
      }),
    );
    expect(info?.detectedLabel).toBe("April 2025");
    expect(info?.selectedLabel).toBe("January 2026");
    expect(info?.detectedTarget).toEqual({
      fileType: "monthly",
      year: 2025,
      month: "4",
      quarter: "Q2",
    });
  });

  it("returns null for unrelated errors", () => {
    expect(parsePeriodMismatch(axiosErr({ message: "CSV file required" }))).toBeNull();
  });
});

describe("getApiErrorCode", () => {
  it("prefers a period issue code over a generic data.code", () => {
    expect(
      getApiErrorCode(
        axiosErr({
          data: {
            code: "NOT_READY",
            issues: [{ code: "PERIOD_MISMATCH", sourceValue: "2025-APR" }],
          },
        }),
      ),
    ).toBe("PERIOD_MISMATCH");
  });
});

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@/i18n";
import { usePeriodStore } from "@/stores/periodStore";

const uploadCsv = vi.fn();
const userFiles = vi.fn();
const getProcessedJson = vi.fn();

vi.mock("@/api", () => ({
  dataApi: {
    userFiles: () => userFiles(),
    uploadCsv: (...args: unknown[]) => uploadCsv(...args),
    getProcessedJson: (...args: unknown[]) => getProcessedJson(...args),
    downloadFile: vi.fn(),
  },
}));

import { ReportsPage } from "./ReportsPage";

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ReportsPage />
    </QueryClientProvider>,
  );
}

async function attachCsv(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole("button", { name: /Upload CSV/i });
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  const file = new File(["ACTIVITY_PERIOD\n2025-APR\n"], "vat.csv", { type: "text/csv" });
  await user.upload(input, file);
}

describe("ReportsPage upload mismatch", () => {
  beforeEach(() => {
    usePeriodStore.setState({ fileType: "monthly", month: "3", quarter: "Q1", year: 2026 });
    uploadCsv.mockReset();
    userFiles.mockReset();
    getProcessedJson.mockReset();
    userFiles.mockResolvedValue({ data: { monthly: [], quarterly: [] } });
    getProcessedJson.mockResolvedValue({ data: { data: { countries: [] } } });
  });

  afterEach(cleanup);

  it("shows a persistent confirm instead of vanishing when the file period mismatches", async () => {
    const user = userEvent.setup();
    uploadCsv.mockRejectedValue({
      response: {
        data: {
          message: "Period mismatch: the file contains ACTIVITY_PERIOD 2025-APR",
          data: {
            issues: [
              {
                code: "PERIOD_MISMATCH",
                severity: "BLOCKER",
                sourceValue: "2025-APR",
                derivedValue: "2026-MAR",
              },
            ],
          },
        },
      },
    });
    renderPage();
    await attachCsv(user);

    expect(
      await screen.findByText(/This file is for April 2025, but you selected March 2026/i),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: /Change period to April 2025 and upload/i })).toBeTruthy();
    expect(screen.queryByText(/Period mismatch: the file contains/i)).toBeNull();
  });

  it("retries the same file into the detected period", async () => {
    const user = userEvent.setup();
    uploadCsv
      .mockRejectedValueOnce({
        response: {
          data: {
            message: "Period mismatch",
            data: {
              issues: [
                {
                  code: "PERIOD_MISMATCH",
                  sourceValue: "2025-APR",
                  derivedValue: "2026-MAR",
                },
              ],
            },
          },
        },
      })
      .mockResolvedValueOnce({ data: { data: {} } });
    renderPage();
    await attachCsv(user);
    await user.click(await screen.findByRole("button", { name: /Change period to April 2025 and upload/i }));

    await waitFor(() => expect(uploadCsv).toHaveBeenCalledTimes(2));
    const retry = uploadCsv.mock.calls[1][0] as FormData;
    expect(retry.get("month")).toBe("4");
    expect(retry.get("year")).toBe("2025");
    expect(retry.get("fileType")).toBe("monthly");
  });
});

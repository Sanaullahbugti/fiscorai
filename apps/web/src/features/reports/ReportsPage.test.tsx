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

describe("ReportsPage automatic upload period", () => {
  beforeEach(() => {
    usePeriodStore.setState({ fileType: "monthly", month: "3", quarter: "Q1", year: 2026 });
    uploadCsv.mockReset();
    userFiles.mockReset();
    getProcessedJson.mockReset();
    userFiles.mockResolvedValue({ data: { monthly: [], quarterly: [] } });
    getProcessedJson.mockResolvedValue({ data: { data: { countries: [] } } });
  });

  afterEach(cleanup);

  it("uploads without picker fields and switches to the server-detected period", async () => {
    const user = userEvent.setup();
    uploadCsv.mockResolvedValue({
      data: {
        data: {
          status: "ready",
          target: { fileType: "monthly", year: 2025, month: "4", quarter: "Q2" },
          targets: [{ fileType: "monthly", year: 2025, month: "4", quarter: "Q2" }],
        },
      },
    });
    renderPage();
    await attachCsv(user);

    await waitFor(() => expect(uploadCsv).toHaveBeenCalledOnce());
    const form = uploadCsv.mock.calls[0][0] as FormData;
    expect(form.get("file")).toBeInstanceOf(File);
    expect(form.get("month")).toBeNull();
    expect(form.get("year")).toBeNull();
    expect(form.get("fileType")).toBeNull();
    await waitFor(() => {
      expect(usePeriodStore.getState()).toMatchObject({
        fileType: "monthly",
        year: 2025,
        month: "4",
      });
    });
  });

  it("selects the latest generated month after a split upload", async () => {
    const user = userEvent.setup();
    uploadCsv.mockResolvedValue({
      data: {
        data: {
          status: "ready",
          target: { fileType: "monthly", year: 2025, month: "9", quarter: "Q3" },
          targets: [
            { fileType: "monthly", year: 2025, month: "7", quarter: "Q3" },
            { fileType: "monthly", year: 2025, month: "9", quarter: "Q3" },
          ],
        },
      },
    });
    renderPage();
    await attachCsv(user);

    await waitFor(() => expect(uploadCsv).toHaveBeenCalledOnce());
    await waitFor(() => {
      expect(usePeriodStore.getState()).toMatchObject({
        fileType: "monthly",
        year: 2025,
        month: "9",
      });
    });
  });
});

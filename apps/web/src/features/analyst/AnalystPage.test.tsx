import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@/i18n";

const sendMessage = vi.fn();
const uploadCsv = vi.fn();
const userFiles = vi.fn();

const chatState: { messages: unknown[]; status: string } = { messages: [], status: "ready" };

// useChat owns a streaming transport and an EventSource-ish fetch; stub it so the
// tests exercise our page logic rather than the SDK's network layer.
vi.mock("@ai-sdk/react", () => ({
  useChat: () => ({
    messages: chatState.messages,
    sendMessage,
    status: chatState.status,
    error: undefined,
    stop: vi.fn(),
    setMessages: vi.fn(),
    regenerate: vi.fn(),
  }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { userSubscription: { active: true } } }),
}));

const downloadFile = vi.fn();
const listConversations = vi.fn();
const deleteConversation = vi.fn();

vi.mock("@/api", () => ({
  dataApi: {
    userFiles: () => userFiles(),
    uploadCsv: (...args: unknown[]) => uploadCsv(...args),
    downloadFile: (...args: unknown[]) => downloadFile(...args),
  },
  analystApi: {
    quota: () =>
      Promise.resolve({
        data: { data: { premium: true, limit: null, used: 0, remaining: null, exhausted: false } },
      }),
    listConversations: () => listConversations(),
    getConversation: vi.fn(),
    createConversation: vi.fn(),
    renameConversation: vi.fn(),
    deleteConversation: (...args: unknown[]) => deleteConversation(...args),
    addMessages: vi.fn(),
  },
}));

import { AnalystPage } from "./AnalystPage";
import { useUiStore } from "@/stores/uiStore";
import { usePeriodStore } from "@/stores/periodStore";

function vatFile(periods: string[], name = "vat.csv") {
  const body = ["ACTIVITY_PERIOD,TRANSACTION_TYPE", ...periods.map((p) => `${p},SALE`)].join("\n");
  return new File([body], name, { type: "text/csv" });
}

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <AnalystPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("AnalystPage", () => {
  beforeEach(() => {
    localStorage.clear();
    // The ui store is module-scoped, so a mode chosen by one test would
    // otherwise leak into the next and mask the data-driven default.
    useUiStore.setState({ analystMode: null });
    usePeriodStore.setState({ fileType: "monthly", month: "3", quarter: "Q1", year: 2026 });
    chatState.messages = [];
    chatState.status = "ready";
    sendMessage.mockReset();
    uploadCsv.mockReset();
    userFiles.mockReset();
    downloadFile.mockReset();
    deleteConversation.mockReset();
    listConversations.mockReset();
    listConversations.mockResolvedValue({ data: { data: [] } });
  });

  afterEach(cleanup);

  describe("toolbar placement", () => {
    it("portals its controls into the shell header when one is present", async () => {
      userFiles.mockResolvedValue({ data: { monthly: [], quarterly: [] } });
      const host = document.createElement("div");
      host.id = "shell-header-slot";
      document.body.appendChild(host);
      try {
        renderPage();
        const tab = await screen.findByRole("tab", { name: /My VAT Data/i });
        // Living in the shell header is what saves the extra toolbar row.
        expect(host.contains(tab)).toBe(true);
      } finally {
        host.remove();
      }
    });

    it("renders them in place when there is no shell header", async () => {
      userFiles.mockResolvedValue({ data: { monthly: [], quarterly: [] } });
      renderPage();

      // Degrades rather than silently dropping the mode selector.
      expect(await screen.findByRole("tab", { name: /My VAT Data/i })).toBeTruthy();
    });

    it("does not repeat the page title inside the page", async () => {
      userFiles.mockResolvedValue({ data: { monthly: ["3-2026/x.xlsx"], quarterly: [] } });
      chatState.messages = [
        { id: "u1", role: "user", parts: [{ type: "text", text: "hi" }] },
        { id: "a1", role: "assistant", parts: [{ type: "text", text: "hello" }] },
      ];
      renderPage();

      await screen.findByText("hello");
      // The shell header owns the title; an active conversation must not restate it.
      expect(screen.queryByText(/Ask me anything about your VAT data/i)).toBeNull();
    });
  });

  describe("mode switching", () => {
    it("defaults to VAT data mode when the seller has uploads", async () => {
      userFiles.mockResolvedValue({ data: { monthly: ["3-2026/x.xlsx"], quarterly: [] } });
      renderPage();

      const vatTab = await screen.findByRole("tab", { name: /My VAT Data/i });
      await waitFor(() => expect(vatTab.getAttribute("aria-selected")).toBe("true"));
    });

    it("defaults to strategy mode when there are no uploads", async () => {
      userFiles.mockResolvedValue({ data: { monthly: [], quarterly: [] } });
      renderPage();

      const strategyTab = await screen.findByRole("tab", { name: /Ecommerce Strategy/i });
      await waitFor(() => expect(strategyTab.getAttribute("aria-selected")).toBe("true"));
    });

    it("switches mode on click and persists the choice", async () => {
      const user = userEvent.setup();
      userFiles.mockResolvedValue({ data: { monthly: ["3-2026/x.xlsx"], quarterly: [] } });
      renderPage();

      await user.click(await screen.findByRole("tab", { name: /Ecommerce Strategy/i }));

      await waitFor(() => {
        expect(
          screen.getByRole("tab", { name: /Ecommerce Strategy/i }).getAttribute("aria-selected"),
        ).toBe("true");
      });
      expect(localStorage.getItem("fiscor.analystMode")).toBe("ecommerce-strategy");
    });

    it("shows strategy prompts in strategy mode", async () => {
      const user = userEvent.setup();
      userFiles.mockResolvedValue({ data: { monthly: ["3-2026/x.xlsx"], quarterly: [] } });
      renderPage();

      await user.click(await screen.findByRole("tab", { name: /Ecommerce Strategy/i }));

      expect(await screen.findByText(/increase my Amazon sales/i)).toBeTruthy();
    });
  });

  describe("empty state", () => {
    it("prompts for an upload in VAT mode with no data", async () => {
      const user = userEvent.setup();
      userFiles.mockResolvedValue({ data: { monthly: [], quarterly: [] } });
      renderPage();

      // Starts in strategy mode; switching to VAT reveals the upload gate.
      await user.click(await screen.findByRole("tab", { name: /My VAT Data/i }));

      expect(await screen.findByText(/Upload your Amazon VAT report/i)).toBeTruthy();
    });

    it("lets an undata'd seller ask strategy questions without uploading", async () => {
      userFiles.mockResolvedValue({ data: { monthly: [], quarterly: [] } });
      renderPage();

      const box = await screen.findByPlaceholderText(/Amazon or ecommerce growth/i);
      expect((box as HTMLTextAreaElement).disabled).toBe(false);
      // The upload gate must not appear in strategy mode.
      expect(screen.queryByText(/Upload your Amazon VAT report/i)).toBeNull();
    });

    it("offers a strategy escape hatch from the VAT upload gate", async () => {
      const user = userEvent.setup();
      userFiles.mockResolvedValue({ data: { monthly: [], quarterly: [] } });
      renderPage();

      await user.click(await screen.findByRole("tab", { name: /My VAT Data/i }));
      await user.click(await screen.findByRole("button", { name: /strategy question instead/i }));

      await waitFor(() => {
        expect(
          screen.getByRole("tab", { name: /Ecommerce Strategy/i }).getAttribute("aria-selected"),
        ).toBe("true");
      });
    });
  });

  describe("thinking indicator", () => {
    const userTurn = { id: "u1", role: "user", parts: [{ type: "text", text: "vat?" }] };

    it("shows the branded label while the request is in flight", async () => {
      userFiles.mockResolvedValue({ data: { monthly: ["3-2026/x.xlsx"], quarterly: [] } });
      chatState.messages = [userTurn];
      chatState.status = "submitted";
      renderPage();

      expect(await screen.findByText(/FiscorAI is thinking/i)).toBeTruthy();
    });

    it("keeps showing it once streaming starts but no token has arrived", async () => {
      userFiles.mockResolvedValue({ data: { monthly: ["3-2026/x.xlsx"], quarterly: [] } });
      // The SDK flips to "streaming" before the first delta lands; the indicator
      // must survive that gap rather than flashing and disappearing.
      chatState.messages = [userTurn, { id: "a1", role: "assistant", parts: [] }];
      chatState.status = "streaming";
      renderPage();

      expect(await screen.findByText(/FiscorAI is thinking/i)).toBeTruthy();
    });

    it("replaces it with the answer once text arrives", async () => {
      userFiles.mockResolvedValue({ data: { monthly: ["3-2026/x.xlsx"], quarterly: [] } });
      chatState.messages = [
        userTurn,
        { id: "a1", role: "assistant", parts: [{ type: "text", text: "Your VAT is EUR 78.36." }] },
      ];
      chatState.status = "streaming";
      renderPage();

      expect(await screen.findByText(/Your VAT is EUR 78.36/i)).toBeTruthy();
      expect(screen.queryByText(/FiscorAI is thinking/i)).toBeNull();
    });
  });

  describe("downloads only when asked", () => {
    it("shows no download UI on an all-periods answer with no report lookup", async () => {
      userFiles.mockResolvedValue({ data: { monthly: ["3-2026/x.xlsx"], quarterly: [] } });
      // A plain figures answer — the seller asked about VAT overall, not a named period.
      chatState.messages = [
        { id: "u1", role: "user", parts: [{ type: "text", text: "whats my vat?" }] },
        {
          id: "a1",
          role: "assistant",
          parts: [{ type: "text", text: "Your VAT is EUR 19.59." }],
          metadata: {
            mode: "vat-data",
            scope: { type: "all", label: "all periods", periods: ["March 2026"] },
            sources: [
              {
                period: "March 2026",
                countries: ["France"],
                payload: { fileType: "monthly", year: 2026, month: "3" },
              },
            ],
            reportMatches: [],
            generatedAt: "2026-07-31T00:00:00.000Z",
          },
        },
      ];
      renderPage();

      await screen.findByText(/Your VAT is EUR 19.59/i);
      // Metadata names the periods used, but that must not conjure download buttons.
      expect(screen.queryByRole("button", { name: /^PDF$/i })).toBeNull();
      expect(screen.queryByRole("button", { name: /^Excel$/i })).toBeNull();
    });

    it("shows copy and retry on assistant answers, and copy prompt on user turns", async () => {
      userFiles.mockResolvedValue({ data: { monthly: ["1-2026/x.xlsx"], quarterly: [] } });
      chatState.messages = [
        { id: "u1", role: "user", parts: [{ type: "text", text: "Give me January summary" }] },
        {
          id: "a1",
          role: "assistant",
          parts: [{ type: "text", text: "In January 2026 VAT was EUR 19.59." }],
        },
      ];
      renderPage();

      expect(await screen.findByRole("button", { name: /Copy prompt/i })).toBeTruthy();
      expect(screen.getByRole("button", { name: /^Copy$/i })).toBeTruthy();
      expect(screen.getByRole("button", { name: /Retry/i })).toBeTruthy();
    });

    it("shows download cards from metadata when a single-period summary was answered", async () => {
      userFiles.mockResolvedValue({ data: { monthly: ["1-2026/x.xlsx"], quarterly: [] } });
      chatState.messages = [
        { id: "u1", role: "user", parts: [{ type: "text", text: "Give me January summary" }] },
        {
          id: "a1",
          role: "assistant",
          parts: [{ type: "text", text: "In January 2026 you owed EUR 12.00 VAT." }],
          metadata: {
            mode: "vat-data",
            scope: { type: "all", label: "all periods", periods: ["January 2026"] },
            sources: [
              {
                period: "January 2026",
                countries: ["France"],
                payload: { fileType: "monthly", year: 2026, month: "1" },
              },
            ],
            reportMatches: [
              {
                label: "January 2026",
                fileType: "monthly",
                year: 2026,
                month: "1",
                formats: ["pdf", "xlsx"],
                downloads: [
                  {
                    format: "pdf",
                    label: "PDF",
                    downloadUrl:
                      "/api/v1/data/download-file?fileType=monthly&year=2026&fileExtension=pdf&month=1",
                  },
                  {
                    format: "xlsx",
                    label: "Excel",
                    downloadUrl:
                      "/api/v1/data/download-file?fileType=monthly&year=2026&fileExtension=xlsx&month=1",
                  },
                ],
              },
            ],
            generatedAt: "2026-07-31T00:00:00.000Z",
          },
        },
      ];
      renderPage();

      expect(await screen.findByText("January 2026")).toBeTruthy();
      expect(screen.getByRole("button", { name: /PDF/i })).toBeTruthy();
      expect(screen.getByRole("button", { name: /Excel/i })).toBeTruthy();
    });
  });


  describe("AI-resolved report downloads", () => {
    const withTool = (state: string, output?: unknown) => [
      { id: "u1", role: "user", parts: [{ type: "text", text: "give me the january report" }] },
      {
        id: "a1",
        role: "assistant",
        parts: [
          { type: "tool-findReports", toolCallId: "t1", state, output },
          ...(state === "output-available"
            ? [{ type: "text", text: "Here is January 2026." }]
            : []),
        ],
      },
    ];

    it("shows a lookup indicator while the tool runs", async () => {
      userFiles.mockResolvedValue({ data: { monthly: ["1-2026/x.xlsx"], quarterly: [] } });
      chatState.messages = withTool("input-available");
      chatState.status = "streaming";
      renderPage();

      expect(await screen.findByText(/Checking your reports/i)).toBeTruthy();
      // The tool card stands in for the generic indicator, not alongside it.
      expect(screen.queryByText(/FiscorAI is thinking/i)).toBeNull();
    });

    it("renders a download card per report the tool found", async () => {
      userFiles.mockResolvedValue({ data: { monthly: ["1-2026/x.xlsx"], quarterly: [] } });
      chatState.messages = withTool("output-available", {
        matches: [
          { label: "January 2026", fileType: "monthly", year: 2026, month: "1", formats: ["pdf", "xlsx"] },
        ],
        available: ["January 2026"],
        requested: "January 2026",
      });
      renderPage();

      expect(await screen.findByText("January 2026")).toBeTruthy();
      expect(screen.getByRole("button", { name: /PDF/i })).toBeTruthy();
      expect(screen.getByRole("button", { name: /Excel/i })).toBeTruthy();
    });

    it("downloads the period the tool resolved, with no picker involved", async () => {
      const user = userEvent.setup();
      userFiles.mockResolvedValue({ data: { monthly: ["1-2026/x.xlsx"], quarterly: [] } });
      downloadFile.mockResolvedValue({ data: new Blob(["x"]) });
      chatState.messages = withTool("output-available", {
        matches: [
          { label: "January 2026", fileType: "monthly", year: 2026, month: "1", formats: ["pdf", "xlsx"] },
        ],
        available: ["January 2026"],
        requested: "January 2026",
      });
      renderPage();

      await user.click(await screen.findByRole("button", { name: /Excel/i }));

      await waitFor(() => expect(downloadFile).toHaveBeenCalled());
      expect(downloadFile.mock.calls[0][0]).toMatchObject({
        fileType: "monthly",
        year: 2026,
        month: "1",
        fileExtension: "xlsx",
      });
    });

    it("says so when the requested period is not in storage", async () => {
      userFiles.mockResolvedValue({ data: { monthly: ["1-2026/x.xlsx"], quarterly: [] } });
      chatState.messages = withTool("output-available", {
        matches: [],
        available: ["January 2026"],
        requested: "December 2026",
      });
      renderPage();

      expect(await screen.findByText(/No report for December 2026/i)).toBeTruthy();
      expect(screen.queryByRole("button", { name: /^PDF$/i })).toBeNull();
    });

    it("only offers the formats that exist on disk", async () => {
      userFiles.mockResolvedValue({ data: { monthly: ["1-2026/x.xlsx"], quarterly: [] } });
      chatState.messages = withTool("output-available", {
        matches: [
          { label: "January 2026", fileType: "monthly", year: 2026, month: "1", formats: ["xlsx"] },
        ],
        available: ["January 2026"],
        requested: "January 2026",
      });
      renderPage();

      expect(await screen.findByRole("button", { name: /Excel/i })).toBeTruthy();
      expect(screen.queryByRole("button", { name: /^PDF$/i })).toBeNull();
    });
  });

  describe("conversation history", () => {
    it("lists saved conversations in the drawer", async () => {
      const user = userEvent.setup();
      userFiles.mockResolvedValue({ data: { monthly: [], quarterly: [] } });
      listConversations.mockResolvedValue({
        data: {
          data: [
            {
              id: "c1",
              title: "VAT by country",
              mode: "vat-data",
              createdAt: "2026-07-30T00:00:00.000Z",
              updatedAt: "2026-07-30T00:00:00.000Z",
            },
          ],
        },
      });
      renderPage();

      await user.click(await screen.findByRole("button", { name: /^History$/i }));

      expect(await screen.findByRole("dialog", { name: /History/i })).toBeTruthy();
      expect(screen.getByText("VAT by country")).toBeTruthy();
    });

    it("explains the empty state when nothing is saved", async () => {
      const user = userEvent.setup();
      userFiles.mockResolvedValue({ data: { monthly: [], quarterly: [] } });
      renderPage();

      await user.click(await screen.findByRole("button", { name: /^History$/i }));

      expect(await screen.findByText(/No saved conversations yet/i)).toBeTruthy();
    });

    it("deletes a conversation from the drawer", async () => {
      const user = userEvent.setup();
      userFiles.mockResolvedValue({ data: { monthly: [], quarterly: [] } });
      listConversations.mockResolvedValue({
        data: {
          data: [
            {
              id: "c1",
              title: "VAT by country",
              mode: "vat-data",
              createdAt: "2026-07-30T00:00:00.000Z",
              updatedAt: "2026-07-30T00:00:00.000Z",
            },
          ],
        },
      });
      deleteConversation.mockResolvedValue({ data: { data: { id: "c1" } } });
      renderPage();

      await user.click(await screen.findByRole("button", { name: /^History$/i }));
      await user.click(await screen.findByRole("button", { name: /Delete/i }));

      await waitFor(() => expect(deleteConversation).toHaveBeenCalledWith("c1"));
    });
  });

  describe("upload entry point", () => {
    it("exposes an attach control in the composer", async () => {
      userFiles.mockResolvedValue({ data: { monthly: [], quarterly: [] } });
      renderPage();

      expect(await screen.findByRole("button", { name: /Attach VAT report/i })).toBeTruthy();
      expect(await screen.findByTestId("analyst-file-input")).toBeTruthy();
    });

    it("stays attachable while VAT mode is gated on having no data", async () => {
      const user = userEvent.setup();
      userFiles.mockResolvedValue({ data: { monthly: [], quarterly: [] } });
      renderPage();

      await user.click(await screen.findByRole("tab", { name: /My VAT Data/i }));

      // The composer is disabled here, but attaching must remain possible —
      // it is the only way out of the empty state.
      const attach = screen.getByRole("button", { name: /Attach VAT report/i });
      expect((attach as HTMLButtonElement).disabled).toBe(false);
    });

    it("shows the detected period instead of period dropdowns once a file is picked", async () => {
      const user = userEvent.setup();
      userFiles.mockResolvedValue({ data: { monthly: [], quarterly: [] } });
      renderPage();

      await user.upload(await screen.findByTestId("analyst-file-input") as HTMLInputElement, vatFile(["2025-APR"]));

      expect(await screen.findByText("vat.csv")).toBeTruthy();
      expect(await screen.findByText(/This report is for April 2025/i)).toBeTruthy();
      expect(screen.queryByDisplayValue("Monthly")).toBeNull();
      expect(screen.getByRole("button", { name: /Upload and process/i })).toBeTruthy();
    });

    it("hides the chip again when the attachment is removed", async () => {
      const user = userEvent.setup();
      userFiles.mockResolvedValue({ data: { monthly: [], quarterly: [] } });
      renderPage();

      await user.upload(await screen.findByTestId("analyst-file-input") as HTMLInputElement, vatFile(["2025-APR"]));
      await user.click(await screen.findByRole("button", { name: /Remove file/i }));

      await waitFor(() => expect(screen.queryByText("vat.csv")).toBeNull());
    });

    it("uploads using the ACTIVITY_PERIOD detected from the file", async () => {
      const user = userEvent.setup();
      userFiles.mockResolvedValue({ data: { monthly: [], quarterly: [] } });
      uploadCsv.mockResolvedValue({ data: { data: {} } });
      renderPage();

      await user.upload(await screen.findByTestId("analyst-file-input") as HTMLInputElement, vatFile(["2025-APR"]));
      await user.click(await screen.findByRole("button", { name: /Upload and process/i }));

      await waitFor(() => expect(uploadCsv).toHaveBeenCalled());
      const form = uploadCsv.mock.calls[0][0] as FormData;
      expect(form.get("fileType")).toBe("monthly");
      expect(form.get("month")).toBe("4");
      expect(form.get("year")).toBe("2025");
      expect(form.get("quarter")).toBeNull();
      expect(form.get("file")).toBeTruthy();
    });

    it("asks to confirm when the file period disagrees with an existing selection", async () => {
      const user = userEvent.setup();
      userFiles.mockResolvedValue({ data: { monthly: ["3-2026/x.csvprocesado.xlsx"], quarterly: [] } });
      renderPage();

      await user.upload(await screen.findByTestId("analyst-file-input") as HTMLInputElement, vatFile(["2025-APR"]));

      expect(
        await screen.findByText(/This file is for April 2025, but your selected period is March 2026/i),
      ).toBeTruthy();
      const change = screen.getByRole("button", { name: /Change period to April 2025/i });
      expect(change).toBeTruthy();
      expect(uploadCsv).not.toHaveBeenCalled();

      await user.click(change);

      expect(usePeriodStore.getState().month).toBe("4");
      expect(usePeriodStore.getState().year).toBe(2025);
      expect(await screen.findByText(/This report is for April 2025/i)).toBeTruthy();
      expect(screen.getByRole("button", { name: /Upload and process/i })).toBeTruthy();
    });

    it("keeps a mismatch confirm after the server rejects the selected period", async () => {
      const user = userEvent.setup();
      userFiles.mockResolvedValue({ data: { monthly: [], quarterly: [] } });
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

      const file = new File(["a,b\n1,2"], "vat.csv", { type: "text/csv" });
      await user.upload(await screen.findByTestId("analyst-file-input") as HTMLInputElement, file);
      await user.click(await screen.findByRole("button", { name: /Upload and process/i }));

      expect(
        await screen.findByText(/This file is for April 2025, but your selected period is March 2026/i),
      ).toBeTruthy();
      expect(screen.getByRole("button", { name: /Change period to April 2025/i })).toBeTruthy();
    });

    it("shows a processing status in the transcript while the upload is in flight", async () => {
      const user = userEvent.setup();
      userFiles.mockResolvedValue({ data: { monthly: [], quarterly: [] } });
      let finish: (value: unknown) => void = () => undefined;
      uploadCsv.mockReturnValue(
        new Promise((resolve) => {
          finish = resolve;
        }),
      );
      renderPage();

      await user.upload(await screen.findByTestId("analyst-file-input") as HTMLInputElement, vatFile(["2025-APR"]));
      await user.click(await screen.findByRole("button", { name: /Upload and process/i }));

      expect(await screen.findByText(/FiscorAI is processing your report/i)).toBeTruthy();
      expect(screen.getByText(/Reading transactions and preparing your VAT report/i)).toBeTruthy();
      finish({ data: { data: {} } });
      await waitFor(() => expect(screen.queryByText(/FiscorAI is processing your report/i)).toBeNull());
    });
  });
});

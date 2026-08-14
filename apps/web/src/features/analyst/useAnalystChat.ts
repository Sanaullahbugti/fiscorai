import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { analystApi, dataApi } from "@/api";
import { queryKeys } from "@/api/queryKeys";
import { API_BASE_URL, STORAGE_KEYS } from "@/constants";
import { useShellPeriod } from "@/hooks/PeriodProvider";
import { useCsvUpload } from "@/hooks/useCsvUpload";
import { useUiStore } from "@/stores/uiStore";
import { formatPeriodLabel } from "@/lib/period-label";
import { useConversations } from "./useConversations";
import type { AnalystMode, AnalystScope } from "./analyst.types";

/** Flattens a UIMessage's text parts, which is where useChat keeps streamed content. */
export function messageText(m: UIMessage): string {
  return m.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

/**
 * Period + figures asks belong in VAT-data mode. Mirrors the API helper so the
 * client can flip the mode tab before the request leaves.
 */
export function looksLikeVatPeriodQuestion(text: string): boolean {
  const lower = text.toLowerCase();
  const wantsFigures =
    /\b(summar(?:y|ies)|summery|totals?|vat|tax|refunds?|report|pdf|excel|xlsx|breakdown|figures?|owe|liability|sales)\b/.test(
      lower,
    );
  if (!wantsFigures) return false;
  return (
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?|q[1-4])\b/.test(
      lower,
    ) || (/\b20\d{2}\b/.test(lower) && /\b(month|quarter|period)\b/.test(lower))
  );
}

export function useAnalystChat() {
  const { t, i18n } = useTranslation("analyst");
  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [input, setInput] = useState("");
  const [scopeAll, setScopeAll] = useState(true);
  const queryClient = useQueryClient();
  const period = useShellPeriod();

  const storedMode = useUiStore((s) => s.analystMode);
  const setStoredMode = useUiStore((s) => s.setAnalystMode);

  const filesQuery = useQuery({
    queryKey: queryKeys.userFiles(),
    queryFn: async () => {
      const res = await dataApi.userFiles();
      return res.data;
    },
  });

  const quotaQuery = useQuery({
    queryKey: queryKeys.analystQuota(),
    queryFn: async () => {
      const res = await analystApi.quota();
      return res.data.data;
    },
  });

  const hasData =
    (filesQuery.data?.monthly?.length || 0) + (filesQuery.data?.quarterly?.length || 0) > 0;

  // Data-backed sellers land on their figures; everyone else starts in strategy,
  // which is the only mode that works before a first upload.
  const mode: AnalystMode = storedMode ?? (hasData ? "vat-data" : "ecommerce-strategy");
  const isStrategy = mode === "ecommerce-strategy";

  const scope: AnalystScope = useMemo(() => {
    if (scopeAll) return { type: "all" };
    return period.fileType === "monthly"
      ? { type: "monthly", year: period.year, month: period.month }
      : { type: "quarterly", year: period.year, quarter: period.quarter };
  }, [scopeAll, period.fileType, period.year, period.month, period.quarter]);

  const scopeLabel = scopeAll
    ? t("scopeAll")
    : formatPeriodLabel({
        fileType: period.fileType,
        year: period.year,
        month: period.month,
        quarter: period.quarter,
      });

  const prompts = isStrategy
    ? [t("strategyPrompts.increaseSales"), t("strategyPrompts.expandMarket"), t("strategyPrompts.reduceRefunds")]
    : [
        t("prompts.momVatChange"),
        t("prompts.filingChecklist"),
        t("prompts.rateExposure"),
        t("prompts.vatByCountry"),
        t("prompts.refundAnomalies"),
        t("prompts.ossVsRegular"),
      ];

  const language = i18n.language?.slice(0, 2) || "en";

  // `headers` and `body` are resolved per-request, so the token and the currently
  // selected mode/scope are read fresh at send time rather than captured once.
  const modeRef = useRef(mode);
  const scopeRef = useRef(scope);
  modeRef.current = mode;
  scopeRef.current = scope;

  const transport = useMemo(
    () =>
      new DefaultChatTransport<UIMessage>({
        api: `${API_BASE_URL}/api/v1/analyst/stream`,
        headers: (): Record<string, string> => {
          const token = localStorage.getItem(STORAGE_KEYS.accessToken);
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
        body: () => ({ language, mode: modeRef.current, scope: scopeRef.current }),
      }),
    [language],
  );

  const refreshQuota = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.analystQuota() });
  }, [queryClient]);

  const history = useConversations();
  const historyRef = useRef(history);
  historyRef.current = history;

  const { messages, sendMessage, status, error, stop, setMessages, regenerate } = useChat({
    transport,
    // The server books the question, so re-read the allowance rather than
    // decrementing locally — that keeps the counter right across tabs too.
    onFinish: ({ messages: done }) => {
      refreshQuota();
      void historyRef.current.persist(done, modeRef.current);
    },
    onError: refreshQuota,
  });

  const busy = status === "submitted" || status === "streaming";
  const quota = quotaQuery.data;
  const locked = !!quota && !quota.premium && quota.exhausted;
  // Strategy answers need no uploads; data answers do.
  const needsUpload = !isStrategy && !hasData;

  const csv = useCsvUpload({
    skipSuccessToast: true,
    onUploaded: (_result, target) => {
      // Point the chat at what was just uploaded, then say so in the transcript.
      setScopeAll(true);
      period.setFileType(target.fileType);
      period.setYear(target.year);
      period.setPeriodValue(target.fileType === "monthly" ? target.month : target.quarter);
      const label = formatPeriodLabel({
        fileType: target.fileType,
        year: target.year,
        month: target.month,
        quarter: target.quarter,
      });
      setMessages((prev) => [
        ...prev,
        {
          id: `upload-${Date.now()}`,
          role: "assistant",
          parts: [{ type: "text", text: t("uploadedMessage", { period: label }) }],
        } as UIMessage,
      ]);
      if (!storedMode) setStoredMode("vat-data");
    },
  });

  // Pin to the newest content while an answer streams in.
  useEffect(() => {
    const el = chatRef.current;
    if (!el) return;
    const timer = setTimeout(() => {
      el.scrollTop = el.scrollHeight;
    }, 0);
    return () => clearTimeout(timer);
  }, [messages, status, csv.uploading, csv.uploadPct]);

  const answerQuestion = useCallback(
    (q: string) => {
      const text = q.trim();
      if (!text || busy || locked) return;
      // Period/VAT summaries sent while Strategy is selected still need the
      // data analyst — otherwise sellers get a growth template and no downloads.
      if (
        hasData &&
        modeRef.current === "ecommerce-strategy" &&
        looksLikeVatPeriodQuestion(text)
      ) {
        setStoredMode("vat-data");
        modeRef.current = "vat-data";
      }
      void sendMessage({ text });
      inputRef.current?.focus();
    },
    [busy, locked, hasData, sendMessage, setStoredMode],
  );

  const submit = useCallback(() => {
    const q = input.trim();
    if (!q || busy || locked) return;
    setInput("");
    answerQuestion(q);
  }, [input, busy, locked, answerQuestion]);

  const clear = useCallback(() => {
    setMessages([]);
    history.startNew();
  }, [setMessages, history]);

  const openConversation = useCallback(
    async (id: string) => {
      const loaded = await history.open(id);
      setMessages(loaded);
    },
    [history, setMessages],
  );

  const uploadNow = useCallback(
    () => csv.upload({
      fileType: period.fileType,
      year: period.year,
      month: period.month,
      quarter: period.quarter,
    }),
    [csv, period.fileType, period.year, period.month, period.quarter],
  );

  return {
    hasData,
    loadingFiles: filesQuery.isLoading,
    quota,
    locked,
    mode,
    isStrategy,
    setMode: setStoredMode,
    scopeAll,
    setScopeAll,
    scopeLabel,
    period,
    needsUpload,
    csv,
    uploadNow,
    messages,
    clear,
    history,
    openConversation,
    input,
    setInput,
    busy,
    streaming: status === "streaming",
    error: error ? error.message || t("analyzeFailed") : "",
    chatRef,
    inputRef,
    prompts,
    answerQuestion,
    submit,
    stop,
    regenerate,
  };
}

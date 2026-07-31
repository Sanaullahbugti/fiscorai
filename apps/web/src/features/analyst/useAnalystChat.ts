import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { analystApi, dataApi } from "@/api";
import { queryKeys } from "@/api/queryKeys";
import { API_BASE_URL, STORAGE_KEYS } from "@/constants";

/** Flattens a UIMessage's text parts, which is where useChat keeps streamed content. */
export function messageText(m: UIMessage): string {
  return m.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

export function useAnalystChat() {
  const { t, i18n } = useTranslation("analyst");
  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [input, setInput] = useState("");

  const queryClient = useQueryClient();

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

  const prompts = [
    t("prompts.vatByCountry"),
    t("prompts.refundAnomalies"),
    t("prompts.ossVsRegular"),
  ];

  const language = i18n.language?.slice(0, 2) || "en";

  // `headers` and `body` are resolved per-request, so the token is read fresh at
  // send time rather than captured once when the transport is constructed.
  const transport = useMemo(
    () =>
      new DefaultChatTransport<UIMessage>({
        api: `${API_BASE_URL}/api/v1/analyst/stream`,
        headers: (): Record<string, string> => {
          const token = localStorage.getItem(STORAGE_KEYS.accessToken);
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
        body: () => ({ language }),
      }),
    [language],
  );

  const refreshQuota = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.analystQuota() });
  }, [queryClient]);

  const { messages, sendMessage, status, error, stop, setMessages, regenerate } = useChat({
    transport,
    // The server books the question, so re-read the allowance rather than
    // decrementing locally — that keeps the counter right across tabs too.
    onFinish: refreshQuota,
    onError: refreshQuota,
  });

  const busy = status === "submitted" || status === "streaming";
  const quota = quotaQuery.data;
  // Block sending once the allowance is gone, but never while premium.
  const locked = !!quota && !quota.premium && quota.exhausted;

  // Pin to the newest content while an answer streams in.
  useEffect(() => {
    const el = chatRef.current;
    if (!el) return;
    const timer = setTimeout(() => {
      el.scrollTop = el.scrollHeight;
    }, 0);
    return () => clearTimeout(timer);
  }, [messages, status]);

  const answerQuestion = useCallback(
    (q: string) => {
      const text = q.trim();
      if (!text || busy || locked) return;
      void sendMessage({ text });
      inputRef.current?.focus();
    },
    [busy, locked, sendMessage],
  );

  const submit = useCallback(() => {
    const q = input.trim();
    if (!q || busy || locked) return;
    setInput("");
    answerQuestion(q);
  }, [input, busy, locked, answerQuestion]);

  const clear = useCallback(() => setMessages([]), [setMessages]);

  return {
    hasData,
    loadingFiles: filesQuery.isLoading,
    quota,
    locked,
    messages,
    clear,
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

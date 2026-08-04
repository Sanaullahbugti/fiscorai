import { useCallback, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UIMessage } from "ai";
import { analystApi, type NewMessage } from "@/api";
import { queryKeys } from "@/api/queryKeys";
import type { AnalystMode } from "./analyst.types";

const TITLE_MAX = 60;

/** First user message, trimmed to something that fits a sidebar row. */
export function deriveTitle(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return "New conversation";
  return clean.length > TITLE_MAX ? `${clean.slice(0, TITLE_MAX - 1)}…` : clean;
}

function textOf(m: UIMessage): string {
  return m.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

export function useConversations() {
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  // Ids already written to the server, so a re-render never double-saves a turn.
  const savedIds = useRef<Set<string>>(new Set());

  const listQuery = useQuery({
    queryKey: queryKeys.conversations(),
    queryFn: async () => (await analystApi.listConversations()).data.data ?? [],
  });

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.conversations() });
  }, [queryClient]);

  const renameMutation = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      analystApi.renameConversation(id, title),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => analystApi.deleteConversation(id),
    onSuccess: (_r, id) => {
      if (id === activeId) {
        setActiveId(null);
        savedIds.current.clear();
      }
      invalidate();
    },
  });

  /**
   * Writes any turns that aren't persisted yet, creating the conversation on the
   * first save. Failures are swallowed — losing history is not worth interrupting
   * a chat the user can still read on screen.
   */
  const persist = useCallback(
    async (messages: UIMessage[], mode: AnalystMode) => {
      const pending = messages.filter((m) => !savedIds.current.has(m.id) && textOf(m).trim());
      if (!pending.length) return;

      try {
        let id = activeId;
        if (!id) {
          const firstUser = messages.find((m) => m.role === "user");
          const created = await analystApi.createConversation({
            title: deriveTitle(firstUser ? textOf(firstUser) : ""),
            mode,
          });
          id = created.data.data?.id ?? null;
          if (!id) return;
          setActiveId(id);
        }

        const payload: NewMessage[] = pending.map((m) => ({
          role: m.role === "user" ? "user" : "assistant",
          content: textOf(m),
          metadataJson: m.metadata ? JSON.stringify(m.metadata) : null,
        }));

        await analystApi.addMessages(id, payload);
        pending.forEach((m) => savedIds.current.add(m.id));
        invalidate();
      } catch {
        /* history is best-effort; the visible transcript is unaffected */
      }
    },
    [activeId, invalidate],
  );

  /** Loads a stored conversation back into useChat's message shape. */
  const open = useCallback(async (id: string): Promise<UIMessage[]> => {
    const res = await analystApi.getConversation(id);
    const detail = res.data.data;
    if (!detail) return [];
    setActiveId(id);
    savedIds.current = new Set(detail.messages.map((m) => m.id));
    return detail.messages.map((m) => ({
      id: m.id,
      role: m.role,
      parts: [{ type: "text", text: m.content }],
      metadata: m.metadataJson ? safeParse(m.metadataJson) : undefined,
    })) as UIMessage[];
  }, []);

  const startNew = useCallback(() => {
    setActiveId(null);
    savedIds.current.clear();
  }, []);

  return {
    conversations: listQuery.data ?? [],
    loadingList: listQuery.isLoading,
    activeId,
    persist,
    open,
    startNew,
    rename: (id: string, title: string) => renameMutation.mutate({ id, title }),
    remove: (id: string) => deleteMutation.mutate(id),
  };
}

function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

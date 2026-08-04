import { http } from "./http";
import type { GeneralResponse } from "@/types/api";

export type AnalystQuota = {
  premium: boolean;
  /** null when the user is premium (unmetered). */
  limit: number | null;
  used: number;
  remaining: number | null;
  exhausted: boolean;
};

export type ConversationSummary = {
  id: string;
  title: string;
  mode: string;
  createdAt: string;
  updatedAt: string;
};

export type StoredMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  metadataJson: string | null;
  createdAt: string;
};

export type ConversationDetail = ConversationSummary & { messages: StoredMessage[] };

export type NewMessage = {
  role: "user" | "assistant";
  content: string;
  metadataJson?: string | null;
};

export const analystApi = {
  quota: () => http.get<GeneralResponse<AnalystQuota>>("/api/v1/analyst/quota"),

  listConversations: () =>
    http.get<GeneralResponse<ConversationSummary[]>>("/api/v1/analyst/conversations"),
  getConversation: (id: string) =>
    http.get<GeneralResponse<ConversationDetail>>(`/api/v1/analyst/conversations/${id}`),
  createConversation: (body: { title: string; mode?: string }) =>
    http.post<GeneralResponse<ConversationSummary>>("/api/v1/analyst/conversations", body),
  renameConversation: (id: string, title: string) =>
    http.patch<GeneralResponse<{ id: string; title: string }>>(
      `/api/v1/analyst/conversations/${id}`,
      { title },
    ),
  deleteConversation: (id: string) =>
    http.delete<GeneralResponse<{ id: string }>>(`/api/v1/analyst/conversations/${id}`),
  addMessages: (id: string, messages: NewMessage[]) =>
    http.post<GeneralResponse<ConversationSummary>>(
      `/api/v1/analyst/conversations/${id}/messages`,
      { messages },
    ),
};

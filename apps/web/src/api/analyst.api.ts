import { http } from "./http";
import type { GeneralResponse } from "@/types/api";

export type AnalystAskResponse = {
  answer: string;
  model: string | null;
  source: "gemini" | "fallback";
};

export type AnalystQuota = {
  premium: boolean;
  /** null when the user is premium (unmetered). */
  limit: number | null;
  used: number;
  remaining: number | null;
  exhausted: boolean;
};

export const analystApi = {
  ask: (body: { question: string; language?: string }) =>
    http.post<GeneralResponse<AnalystAskResponse>>("/api/v1/analyst/ask", body),
  quota: () => http.get<GeneralResponse<AnalystQuota>>("/api/v1/analyst/quota"),
};

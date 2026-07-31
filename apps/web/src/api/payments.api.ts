import { http } from "./http";
import type { GeneralResponse, PaymentRecord, SavedCard } from "@/types/api";

export const paymentsApi = {
  checkout: (plan: string) =>
    http.post<GeneralResponse<{ sessionId: string; url: string | null; publishableKey: string | null }>>(
      "/api/v1/payments/create-checkout-session",
      { plan },
    ),
  confirmSession: (sessionId: string) =>
    http.post<GeneralResponse<{ plan: string; alreadyProcessed: boolean }>>(
      "/api/v1/payments/confirm-session",
      { sessionId },
    ),
  list: () => http.get<GeneralResponse<PaymentRecord[]>>("/api/v1/payments"),
  cards: () => http.get<GeneralResponse<SavedCard[]>>("/api/v1/payments/cards"),
  deleteCard: (id: string) =>
    http.delete<GeneralResponse<{ deleted: boolean }>>(
      `/api/v1/payments/cards/${encodeURIComponent(id)}`,
    ),
};

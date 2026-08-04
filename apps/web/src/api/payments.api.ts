import { http } from "./http";
import type { GeneralResponse, PaymentRecord } from "@/types/api";

export const paymentsApi = {
  checkout: (plan: string) =>
    http.post<GeneralResponse<{ sessionId: string; url: string | null }>>(
      "/api/v1/payments/create-checkout-session",
      { plan },
    ),
  confirmSession: (sessionId?: string) =>
    http.post<GeneralResponse<{ plan: string; alreadyProcessed: boolean; pending?: boolean }>>(
      "/api/v1/payments/confirm-session",
      sessionId ? { sessionId } : {},
    ),
  list: () => http.get<GeneralResponse<PaymentRecord[]>>("/api/v1/payments"),
  portal: () => http.get<GeneralResponse<{ url: string }>>("/api/v1/payments/portal"),
};

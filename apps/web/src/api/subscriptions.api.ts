import { http } from "./http";
import type { GeneralResponse, SubscriptionInfo } from "@/types/api";

export const subscriptionsApi = {
  current: () =>
    http.get<GeneralResponse<SubscriptionInfo>>("/api/v1/subscriptions/userSubscription"),
  unsubscribe: () => http.delete<GeneralResponse<string>>("/api/v1/subscriptions/unSubscribe"),
  activate: (plan: string) =>
    http.post<GeneralResponse<SubscriptionInfo>>("/api/v1/subscriptions/activate", { plan }),
};

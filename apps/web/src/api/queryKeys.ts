import type { PeriodPayload } from "@/types/api";

export const queryKeys = {
  processed: (p: PeriodPayload) =>
    ["processed", p.fileType, p.year, p.month ?? null, p.quarter ?? null] as const,
  userFiles: () => ["userFiles"] as const,
  subscription: () => ["subscription"] as const,
  payments: () => ["payments"] as const,
  cards: () => ["cards"] as const,
  profile: () => ["profile"] as const,
  analystQuota: () => ["analystQuota"] as const,
};

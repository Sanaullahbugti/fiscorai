import { useQuery } from "@tanstack/react-query";
import { dataApi } from "@/api";
import { queryKeys } from "@/api/queryKeys";
import type { PeriodPayload } from "@/types/api";

export function usePeriodInsights(payload: PeriodPayload, enabled = true) {
  const query = useQuery({
    queryKey: queryKeys.insights(payload),
    queryFn: async () => {
      try {
        const res = await dataApi.insights(payload);
        return res.data.data ?? null;
      } catch {
        return null;
      }
    },
    enabled,
    retry: false,
  });

  const insights = query.data ?? null;
  const attentionCount =
    insights?.alerts.filter((a) => a.sev === "critical" || a.sev === "warning").length ?? 0;

  return {
    insights,
    loading: query.isPending,
    attentionCount,
    query,
  };
}

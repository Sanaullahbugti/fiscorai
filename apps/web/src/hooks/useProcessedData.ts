import { useQuery } from "@tanstack/react-query";
import { dataApi } from "@/api";
import { queryKeys } from "@/api/queryKeys";
import type { PeriodPayload } from "@/types/api";

export function useProcessedData(payload: PeriodPayload) {
  const query = useQuery({
    queryKey: queryKeys.processed(payload),
    queryFn: async () => {
      const res = await dataApi.getProcessedJson(payload);
      return res.data.data || [];
    },
  });

  return {
    data: query.data ?? [],
    loading: query.isPending,
    hasData: (query.data?.length ?? 0) > 0,
    reload: async () => {
      await query.refetch();
    },
    query,
  };
}

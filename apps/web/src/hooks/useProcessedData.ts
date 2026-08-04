import { useQuery } from "@tanstack/react-query";
import { dataApi } from "@/api";
import { queryKeys } from "@/api/queryKeys";
import type { Country, PeriodPayload, ProcessMeta, ProcessedPayload } from "@/types/api";

function normalizeProcessed(data: ProcessedPayload | Country[] | undefined): {
  countries: Country[];
  meta: ProcessMeta | null;
} {
  if (!data) return { countries: [], meta: null };
  if (Array.isArray(data)) return { countries: data, meta: null };
  return { countries: data.countries || [], meta: data.meta ?? null };
}

export function useProcessedData(payload: PeriodPayload) {
  const query = useQuery({
    queryKey: queryKeys.processed(payload),
    queryFn: async () => {
      const res = await dataApi.getProcessedJson(payload);
      return normalizeProcessed(res.data.data);
    },
  });

  const countries = query.data?.countries ?? [];
  return {
    data: countries,
    meta: query.data?.meta ?? null,
    loading: query.isPending,
    hasData: countries.length > 0,
    reload: async () => {
      await query.refetch();
    },
    query,
  };
}

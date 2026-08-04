import { useQuery } from "@tanstack/react-query";
import { dataApi } from "@/api";
import { queryKeys } from "@/api/queryKeys";

export function useDashboardOverview() {
  const query = useQuery({
    queryKey: queryKeys.overview(),
    queryFn: async () => {
      const res = await dataApi.overview();
      return res.data.data ?? null;
    },
  });

  return {
    overview: query.data ?? null,
    loading: query.isPending,
  };
}

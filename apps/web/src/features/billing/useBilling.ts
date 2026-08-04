import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { paymentsApi, subscriptionsApi } from "@/api";
import { queryKeys } from "@/api/queryKeys";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { getApiErrorMessage } from "@/lib/api-error";

type Invoice = { date: string; amount: string; status: string; url?: string | null };

export function useBilling() {
  const { t } = useTranslation("billing");
  const { user } = useAuth();
  const { toast, flash } = useToast();
  const queryClient = useQueryClient();

  const subQuery = useQuery({
    queryKey: queryKeys.subscription(),
    queryFn: async () => {
      const s = await subscriptionsApi.current();
      return s.data.data;
    },
    initialData: user?.userSubscription,
  });

  const paymentsQuery = useQuery({
    queryKey: queryKeys.payments(),
    queryFn: async () => {
      const p = await paymentsApi.list();
      return (p.data.data || []).map(
        (inv): Invoice => ({
          date: new Date(inv.createdAt).toLocaleDateString(),
          amount: `€${(inv.amount / 100).toFixed(2)}`,
          status: inv.status,
          url: inv.invoiceHostedURL,
        }),
      );
    },
  });

  async function invalidateBilling() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.subscription() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.payments() }),
    ]);
  }

  const chooseMutation = useMutation({
    mutationFn: async (plan: string) => {
      if (plan === "Free") {
        const res = await subscriptionsApi.unsubscribe();
        return { kind: "free" as const, message: res.data.data };
      }
      const res = await paymentsApi.checkout(plan);
      const url = res.data.data?.url;
      if (!url) throw new Error("MISSING_URL");
      return { kind: "checkout" as const, url };
    },
    onSuccess: async (result) => {
      if (result.kind === "free") {
        flash(result.message || t("movedFree"));
        await invalidateBilling();
        return;
      }
      window.location.href = result.url;
    },
    onError: (e: unknown, plan) => {
      if (e instanceof Error && e.message === "MISSING_URL") {
        flash(t("checkoutUrlMissing"));
        return;
      }
      flash(getApiErrorMessage(e, plan === "Free" ? t("changePlanFailed") : t("checkoutFailed")));
    },
  });

  const portalMutation = useMutation({
    mutationFn: async () => {
      const res = await paymentsApi.portal();
      const url = res.data.data?.url;
      if (!url) throw new Error("MISSING_URL");
      return url;
    },
    onSuccess: (url) => {
      window.open(url, "_blank", "noopener,noreferrer");
    },
    onError: (e: unknown) => flash(getApiErrorMessage(e, t("portalFailed"))),
  });

  const busy = chooseMutation.isPending || portalMutation.isPending;

  return {
    sub: subQuery.data,
    invoices: paymentsQuery.data ?? [],
    toast,
    busy,
    choose: (plan: string) => void chooseMutation.mutate(plan),
    openPortal: () => void portalMutation.mutate(),
  };
}

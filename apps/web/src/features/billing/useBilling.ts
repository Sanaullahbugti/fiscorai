import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { paymentsApi, subscriptionsApi } from "@/api";
import { queryKeys } from "@/api/queryKeys";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { getApiErrorMessage } from "@/lib/api-error";
import type { SavedCard } from "@/types/api";

type Invoice = { date: string; amount: string; status: string; url?: string | null };
type CardRow = { id: string; label: string; isDefault: boolean };

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

  const cardsQuery = useQuery({
    queryKey: queryKeys.cards(),
    queryFn: async () => {
      const c = await paymentsApi.cards();
      return (c.data.data || []).map(
        (card: SavedCard): CardRow => ({
          id: card.id,
          label: `${card.brand} •••• ${card.last4}`,
          isDefault: !!card.isDefault,
        }),
      );
    },
  });

  async function invalidateBilling() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.subscription() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.payments() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.cards() }),
    ]);
  }

  const confirmMutation = useMutation({
    mutationFn: (sessionId: string) => paymentsApi.confirmSession(sessionId),
    onSuccess: async (res) => {
      flash(t("planActivated", { plan: res.data.data?.plan || "Plan" }));
      await invalidateBilling();
    },
    onError: () => flash(t("paymentRefreshing")),
    onSettled: () => {
      window.history.replaceState({}, "", "/billing");
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    const sessionId = params.get("session_id");
    if (checkout === "cancel") {
      flash(t("checkoutCanceled"));
      window.history.replaceState({}, "", "/billing");
      return;
    }
    if (checkout === "success" && sessionId) {
      confirmMutation.mutate(sessionId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount for checkout return
  }, []);

  const chooseMutation = useMutation({
    mutationFn: async (plan: string) => {
      if (plan === "Free") {
        await subscriptionsApi.unsubscribe();
        return { kind: "free" as const };
      }
      const res = await paymentsApi.checkout(plan);
      const url = res.data.data?.url;
      if (!url) throw new Error("MISSING_URL");
      return { kind: "checkout" as const, url };
    },
    onSuccess: async (result) => {
      if (result.kind === "free") {
        flash(t("movedFree"));
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

  const removeCardMutation = useMutation({
    mutationFn: (id: string) => paymentsApi.deleteCard(id),
    onSuccess: async () => {
      flash(t("cardRemoved"));
      await invalidateBilling();
    },
    onError: (e: unknown) => flash(getApiErrorMessage(e, t("removeCardFailed"))),
  });

  const busy = confirmMutation.isPending || chooseMutation.isPending || removeCardMutation.isPending;

  return {
    sub: subQuery.data,
    cards: cardsQuery.data ?? [],
    invoices: paymentsQuery.data ?? [],
    toast,
    busy,
    choose: (plan: string) => void chooseMutation.mutate(plan),
    removeCard: (id: string) => void removeCardMutation.mutate(id),
  };
}

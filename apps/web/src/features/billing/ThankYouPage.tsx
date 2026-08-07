import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { paymentsApi, subscriptionsApi } from "@/api";
import { queryKeys } from "@/api/queryKeys";
import { ROUTES } from "@/constants";
import { useAuth } from "@/hooks/useAuth";
import styles from "./CheckoutResult.module.css";

type Status = "confirming" | "success" | "error" | "missing";

const PAID = new Set(["Basic", "Standard", "Pro"]);

export function ThankYouPage() {
  const { t } = useTranslation("billing");
  const queryClient = useQueryClient();
  const { refreshSubscription } = useAuth();
  const [status, setStatus] = useState<Status>("confirming");
  const [plan, setPlan] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id") || undefined;

    async function settle() {
      const deadline = Date.now() + 45_000;
      while (!cancelled && Date.now() < deadline) {
        try {
          await paymentsApi.confirmSession(sessionId);
        } catch {
          /* webhook may still be in flight */
        }
        try {
          const res = await subscriptionsApi.current();
          const sub = res.data.data;
          if (sub?.active && PAID.has(sub.plan)) {
            if (cancelled) return;
            setPlan(sub.plan);
            setStatus("success");
            queryClient.setQueryData(queryKeys.subscription(), sub);
            await Promise.all([
              refreshSubscription(),
              queryClient.invalidateQueries({ queryKey: queryKeys.subscription() }),
              queryClient.invalidateQueries({ queryKey: queryKeys.payments() }),
              queryClient.invalidateQueries({ queryKey: queryKeys.analystQuota() }),
            ]);
            window.history.replaceState({}, "", ROUTES.thankyou);
            return;
          }
        } catch {
          /* keep polling */
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
      if (!cancelled) setStatus("error");
    }

    void settle();
    return () => {
      cancelled = true;
    };
  }, [queryClient, refreshSubscription]);

  const isPending = status === "confirming";
  const isOk = status === "success";
  const isError = status === "error" || status === "missing";

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {isPending ? (
          <>
            <div className={`${styles.iconWrap} ${styles.iconPending}`}>
              <div className={styles.spinner} aria-hidden />
            </div>
            <h1 className={styles.title}>{t("thankYouConfirming")}</h1>
            <p className={styles.body}>{t("thankYouConfirmingBody")}</p>
          </>
        ) : null}

        {isOk ? (
          <>
            <div className={`${styles.iconWrap} ${styles.iconSuccess}`}>
              <span className={styles.iconMark} aria-hidden>
                ✓
              </span>
            </div>
            <h1 className={styles.title}>{t("thankYouTitle")}</h1>
            <p className={styles.body}>
              {plan ? t("thankYouBodyPlan", { plan }) : t("thankYouBody")}
            </p>
            <div className={styles.actions}>
              <Link className={styles.btnPrimary} to={ROUTES.billing}>
                {t("thankYouBillingCta")}
              </Link>
              <Link className={styles.btnSecondary} to={ROUTES.graphics}>
                {t("thankYouDashboardCta")}
              </Link>
            </div>
          </>
        ) : null}

        {isError ? (
          <>
            <div className={`${styles.iconWrap} ${styles.iconPending}`}>
              <span className={styles.iconMark} aria-hidden>
                …
              </span>
            </div>
            <h1 className={styles.title}>{t("thankYouPendingTitle")}</h1>
            <p className={styles.body}>{t("thankYouConfirmError")}</p>
            <div className={styles.actions}>
              <Link className={styles.btnPrimary} to={ROUTES.billing}>
                {t("thankYouBillingCta")}
              </Link>
              <Link className={styles.btnSecondary} to={ROUTES.contact}>
                {t("thankYouSupportCta")}
              </Link>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

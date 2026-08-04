import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { EmptyPeriod } from "@/components/EmptyPeriod";
import { useShellPeriod } from "@/hooks/PeriodProvider";
import { useAuth } from "@/hooks/useAuth";
import { useProcessedData } from "@/hooks/useProcessedData";
import { usePeriodInsights } from "@/hooks/usePeriodInsights";
import { ROUTES } from "@/constants";
import { buildReviewChecks } from "@/lib/review-checks";
import { eur } from "@/lib/tax-agg";
import styles from "./ReviewPage.module.css";

export function ReviewPage() {
  const { t } = useTranslation(["review", "empty", "dashboard"]);
  const period = useShellPeriod();
  const { user } = useAuth();
  const { data, hasData, meta } = useProcessedData(period.payload);
  const { insights } = usePeriodInsights(period.payload, hasData);
  const { checks, filings, agg } = buildReviewChecks(data, {
    planActive: !!user?.userSubscription?.active,
  });

  // Prefer server insights alerts when available (includes MoM spike + truncation meta).
  const alertItems =
    insights?.alerts.map((a) => ({
      sev: a.sev,
      title: a.title,
      detail: a.detail,
    })) ?? checks;

  const filingItems =
    insights && insights.filingHints.length
      ? insights.filingHints.map((f) => ({
          scheme: f.scheme,
          what: f.note,
          amount: eur(f.amount),
          due: f.due,
          note: f.note,
        }))
      : filings;

  if (!hasData) {
    return (
      <div className={styles.page}>
        <EmptyPeriod body={t("empty:bodyReview")} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {(meta?.truncated || insights?.meta?.truncated) && (
        <div className={styles.truncBanner} role="status">
          {t("dashboard:truncatedBadge")}
        </div>
      )}
      {hasData && !meta && !insights?.meta && (
        <div className={styles.truncBanner} role="status">
          {t("dashboard:metaMissingHint")}
        </div>
      )}

      {insights?.pulse?.verdict ? (
        <section className={styles.card}>
          <div className={styles.cardHead}>
            <h2>{t("dashboard:periodPulse")}</h2>
          </div>
          <p className={styles.pulseVerdict}>{insights.pulse.verdict}</p>
        </section>
      ) : null}

      <section className={styles.card}>
        <div className={styles.cardHead}>
          <h2>{t("needsAttention")}</h2>
          <span className={styles.checkSummary}>
            {t("checkSummary", {
              critical: alertItems.filter((c) => c.sev === "critical").length,
              warning: alertItems.filter((c) => c.sev === "warning").length,
              info: alertItems.filter((c) => c.sev === "info").length,
            })}
          </span>
        </div>
        <div className={styles.checksList}>
          {alertItems.map((c) => (
            <div key={c.title} className={`${styles.checkItem} ${styles[c.sev]}`}>
              <span className={styles.chip}>
                {c.sev === "critical" ? t("chipFix") : c.sev === "warning" ? t("chipCheck") : t("chipNote")}
              </span>
              <div className={styles.checkContent}>
                <div className={styles.checkTitle}>{c.title}</div>
                <div className={styles.checkDetail}>{c.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHead}>
          <h2>{t("fileWhen")}</h2>
          <span className={styles.filingTotal}>{t("totalVat", { amount: eur(agg.vat) })}</span>
        </div>
        <div className={styles.filingsList}>
          {filingItems.map((f) => (
            <div key={f.scheme} className={styles.filingItem}>
              <div className={styles.filingMain}>
                <div className={styles.filingScheme}>{f.scheme}</div>
                <div className={styles.filingWhat}>{f.what}</div>
              </div>
              <div className={styles.filingAmount}>
                <div className={styles.filingLabel}>{t("vatToDeclare")}</div>
                <div className={styles.filingValue}>{f.amount}</div>
              </div>
              <div className={styles.filingDue}>
                <div className={styles.filingLabel}>{t("due")}</div>
                <div className={styles.filingDueText}>{f.due}</div>
                <div className={styles.filingNote}>{f.note}</div>
              </div>
            </div>
          ))}
          {!filingItems.length ? (
            <div className={styles.emptyFiling}>{t("noFilings")}</div>
          ) : null}
        </div>
      </section>

      <div className={styles.aiPrompt}>
        <div>
          <div className={styles.aiTitle}>{t("aiTitle")}</div>
          <div className={styles.aiSub}>{t("aiSub")}</div>
        </div>
        <Link className={styles.aiBtn} to={ROUTES.analyst}>
          {t("openAnalyst")}
        </Link>
      </div>
    </div>
  );
}

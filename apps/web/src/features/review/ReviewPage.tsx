import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { EmptyPeriod } from "@/components/EmptyPeriod";
import { useShellPeriod } from "@/hooks/PeriodProvider";
import { useAuth } from "@/hooks/useAuth";
import { useProcessedData } from "@/hooks/useProcessedData";
import { ROUTES } from "@/constants";
import { buildReviewChecks } from "@/lib/review-checks";
import { eur } from "@/lib/tax-agg";
import styles from "./ReviewPage.module.css";

export function ReviewPage() {
  const { t } = useTranslation(["review", "empty"]);
  const period = useShellPeriod();
  const { user } = useAuth();
  const { data, hasData } = useProcessedData(period.payload);
  const { checks, filings, agg } = buildReviewChecks(data, {
    planActive: !!user?.userSubscription?.active,
  });

  if (!hasData) {
    return (
      <div className={styles.page}>
        <EmptyPeriod body={t("empty:bodyReview")} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <section className={styles.card}>
        <div className={styles.cardHead}>
          <h2>{t("needsAttention")}</h2>
          <span className={styles.checkSummary}>
            {t("checkSummary", {
              critical: checks.filter((c) => c.sev === "critical").length,
              warning: checks.filter((c) => c.sev === "warning").length,
              info: checks.filter((c) => c.sev === "info").length,
            })}
          </span>
        </div>
        <div className={styles.checksList}>
          {checks.map((c) => (
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
          {filings.map((f) => (
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
          {!filings.length ? (
            <p style={{ color: "var(--text-secondary)", fontSize: "var(--text-body-sm)" }}>{t("noFilings")}</p>
          ) : null}
        </div>
        <div className={styles.disclaimer}>{t("disclaimer")}</div>
      </section>

      <section className={styles.aiPrompt}>
        <div>
          <div className={styles.aiTitle}>{t("aiTitle")}</div>
          <div className={styles.aiSub}>{t("aiSub")}</div>
        </div>
        <Link className={styles.aiBtn} to={ROUTES.analyst}>
          {t("openAnalyst")}
        </Link>
      </section>
    </div>
  );
}

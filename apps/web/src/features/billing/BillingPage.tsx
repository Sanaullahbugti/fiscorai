import { useTranslation } from "react-i18next";
import { PLANS } from "@/constants";
import { Toast } from "@/components/Toast";
import { useBilling } from "./useBilling";
import styles from "./BillingPage.module.css";

export function BillingPage() {
  const { t } = useTranslation(["billing", "common"]);
  const { sub, invoices, toast, busy, choose, openPortal } = useBilling();

  return (
    <div className={styles.page}>
      <Toast message={toast} />
      {busy ? <Toast message={t("workingCheckout")} /> : null}

      <div className={styles.statusCard}>
        <div>
          <div className={styles.statusLabel}>{t("currentPlan")}</div>
          <div className={styles.planName}>{sub?.plan || "Free"}</div>
          <div className={styles.statusLine}>{sub?.active ? t("activeSub") : t("freeForever")}</div>
        </div>
        {sub?.active ? (
          <button className={styles.cancelBtn} disabled={busy} onClick={() => choose("Free")}>
            {t("cancelPlan")}
          </button>
        ) : null}
      </div>

      <div className={styles.plansGrid}>
        {PLANS.map((p) => {
          const isCurrent = sub?.plan === p.code;
          const currentPrice = PLANS.find((x) => x.code === sub?.plan)?.price ?? 0;
          const isDowngrade = !isCurrent && !!sub?.active && p.price < currentPrice;
          return (
            <div
              key={p.code}
              className={styles.planCard}
              style={{ borderColor: isCurrent ? "var(--brand-primary)" : "var(--border-default)" }}
            >
              <div className={styles.planName}>{p.code}</div>
              <div className={styles.price}>
                {p.price === 0 ? t("priceFree") : t("priceMo", { price: p.price.toFixed(2) })}
              </div>
              <div className={styles.limits}>{t(`common:plans.${p.code}`)}</div>
              <button
                className={styles.planBtn}
                disabled={isCurrent || busy || isDowngrade}
                title={isDowngrade ? t("downgradeLocked") : undefined}
                style={{
                  background: isCurrent || isDowngrade ? "var(--border-default)" : "var(--surface-brand)",
                  color: isCurrent || isDowngrade ? "var(--text-secondary)" : "var(--text-on-brand)",
                }}
                onClick={() => choose(p.code)}
              >
                {isCurrent
                  ? t("currentPlanBtn")
                  : isDowngrade
                    ? t("downgradeLocked")
                    : p.price === 0
                      ? t("select")
                      : t("upgradeToPlan", { plan: p.code })}
              </button>
              {isDowngrade && <div className={styles.downgradeNote}>{t("downgradeNote")}</div>}
            </div>
          );
        })}
      </div>

      <div className={styles.cardsAndInvoices}>
        <div className={styles.cardsCard}>
          <div className={styles.cardHead}>
            <div className={styles.cardTitle}>{t("paymentMethods")}</div>
          </div>
          <div className={styles.cardsList}>
            <div className={styles.cardItem}>
              <div className={styles.cardLabel}>{t("portalHint")}</div>
              <div className={styles.cardActions}>
                <button
                  className={styles.linkBtn}
                  disabled={busy || !sub?.active}
                  onClick={() => openPortal()}
                >
                  {t("manageBilling")}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.invoicesCard}>
          <div className={styles.cardTitle}>{t("invoices")}</div>
          <div className={styles.invoiceList}>
            {invoices.length === 0 ? (
              <div className={styles.invoiceEmpty}>{t("noInvoices")}</div>
            ) : (
              invoices.map((inv, idx) => (
                <div key={idx} className={styles.invoiceRow}>
                  <div className={styles.invoiceMeta}>
                    <div className={styles.invoiceDate}>{inv.date}</div>
                    <span className={styles.statusLabel}>{inv.status.toUpperCase()}</span>
                  </div>
                  <div className={styles.invoiceRight}>
                    <div className={styles.invoiceAmount}>{inv.amount}</div>
                    {inv.url ? (
                      <a href={inv.url} target="_blank" rel="noreferrer" className={styles.invLink}>
                        {t("invoice")}
                      </a>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useTranslation } from "react-i18next";
import { PLANS } from "@/constants";
import { Toast } from "@/components/Toast";
import { useBilling } from "./useBilling";
import styles from "./BillingPage.module.css";

export function BillingPage() {
  const { t } = useTranslation(["billing", "common"]);
  const { sub, cards, invoices, toast, busy, choose, removeCard } = useBilling();

  return (
    <div className={styles.page}>
      <Toast message={toast} />
      {busy ? <Toast message={t("workingStripe")} /> : null}

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
          return (
            <div
              key={p.code}
              className={styles.planCard}
              style={{ borderColor: isCurrent ? "var(--brand-primary)" : "var(--border-default)" }}
            >
              <div className={styles.planName}>{p.code}</div>
              <div className={styles.price}>{p.price === 0 ? t("priceFree") : t("priceMo", { price: p.price })}</div>
              <div className={styles.limits}>{t(`common:plans.${p.code}`)}</div>
              <button
                className={styles.planBtn}
                disabled={isCurrent || busy}
                style={{
                  background: isCurrent ? "var(--border-default)" : "var(--surface-brand)",
                  color: isCurrent ? "var(--text-secondary)" : "var(--text-on-brand)",
                }}
                onClick={() => choose(p.code)}
              >
                {isCurrent ? t("currentPlanBtn") : p.price === 0 ? t("select") : t("payStripe")}
              </button>
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
            {cards.length === 0 ? (
              <div className={styles.cardItem}>
                <div className={styles.cardLabel}>{t("noCards")}</div>
              </div>
            ) : (
              cards.map((c) => (
                <div key={c.id} className={styles.cardItem}>
                  <div className={styles.cardLabel}>{c.label}</div>
                  {c.isDefault ? <span className={styles.defaultBadge}>{t("default")}</span> : null}
                  <div className={styles.cardActions}>
                    <button
                      className={styles.linkBtn}
                      style={{ color: "var(--status-critical)" }}
                      onClick={() => removeCard(c.id)}
                    >
                      {t("remove")}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className={styles.invoicesCard}>
          <div className={styles.cardTitle}>{t("invoices")}</div>
          <div className={styles.invoicesTable}>
            <table>
              <tbody>
                {invoices.length === 0 ? (
                  <tr>
                    <td className={styles.invDate} colSpan={4}>
                      {t("noInvoices")}
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv, idx) => (
                    <tr key={idx}>
                      <td className={styles.invDate}>{inv.date}</td>
                      <td className={styles.invAmount}>{inv.amount}</td>
                      <td className={styles.invStatus}>
                        <span className={styles.statusLabel}>{inv.status.toUpperCase()}</span>
                      </td>
                      <td className={styles.invAction}>
                        {inv.url ? (
                          <a href={inv.url} target="_blank" rel="noreferrer" className={styles.invLink}>
                            {t("invoice")}
                          </a>
                        ) : (
                          <span className={styles.invLink}>—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ROUTES } from "@/constants";
import styles from "./CheckoutResult.module.css";

export function PaymentFailedPage() {
  const { t } = useTranslation("billing");

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={`${styles.iconWrap} ${styles.iconFail}`}>
          <span className={styles.iconMark} aria-hidden>
            ×
          </span>
        </div>
        <h1 className={styles.title}>{t("paymentFailedTitle")}</h1>
        <p className={styles.body}>{t("paymentFailedBody")}</p>
        <div className={styles.actions}>
          <Link className={styles.btnPrimary} to={ROUTES.billing}>
            {t("paymentFailedRetryCta")}
          </Link>
          <Link className={styles.btnSecondary} to={ROUTES.contact}>
            {t("thankYouSupportCta")}
          </Link>
        </div>
      </div>
    </div>
  );
}

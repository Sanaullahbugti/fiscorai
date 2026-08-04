import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ROUTES } from "@/constants";
import { LockIcon, CheckIcon } from "@/features/analyst/icons";
import styles from "./AmazonConnectionPage.module.css";

/**
 * Split out of AccountPage on purpose. The old inline Amazon field there
 * always showed a "Connected" chip regardless of whether anything real was
 * wired up (it wasn't — the token was saved but never used to sync Seller
 * Central). Rather than keep shipping that, this page says plainly that
 * automatic sync isn't live yet, and points sellers at the manual upload flow
 * that already works today. See the build plan's SP-API phase for what
 * replaces this.
 */
export function AmazonConnectionPage() {
  const { t } = useTranslation(["amazon", "common"]);

  return (
    <div className={styles.page}>
      <div className={styles.badge}>{t("badge")}</div>
      <h1 className={styles.title}>{t("title")}</h1>
      <p className={styles.intro}>{t("intro")}</p>
      <p className={styles.introBody}>{t("introBody")}</p>

      <div className={styles.previewCard}>
        <div className={styles.previewOverlay}>
          <LockIcon className={styles.previewOverlayIcon} />
          <span>{t("previewOverlay")}</span>
        </div>
        <div className={styles.previewInner} aria-hidden>
          <label className={styles.previewLabel}>{t("previewLabel")}</label>
          <input type="text" disabled placeholder={t("previewPlaceholder")} />
          <button type="button" className={styles.previewButton} disabled>
            {t("previewButton")}
          </button>
        </div>
      </div>

      <div className={styles.comingCard}>
        <div className={styles.comingTitle}>{t("comingTitle")}</div>
        <ul className={styles.comingList}>
          <li>
            <CheckIcon className={styles.comingIcon} />
            <span>{t("comingItem1")}</span>
          </li>
          <li>
            <CheckIcon className={styles.comingIcon} />
            <span>{t("comingItem2")}</span>
          </li>
          <li>
            <CheckIcon className={styles.comingIcon} />
            <span>{t("comingItem3")}</span>
          </li>
        </ul>
      </div>

      <div className={styles.actions}>
        <Link to={ROUTES.information} className={styles.btnPrimary}>
          {t("manualCta")}
        </Link>
        <span className={styles.notify}>
          {t("notify")}{" "}
          <a href="mailto:support@fiscor.ai?subject=Notify%20me%20about%20Amazon%20connection">
            {t("notifyCta")}
          </a>
        </span>
      </div>
    </div>
  );
}

import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ROUTES } from "@/constants";
import styles from "./EmptyPeriod.module.css";

export function EmptyPeriod({
  title,
  body,
  ctaLabel,
  onCta,
}: {
  title?: string;
  body?: string;
  ctaLabel?: string;
  onCta?: () => void;
}) {
  const { t } = useTranslation("empty");
  const resolvedTitle = title ?? t("title");
  const resolvedBody = body ?? t("bodyDefault");
  const resolvedCta = ctaLabel ?? t("cta");

  return (
    <div className={styles.empty}>
      <div className={styles.emptyTitle}>{resolvedTitle}</div>
      <div className={styles.emptyBody}>{resolvedBody}</div>
      {onCta ? (
        <button type="button" className={styles.emptyCta} onClick={onCta}>
          {resolvedCta}
        </button>
      ) : (
        <Link className={styles.emptyCta} to={ROUTES.information}>
          {resolvedCta}
        </Link>
      )}
    </div>
  );
}

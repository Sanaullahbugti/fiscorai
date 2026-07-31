import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { usePeriod } from "@/hooks/usePeriod";
import { formatPeriodLabel } from "@/lib/period-label";
import styles from "./PeriodBar.module.css";

type Period = ReturnType<typeof usePeriod>;

function summary(period: Period, monthly: string, quarterly: string) {
  const type = period.fileType === "monthly" ? monthly : quarterly;
  return `${type} · ${formatPeriodLabel({
    fileType: period.fileType,
    year: period.year,
    month: period.month,
    quarter: period.quarter,
    short: true,
  })}`;
}

export function PeriodBar({
  period,
  onApply,
  accentApply,
  collapsible = false,
}: {
  period: Period;
  onApply?: () => void;
  accentApply?: boolean;
  /** Mobile: start collapsed as a single chip; expand to edit. */
  collapsible?: boolean;
}) {
  const { t, i18n } = useTranslation("common");
  const [open, setOpen] = useState(!collapsible);

  useEffect(() => {
    if (!collapsible) setOpen(true);
    else setOpen(false);
  }, [collapsible]);

  const apply = () => {
    onApply?.();
    if (collapsible) setOpen(false);
  };

  if (collapsible && !open) {
    return (
      <div className={styles.compact}>
        <button
          type="button"
          className={styles.compactBtn}
          onClick={() => setOpen(true)}
          aria-expanded={false}
          aria-controls="period-bar-panel"
        >
          <span className={styles.compactLabel}>{t("period")}</span>
          <span className={styles.compactValue}>{summary(period, t("monthly"), t("quarterly"))}</span>
          <span className={styles.compactAction}>{t("change")}</span>
        </button>
      </div>
    );
  }

  return (
    <div className={`${styles.wrap} ${collapsible ? styles.wrapExpanded : ""}`} id="period-bar-panel">
      {collapsible ? (
        <div className={styles.panelHead}>
          <span className={styles.panelTitle}>{t("reportingPeriod")}</span>
          <button
            type="button"
            className={styles.panelClose}
            onClick={() => setOpen(false)}
            aria-label={t("closePeriodControls")}
          >
            {t("close")}
          </button>
        </div>
      ) : null}
      <div className={styles.bar}>
        <label>
          <span>{t("type")}</span>
          <select
            value={period.fileType}
            onChange={(e) => period.setFileType(e.target.value as "monthly" | "quarterly")}
          >
            <option value="monthly">{t("monthly")}</option>
            <option value="quarterly">{t("quarterly")}</option>
          </select>
        </label>
        <label>
          <span>{t("period")}</span>
          <select value={period.periodValue} onChange={(e) => period.setPeriodValue(e.target.value)}>
            {period.fileType === "monthly"
              ? Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={String(i + 1)}>
                    {new Date(2000, i, 1).toLocaleString(i18n.language, { month: "long" })}
                  </option>
                ))
              : ["Q1", "Q2", "Q3", "Q4"].map((q) => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
          </select>
        </label>
        <label>
          <span>{t("year")}</span>
          <select value={period.year} onChange={(e) => period.setYear(Number(e.target.value))}>
            {period.years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className={accentApply ? styles.applyAccent : styles.apply}
          onClick={apply}
        >
          {t("apply")}
        </button>
      </div>
    </div>
  );
}

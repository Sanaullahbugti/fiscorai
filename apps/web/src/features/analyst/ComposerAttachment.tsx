import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { useCsvUpload } from "@/hooks/useCsvUpload";
import {
  detectCsvPeriod,
  type DetectCsvPeriodResult,
} from "@/lib/detect-csv-period";
import { formatPeriodLabel } from "@/lib/period-label";
import { FileIcon, CloseIcon } from "./icons";
import styles from "./ComposerAttachment.module.css";

type Props = {
  csv: ReturnType<typeof useCsvUpload>;
  onUpload: () => void;
};

/**
 * Attached VAT CSV row. Period comes from ACTIVITY_PERIOD in the file — the
 * chip confirms a mismatch instead of asking the user to pick month/year.
 */
export function ComposerAttachment({ csv, onUpload }: Props) {
  const { t } = useTranslation("analyst");
  const [detected, setDetected] = useState<DetectCsvPeriodResult | null>(null);

  useEffect(() => {
    if (!csv.file) {
      setDetected(null);
      return;
    }
    let cancelled = false;
    void detectCsvPeriod(csv.file)
      .then((result) => {
        if (!cancelled) setDetected(result);
      })
      .catch(() => {
        if (!cancelled) setDetected({ ok: false, code: "MISSING_ACTIVITY_PERIOD", sourcePeriods: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [csv.file]);

  if (!csv.file) return null;

  return (
    <div className={styles.wrap}>
      <div className={styles.row}>
        <FileIcon className={styles.fileIcon} />
        <span className={styles.name} title={csv.file.name}>
          {csv.file.name}
        </span>
        <button
          type="button"
          className={styles.remove}
          aria-label={t("uploadRemove")}
          disabled={csv.uploading}
          onClick={() => csv.setFile(null)}
        >
          <CloseIcon className={styles.removeIcon} />
        </button>
      </div>

      {!csv.uploading && detected?.ok === false && (
        <div className={styles.controls}>
          <button type="button" className={styles.submit} onClick={onUpload}>
            {t("uploadSubmit")}
          </button>
        </div>
      )}

      {!csv.uploading && detected?.ok === true && (
        <div className={styles.controls}>
          <p className={styles.note}>{t("uploadDetected", { period: formatPeriodLabel(detected.target) })}</p>
          <button type="button" className={styles.submit} onClick={onUpload}>
            {t("uploadSubmit")}
          </button>
        </div>
      )}

      {csv.uploading && (
        <div
          className={`${styles.progress} ${csv.uploadPct >= 99 ? styles.progressProcessing : ""}`}
          role="progressbar"
          aria-valuenow={csv.uploadPct}
          aria-label={t("uploadThinking")}
        >
          <div className={styles.progressBar} style={{ width: `${Math.max(csv.uploadPct, 8)}%` }} />
        </div>
      )}
    </div>
  );
}

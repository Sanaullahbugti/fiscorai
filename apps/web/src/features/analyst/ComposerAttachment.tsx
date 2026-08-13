import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { useCsvUpload } from "@/hooks/useCsvUpload";
import {
  detectCsvPeriod,
  formatSourcePeriodValue,
  sameCsvPeriod,
  type CsvPeriodTarget,
  type DetectCsvPeriodResult,
} from "@/lib/detect-csv-period";
import { formatPeriodLabel } from "@/lib/period-label";
import { FileIcon, CloseIcon } from "./icons";
import styles from "./ComposerAttachment.module.css";

export type UploadTargetInput = CsvPeriodTarget;

type Props = {
  csv: ReturnType<typeof useCsvUpload>;
  onUpload: (target: UploadTargetInput) => void;
  onPeriodChange: (target: UploadTargetInput) => void;
  selected: UploadTargetInput;
  hasData: boolean;
};

/**
 * Attached VAT CSV row. Period comes from ACTIVITY_PERIOD in the file — the
 * chip confirms a mismatch instead of asking the user to pick month/year.
 */
export function ComposerAttachment({ csv, onUpload, onPeriodChange, selected, hasData }: Props) {
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

  const serverMismatch = csv.mismatch;
  const clientMismatch =
    !serverMismatch &&
    hasData &&
    detected?.ok === true &&
    !sameCsvPeriod(detected.target, selected);
  const showMismatch = serverMismatch || clientMismatch;
  const mismatchDetectedLabel = serverMismatch
    ? serverMismatch.detectedLabel
    : detected?.ok
      ? formatPeriodLabel(detected.target)
      : "";
  const mismatchSelectedLabel = serverMismatch
    ? serverMismatch.selectedLabel
    : formatPeriodLabel(selected);
  const mismatchTarget = serverMismatch
    ? serverMismatch.detectedTarget
    : detected?.ok
      ? detected.target
      : null;

  function cancel() {
    csv.clearMismatch();
    csv.setFile(null);
  }

  function changePeriod() {
    if (!mismatchTarget) return;
    onPeriodChange(mismatchTarget);
    csv.clearMismatch();
  }

  function submitDetected() {
    if (detected?.ok) {
      onUpload(detected.target);
      return;
    }
    onUpload(selected);
  }

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

      {!csv.uploading && showMismatch && (
        <div className={styles.mismatch} role="alertdialog" aria-live="polite">
          <p className={styles.mismatchText}>
            {t("uploadMismatch", {
              detected: mismatchDetectedLabel,
              selected: mismatchSelectedLabel,
            })}
          </p>
          <div className={styles.actions}>
            {mismatchTarget ? (
              <button type="button" className={styles.submit} onClick={changePeriod}>
                {t("uploadChangePeriod", { period: mismatchDetectedLabel })}
              </button>
            ) : null}
            <button type="button" className={styles.cancel} onClick={cancel}>
              {t("uploadChooseDifferent")}
            </button>
          </div>
        </div>
      )}

      {!csv.uploading && !showMismatch && detected?.ok === false && detected.code === "MULTIPLE_SOURCE_PERIODS" && (
        <p className={styles.note} role="status">
          {t("uploadMultiplePeriods", {
            periods: detected.sourcePeriods.map(formatSourcePeriodValue).join(", "),
          })}
        </p>
      )}

      {!csv.uploading && !showMismatch && detected?.ok === false && detected.code === "MISSING_ACTIVITY_PERIOD" && (
        <div className={styles.controls}>
          <p className={styles.note}>{t("uploadPeriodUnknown")}</p>
          <button type="button" className={styles.submit} onClick={submitDetected}>
            {t("uploadSubmit")}
          </button>
        </div>
      )}

      {!csv.uploading && !showMismatch && detected?.ok === true && (
        <div className={styles.controls}>
          <p className={styles.note}>{t("uploadDetected", { period: formatPeriodLabel(detected.target) })}</p>
          <button type="button" className={styles.submit} onClick={submitDetected}>
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

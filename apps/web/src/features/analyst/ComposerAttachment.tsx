import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { useCsvUpload } from "@/hooks/useCsvUpload";
import { FileIcon, CloseIcon } from "./icons";
import styles from "./ComposerAttachment.module.css";

export type UploadTargetInput = {
  fileType: "monthly" | "quarterly";
  year: number;
  month: string;
  quarter: string;
};

type Props = {
  csv: ReturnType<typeof useCsvUpload>;
  onUpload: (target: UploadTargetInput) => void;
  years: number[];
  defaults: UploadTargetInput;
};

/**
 * The attached-file row inside the composer. A VAT CSV cannot upload on pick the
 * way an image would — the processor needs a period first — so the chip carries
 * compact period selects rather than firing immediately.
 */
export function ComposerAttachment({ csv, onUpload, years, defaults }: Props) {
  const { t, i18n } = useTranslation("analyst");
  const [fileType, setFileType] = useState(defaults.fileType);
  const [year, setYear] = useState(defaults.year);
  const [month, setMonth] = useState(defaults.month);
  const [quarter, setQuarter] = useState(defaults.quarter);

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

      <div className={styles.controls}>
        <select
          className={styles.select}
          aria-label={t("uploadType")}
          value={fileType}
          disabled={csv.uploading}
          onChange={(e) => setFileType(e.target.value as "monthly" | "quarterly")}
        >
          <option value="monthly">{t("uploadMonthly")}</option>
          <option value="quarterly">{t("uploadQuarterly")}</option>
        </select>

        {fileType === "monthly" ? (
          <select
            className={styles.select}
            aria-label={t("uploadPeriod")}
            value={month}
            disabled={csv.uploading}
            onChange={(e) => setMonth(e.target.value)}
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={String(i + 1)}>
                {new Date(2000, i, 1).toLocaleString(i18n.language, { month: "long" })}
              </option>
            ))}
          </select>
        ) : (
          <select
            className={styles.select}
            aria-label={t("uploadPeriod")}
            value={quarter}
            disabled={csv.uploading}
            onChange={(e) => setQuarter(e.target.value)}
          >
            {["Q1", "Q2", "Q3", "Q4"].map((q) => (
              <option key={q} value={q}>
                {q}
              </option>
            ))}
          </select>
        )}

        <select
          className={styles.select}
          aria-label={t("uploadYear")}
          value={year}
          disabled={csv.uploading}
          onChange={(e) => setYear(Number(e.target.value))}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>

        <button
          type="button"
          className={styles.submit}
          disabled={csv.uploading}
          onClick={() => onUpload({ fileType, year, month, quarter })}
        >
          {csv.uploading ? t("uploadBusy") : t("uploadSubmit")}
        </button>
      </div>

      {csv.uploading && (
        <div className={styles.progress} role="progressbar" aria-valuenow={csv.uploadPct}>
          <div className={styles.progressBar} style={{ width: `${csv.uploadPct}%` }} />
          <span className={styles.progressLabel}>
            {csv.uploadPct >= 99
              ? t("uploadProcessing")
              : t("uploadSending", { pct: csv.uploadPct })}
          </span>
        </div>
      )}
    </div>
  );
}

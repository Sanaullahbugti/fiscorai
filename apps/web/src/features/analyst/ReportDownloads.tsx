import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { UIMessage } from "ai";
import { dataApi } from "@/api";
import { useToast } from "@/hooks/useToast";
import { getApiErrorMessage } from "@/lib/api-error";
import { DownloadIcon, FileIcon, SearchIcon, AlertIcon } from "./icons";
import { readMetadata } from "./analyst.types";
import styles from "./ReportDownloads.module.css";

type ReportDownload = {
  format: string;
  label: string;
  downloadUrl: string;
};

type ReportMatch = {
  label: string;
  fileType: "monthly" | "quarterly";
  year: number;
  month?: string;
  quarter?: string;
  formats: string[];
  downloads?: ReportDownload[];
};

type FindReportsOutput = {
  matches: ReportMatch[];
  available: string[];
  requested: string | null;
};

type ToolPart = {
  type: string;
  state?: string;
  output?: unknown;
};

function isFindReports(p: unknown): p is ToolPart {
  return !!p && typeof p === "object" && (p as ToolPart).type === "tool-findReports";
}

function asOutput(value: unknown): FindReportsOutput | null {
  if (!value || typeof value !== "object") return null;
  const o = value as Partial<FindReportsOutput>;
  return Array.isArray(o.matches) ? (o as FindReportsOutput) : null;
}

function formatsFor(m: ReportMatch): string[] {
  if (m.downloads?.length) return m.downloads.map((d) => d.format);
  return m.formats || [];
}

/**
 * Renders report download cards from findReports tool output, or from
 * message metadata.reportMatches when the server auto-attached a single
 * period's confirmed files (e.g. "January summary" without an explicit
 * download ask). Never invents files — only what the API confirmed on disk.
 */
export function ReportDownloads({ message }: { message: UIMessage }) {
  const { t } = useTranslation("analyst");
  const { flash } = useToast();
  const [pending, setPending] = useState<string | null>(null);

  // The SDK's part union has no member matching a custom tool, so widen first.
  const parts = (message.parts as unknown[]).filter(isFindReports);
  const metaMatches = readMetadata(message.metadata)?.reportMatches ?? [];

  async function download(m: ReportMatch, ext: string) {
    const key = `${m.label}:${ext}`;
    setPending(key);
    try {
      const res = await dataApi.downloadFile({
        fileType: m.fileType,
        year: m.year,
        month: m.month,
        quarter: m.quarter,
        fileExtension: ext,
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fiscorai_${m.label.replace(/\s+/g, "_").toLowerCase()}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      flash(getApiErrorMessage(e, t("downloadFailed")));
    } finally {
      setPending(null);
    }
  }

  function renderCards(matches: ReportMatch[], keyPrefix: string) {
    return (
      <div key={keyPrefix} className={styles.cards}>
        {matches.map((m, idx) => (
          <div
            key={m.label}
            className={styles.card}
            style={{ animationDelay: `${Math.min(idx, 6) * 60}ms` }}
          >
            <span className={styles.cardMark} aria-hidden>
              <FileIcon className={styles.cardMarkIcon} />
            </span>
            <div className={styles.cardText}>
              <span className={styles.cardTitle}>{m.label}</span>
              <span className={styles.cardMeta}>
                {m.fileType === "monthly" ? t("uploadMonthly") : t("uploadQuarterly")}
              </span>
            </div>
            <div className={styles.cardActions}>
              {formatsFor(m).map((ext) => (
                <button
                  key={ext}
                  type="button"
                  className={styles.dl}
                  disabled={pending === `${m.label}:${ext}`}
                  onClick={() => void download(m, ext)}
                >
                  <DownloadIcon className={styles.dlIcon} />
                  {ext === "pdf" ? t("downloadPdf") : t("downloadXlsx")}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (parts.length) {
    return (
      <>
        {parts.map((part, i) => {
          // Everything before output-available is still the lookup running.
          if (part.state !== "output-available") {
            return (
              <div key={i} className={styles.looking} role="status">
                <SearchIcon className={styles.lookingIcon} />
                <span>{t("toolSearching")}</span>
                <span className={styles.shimmer} aria-hidden />
              </div>
            );
          }

          const out = asOutput(part.output);
          if (!out) return null;

          if (!out.matches.length) {
            return (
              <div key={i} className={styles.none}>
                <AlertIcon className={styles.noneIcon} />
                <span>
                  {out.requested
                    ? t("toolNoneFor", { period: out.requested })
                    : t("toolNoneAny")}
                </span>
              </div>
            );
          }

          return renderCards(out.matches, `tool-${i}`);
        })}
      </>
    );
  }

  if (metaMatches.length) {
    return renderCards(metaMatches, "meta");
  }

  return null;
}

import { useTranslation } from "react-i18next";
import type { UIMessage } from "ai";
import { SearchIcon, AlertIcon, FileIcon } from "./icons";
// Reused, not duplicated — same card/pill visual language as report lookups,
// this just renders a different tool's output.
import styles from "./ReportDownloads.module.css";

type SearchHit = { title: string; url: string; snippet: string };
type WebSearchOutput =
  | { configured: false; message: string }
  | { configured: true; query: string; results: SearchHit[]; error?: string };
type FetchPageOutput =
  | { configured: false; message: string }
  | { configured: true; url: string; found: true; content: string }
  | { configured: true; url: string; found: false; error: string };

type ToolPart = { type: string; state?: string; output?: unknown };

function isWebSearch(p: unknown): p is ToolPart {
  return !!p && typeof p === "object" && (p as ToolPart).type === "tool-webSearch";
}
function isFetchPage(p: unknown): p is ToolPart {
  return !!p && typeof p === "object" && (p as ToolPart).type === "tool-fetchWebPage";
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Renders the webSearch and fetchWebPage tool calls — same "one card per source" pattern as ReportDownloads. */
export function WebSearchResults({ message }: { message: UIMessage }) {
  const { t } = useTranslation("analyst");
  const parts = message.parts as unknown[];
  const searches = parts.filter(isWebSearch);
  const fetches = parts.filter(isFetchPage);
  if (!searches.length && !fetches.length) return null;

  return (
    <>
      {searches.map((part, i) => {
        if (part.state !== "output-available") {
          return (
            <div key={`s${i}`} className={styles.looking} role="status">
              <SearchIcon className={styles.lookingIcon} />
              <span>{t("webSearching")}</span>
              <span className={styles.shimmer} aria-hidden />
            </div>
          );
        }
        const out = part.output as WebSearchOutput | undefined;
        if (!out) return null;
        if (!out.configured) {
          return (
            <div key={`s${i}`} className={styles.none}>
              <AlertIcon className={styles.noneIcon} />
              <span>{t("webSearchUnavailable")}</span>
            </div>
          );
        }
        if (!out.results.length) {
          return (
            <div key={`s${i}`} className={styles.none}>
              <AlertIcon className={styles.noneIcon} />
              <span>{t("webSearchNone", { query: out.query })}</span>
            </div>
          );
        }
        return (
          <div key={`s${i}`} className={styles.cards}>
            {out.results.map((r, idx) => (
              <a
                key={r.url}
                href={r.url}
                target="_blank"
                rel="noreferrer noopener"
                className={styles.card}
                style={{ animationDelay: `${Math.min(idx, 6) * 60}ms`, textDecoration: "none" }}
              >
                <span className={styles.cardMark} aria-hidden>
                  <SearchIcon className={styles.cardMarkIcon} />
                </span>
                <span className={styles.cardText}>
                  <span className={styles.cardTitle}>{r.title || hostOf(r.url)}</span>
                  <span className={styles.cardMeta}>{hostOf(r.url)}</span>
                </span>
              </a>
            ))}
          </div>
        );
      })}

      {fetches.map((part, i) => {
        if (part.state !== "output-available") {
          return (
            <div key={`f${i}`} className={styles.looking} role="status">
              <SearchIcon className={styles.lookingIcon} />
              <span>{t("webFetching")}</span>
              <span className={styles.shimmer} aria-hidden />
            </div>
          );
        }
        const out = part.output as FetchPageOutput | undefined;
        if (!out) return null;
        if (!out.configured || !out.found) {
          return (
            <div key={`f${i}`} className={styles.none}>
              <AlertIcon className={styles.noneIcon} />
              <span>
                {!out.configured ? t("webSearchUnavailable") : t("webFetchFailed", { url: out.url })}
              </span>
            </div>
          );
        }
        return (
          <div key={`f${i}`} className={styles.cards}>
            <a
              href={out.url}
              target="_blank"
              rel="noreferrer noopener"
              className={styles.card}
              style={{ textDecoration: "none" }}
            >
              <span className={styles.cardMark} aria-hidden>
                <FileIcon className={styles.cardMarkIcon} />
              </span>
              <span className={styles.cardText}>
                <span className={styles.cardTitle}>{hostOf(out.url)}</span>
                <span className={styles.cardMeta}>{t("webFetchedLabel")}</span>
              </span>
            </a>
          </div>
        );
      })}
    </>
  );
}

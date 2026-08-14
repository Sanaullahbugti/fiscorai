import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Toast } from "@/components/Toast";
import { HeaderSlot } from "@/components/HeaderSlot";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { ROUTES } from "@/constants";
import { useAnalystChat, messageText } from "./useAnalystChat";
import { AnswerBody } from "./AnswerBody";
import { ComposerAttachment } from "./ComposerAttachment";
import { ReportDownloads } from "./ReportDownloads";
import { HistoryDrawer } from "./HistoryDrawer";
import type { AnalystMode } from "./analyst.types";
import {
  SparkIcon,
  SendIcon,
  StopIcon,
  CopyIcon,
  CheckIcon,
  RefreshIcon,
  LockIcon,
  BoltIcon,
  LayersIcon,
  ShieldIcon,
  ArrowRightIcon,
  AlertIcon,
  InfoIcon,
  UploadIcon,
  PaperclipIcon,
  ChartIcon,
  TrendIcon,
  HistoryIcon,
  PlusIcon,
} from "./icons";
import styles from "./AnalystPage.module.css";

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={styles.actionBtn}
      aria-label={label}
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        });
      }}
    >
      {copied ? <CheckIcon className={styles.actionIcon} /> : <CopyIcon className={styles.actionIcon} />}
      <span>{copied ? tCopied(label) : label}</span>
    </button>
  );
}

function tCopied(label: string) {
  // Keep the button width stable: swap label text rather than appending " ✓".
  if (/copy/i.test(label)) return label.replace(/copy/i, "Copied");
  return `${label} ✓`;
}

function ProcessingStatus({ label, hint }: { label: string; hint: string }) {
  return (
    <div className={styles.uploadProcessing} role="status" aria-live="polite">
      <span className={styles.uploadProcessingMark} aria-hidden>
        <span className={styles.uploadProcessingRing} />
        <SparkIcon className={styles.uploadProcessingIcon} />
      </span>
      <span className={styles.uploadProcessingContent}>
        <span className={styles.uploadProcessingLabel}>{label}</span>
        <span className={styles.uploadProcessingHint}>{hint}</span>
      </span>
      <span className={styles.thinkingDots} aria-hidden>
        <span className={styles.thinkingDot} />
        <span className={styles.thinkingDot} />
        <span className={styles.thinkingDot} />
      </span>
    </div>
  );
}

export function AnalystPage() {
  const { t } = useTranslation(["analyst", "common", "empty"]);
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    hasData,
    loadingFiles,
    quota,
    locked,
    mode,
    isStrategy,
    setMode,
    scopeAll,
    setScopeAll,
    scopeLabel,
    period,
    needsUpload,
    csv,
    uploadNow,
    messages,
    clear,
    history,
    openConversation,
    input,
    setInput,
    busy,
    streaming,
    error,
    chatRef,
    inputRef,
    prompts,
    answerQuestion,
    submit,
    stop,
    regenerate,
  } = useAnalystChat();

  const { toast } = useToast();
  const [historyOpen, setHistoryOpen] = useState(false);
  const isPremium = user?.userSubscription?.active || quota?.premium;
  const isEmpty = messages.length === 0;
  const showMeter = !!quota && !quota.premium;
  const processingUpload = csv.uploading;
  const processingLabel =
    csv.uploadPct > 0 && csv.uploadPct < 99
      ? t("uploadSending", { pct: csv.uploadPct })
      : t("uploadThinking");

  // Holds the branded indicator up for the whole wait — through "submitted" AND
  // the early part of "streaming" before the first token lands. Keying it off
  // status alone made it flash for a few hundred ms and vanish.
  const last = messages[messages.length - 1];
  // The tool lookup renders its own progress card, so suppress the generic
  // indicator then rather than stacking two spinners.
  const lastHasTool = !!last?.parts.some((p) => p.type.startsWith("tool-"));
  const awaitingAnswer =
    busy &&
    !lastHasTool &&
    (!last || last.role === "user" || messageText(last).length === 0);

  const MODES: Array<{ id: AnalystMode; label: string; Icon: typeof ChartIcon }> = [
    { id: "vat-data", label: t("modeVat"), Icon: ChartIcon },
    { id: "ecommerce-strategy", label: t("modeStrategy"), Icon: TrendIcon },
  ];

  function pickFile() {
    csv.fileInputRef.current?.click();
  }

  /** Accepts a CSV dropped anywhere on the conversation, not just on the composer. */
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    csv.setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f && f.name.toLowerCase().endsWith(".csv")) csv.setFile(f);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className={styles.page}>
      {/* Hoisted into the shell header — it already renders the page title, so a
          second bar here would duplicate the name and cost a whole row. */}
      <HeaderSlot>
        <div className={styles.modeRow} role="tablist" aria-label={t("modeLabel")}>
          {MODES.map(({ id, label, Icon }) => (
            <button
              key={id}
              role="tab"
              type="button"
              aria-selected={mode === id}
              className={`${styles.modeBtn} ${mode === id ? styles.modeActive : ""}`}
              onClick={() => setMode(id)}
            >
              <Icon className={styles.modeIcon} />
              <span className={styles.modeText}>{label}</span>
            </button>
          ))}
        </div>

        {isPremium ? (
          <span className={styles.chip}>{t("common:premium")}</span>
        ) : showMeter ? (
          <span className={`${styles.meter} ${locked ? styles.meterEmpty : ""}`}>
            {locked
              ? t("quotaSpent")
              : t("quotaLeft", { left: quota!.remaining ?? 0, limit: quota!.limit })}
          </span>
        ) : null}
        <button
          type="button"
          className={styles.iconAction}
          onClick={() => setHistoryOpen(true)}
          aria-label={t("historyTitle")}
          title={t("historyTitle")}
        >
          <HistoryIcon className={styles.iconActionIcon} />
        </button>
        {!isEmpty && (
          <button
            type="button"
            className={styles.iconAction}
            onClick={clear}
            aria-label={t("newChat")}
            title={t("newChat")}
          >
            <PlusIcon className={styles.iconActionIcon} />
          </button>
        )}
      </HeaderSlot>

      <div className={styles.chatContainer}>
          <div
            ref={chatRef}
            className={`${styles.chatBox} ${csv.dragOver ? styles.chatBoxDrop : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              csv.setDragOver(true);
            }}
            onDragLeave={(e) => {
              // Ignore bubbling from children, or the highlight flickers.
              if (!e.currentTarget.contains(e.relatedTarget as Node)) csv.setDragOver(false);
            }}
            onDrop={handleDrop}
          >
            {csv.dragOver && (
              <div className={styles.dropOverlay} aria-hidden>
                <UploadIcon className={styles.dropOverlayIcon} />
                <span>{t("uploadDrop")}</span>
              </div>
            )}
            {loadingFiles ? (
              // Same chatBox shell as the loaded state, so resolving the query
              // never changes the surrounding box height — only its contents.
              <div className={styles.loading}>
                <span className={styles.spinner} aria-hidden />
                <span>{t("thinking")}</span>
              </div>
            ) : processingUpload && isEmpty ? (
              <div className={styles.processingBox}>
                <ProcessingStatus label={processingLabel} hint={t("uploadProcessingHint")} />
              </div>
            ) : isEmpty ? (
              <div className={styles.welcome}>
                <span className={styles.welcomeMark} aria-hidden>
                  <SparkIcon className={styles.welcomeMarkIcon} />
                </span>
                {/* VAT mode needs figures to talk about; strategy mode never does. */}
                {needsUpload ? (
                  <>
                    <h2 className={styles.welcomeTitle}>{t("noDataTitle")}</h2>
                    <p className={styles.welcomeText}>{t("noDataBody")}</p>
                    <div className={styles.welcomeActions}>
                      <button type="button" className={styles.welcomePrimary} onClick={pickFile}>
                        <UploadIcon className={styles.headerBtnIcon} />
                        {t("uploadReport")}
                      </button>
                      <button
                        type="button"
                        className={styles.welcomeSecondary}
                        onClick={() => setMode("ecommerce-strategy")}
                      >
                        {t("noDataStrategy")}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <h2 className={styles.welcomeTitle}>{t("title")}</h2>
                    <p className={styles.welcomeText}>
                      {isStrategy ? t("strategyIntro") : t("subtitle")}
                    </p>
                    <div className={styles.promptGrid}>
                      {prompts.map((p) => (
                        <button
                          key={p}
                          className={styles.promptBtn}
                          disabled={locked}
                          onClick={() => answerQuestion(p)}
                        >
                          <span className={styles.promptLabel}>{p}</span>
                          <ArrowRightIcon className={styles.promptArrow} />
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              messages.map((m, i) => {
                const text = messageText(m);
                const isUser = m.role === "user";
                const isLast = i === messages.length - 1;
                // A turn carrying only a tool call still has to render — it shows
                // the lookup card. Only genuinely empty assistant turns are skipped,
                // since the branded thinking indicator stands in for those.
                const hasTool = m.parts.some((p) => p.type.startsWith("tool-"));
                if (!isUser && !text && !hasTool) return null;
                // Hide the toolbar until the answer has finished arriving.
                const showTools = !isUser && !(isLast && streaming);
                return (
                  <article
                    key={m.id}
                    className={`${styles.row} ${isUser ? styles.rowUser : styles.rowBot}`}
                  >
                    <div className={isUser ? styles.userBubble : styles.botBubble}>
                      {isUser ? (
                        <span className={styles.userText}>{text}</span>
                      ) : (
                        <>
                          {text && <AnswerBody text={text} />}
                          <ReportDownloads message={m} />
                        </>
                      )}
                    </div>
                    {isUser && text && (
                      <div className={styles.actions}>
                        <CopyButton text={text} label={t("copyPrompt")} />
                      </div>
                    )}
                    {showTools && text && (
                      <div className={styles.actions}>
                        <CopyButton text={text} label={t("copy")} />
                        {isLast && (
                          <button
                            type="button"
                            className={styles.actionBtn}
                            onClick={() => void regenerate()}
                            disabled={busy}
                          >
                            <RefreshIcon className={styles.actionIcon} />
                            <span>{t("retry")}</span>
                          </button>
                        )}
                      </div>
                    )}
                  </article>
                );
              })
            )}

            {processingUpload && !isEmpty && (
              <div className={`${styles.row} ${styles.rowBot}`}>
                <ProcessingStatus label={processingLabel} hint={t("uploadProcessingHint")} />
              </div>
            )}

            {awaitingAnswer && !processingUpload && (
              <div className={`${styles.row} ${styles.rowBot}`}>
                <div className={styles.thinking} role="status">
                  <span className={styles.thinkingMark} aria-hidden>
                    <SparkIcon className={styles.thinkingIcon} />
                  </span>
                  <span className={styles.thinkingLabel}>{t("thinking")}</span>
                  <span className={styles.thinkingDots} aria-hidden>
                    <span className={styles.thinkingDot} />
                    <span className={styles.thinkingDot} />
                    <span className={styles.thinkingDot} />
                  </span>
                </div>
              </div>
            )}

            {locked && (
              <section className={styles.upsell}>
                <span className={styles.lockMark} aria-hidden>
                  <LockIcon className={styles.lockMarkIcon} />
                </span>
                <h2 className={styles.lockTitle}>{t("quotaTitle")}</h2>
                <p className={styles.lockBody}>{t("quotaBody", { limit: quota!.limit })}</p>
                <ul className={styles.perks}>
                  {[
                    { Icon: BoltIcon, text: t("perk1") },
                    { Icon: LayersIcon, text: t("perk2") },
                    { Icon: ShieldIcon, text: t("perk3") },
                  ].map(({ Icon, text }) => (
                    <li key={text} className={styles.perk}>
                      <span className={styles.perkIcon} aria-hidden>
                        <Icon className={styles.perkIconSvg} />
                      </span>
                      <span>{text}</span>
                    </li>
                  ))}
                </ul>
                <button className={styles.upgradeBtn} onClick={() => navigate(ROUTES.billing)}>
                  {t("seePlans")}
                  <ArrowRightIcon className={styles.btnIcon} />
                </button>
              </section>
            )}

            {/* Suppressed when locked — the upsell panel below already explains why. */}
            {error && !locked && (
              <div className={`${styles.row} ${styles.rowBot}`}>
                <div className={styles.errorBubble} role="alert">
                  <AlertIcon className={styles.errorIcon} />
                  <span>{error}</span>
                </div>
              </div>
            )}
          </div>

          <div className={styles.composerDock}>
          <div className={`${styles.composer} ${locked ? styles.composerLocked : ""}`}>
            <input
              ref={csv.fileInputRef}
              type="file"
              accept=".csv,text/csv"
              data-testid="analyst-file-input"
              onChange={(e) => {
                csv.setFile(e.target.files?.[0] || null);
                // Reset so re-picking the same filename still fires onChange.
                e.target.value = "";
              }}
              style={{ display: "none" }}
            />

            <ComposerAttachment
              csv={csv}
              onUpload={uploadNow}
            />

            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={locked || needsUpload}
              placeholder={
                locked
                  ? t("quotaPlaceholder")
                  : needsUpload
                    ? t("noDataPlaceholder")
                    : isStrategy
                      ? t("strategyPlaceholder")
                      : t("placeholder")
              }
              aria-label={t("placeholder")}
            />
            <div className={styles.composerFooter}>
              {/* Never gated on needsUpload — attaching is how you escape that state. */}
              <button
                type="button"
                className={styles.attachBtn}
                onClick={pickFile}
                disabled={csv.uploading}
                aria-label={t("uploadAttach")}
                title={t("uploadAttach")}
              >
                <PaperclipIcon className={styles.attachIcon} />
              </button>
              {/* Scope lives beside the input it affects, not in a separate bar. */}
              {!isStrategy && hasData && (
                <button
                  type="button"
                  className={styles.scopeChip}
                  onClick={() => setScopeAll((v) => !v)}
                  title={t("scopeToggle")}
                >
                  <ChartIcon className={styles.scopeChipIcon} />
                  <span>{scopeAll ? t("scopeAll") : scopeLabel}</span>
                </button>
              )}
              <span className={styles.composerNote}>
                {locked ? t("quotaResets") : t("shiftEnter")}
              </span>
              {!isEmpty && !busy && (
                <button className={styles.textBtn} onClick={clear}>
                  {t("clear")}
                </button>
              )}
              {busy ? (
                <button className={styles.stopBtn} onClick={stop} aria-label={t("stop")}>
                  <StopIcon className={styles.sendIcon} />
                </button>
              ) : (
                <button
                  className={styles.sendBtn}
                  disabled={!input.trim() || locked || needsUpload}
                  onClick={submit}
                  aria-label={t("send")}
                >
                  <SendIcon className={styles.sendIcon} />
                </button>
              )}
            </div>
          </div>

            <p className={styles.disclaimer}>
              <InfoIcon className={styles.disclaimerIcon} />
              <span>{isStrategy ? t("strategyDisclaimer") : t("disclaimer")}</span>
            </p>
          </div>
        </div>
      <HistoryDrawer
        history={history}
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onOpenConversation={(id) => void openConversation(id)}
      />

      <Toast message={toast} />
    </div>
  );
}

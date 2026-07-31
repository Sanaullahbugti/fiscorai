import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { EmptyPeriod } from "@/components/EmptyPeriod";
import { useAuth } from "@/hooks/useAuth";
import { ROUTES } from "@/constants";
import { useAnalystChat, messageText } from "./useAnalystChat";
import { AnswerBody } from "./AnswerBody";
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
      <span>{copied ? label + " ✓" : label}</span>
    </button>
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
    messages,
    clear,
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

  const isPremium = user?.userSubscription?.active || quota?.premium;
  const isEmpty = messages.length === 0;
  const showMeter = !!quota && !quota.premium;

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.headerMark} aria-hidden>
          <SparkIcon className={styles.headerMarkIcon} />
        </span>
        <div className={styles.headerText}>
          <h1 className={styles.title}>{t("title")}</h1>
          <p className={styles.subtitle}>{t("subtitle")}</p>
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
      </header>

      {loadingFiles ? (
        <div className={styles.loading}>
          <span className={styles.spinner} aria-hidden />
          <span>{t("thinking")}</span>
        </div>
      ) : !hasData ? (
        <EmptyPeriod body={t("empty:bodyAnalyst")} />
      ) : (
        <div className={styles.chatContainer}>
          <div ref={chatRef} className={styles.chatBox}>
            {isEmpty ? (
              <div className={styles.welcome}>
                <span className={styles.welcomeMark} aria-hidden>
                  <SparkIcon className={styles.welcomeMarkIcon} />
                </span>
                <p className={styles.welcomeText}>{t("emptyPrompts")}</p>
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
              </div>
            ) : (
              messages.map((m, i) => {
                const text = messageText(m);
                const isUser = m.role === "user";
                const isLast = i === messages.length - 1;
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
                      ) : text ? (
                        <AnswerBody text={text} />
                      ) : (
                        <span className={styles.caret} aria-label={t("thinking")} />
                      )}
                    </div>
                    {showTools && text && (
                      <div className={styles.actions}>
                        <CopyButton text={text} label={t("copy")} />
                        {isLast && (
                          <button
                            type="button"
                            className={styles.actionBtn}
                            onClick={() => void regenerate()}
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

            {busy && !streaming && (
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

          <div className={`${styles.composer} ${locked ? styles.composerLocked : ""}`}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={locked}
              placeholder={locked ? t("quotaPlaceholder") : t("placeholder")}
              aria-label={locked ? t("quotaPlaceholder") : t("placeholder")}
            />
            <div className={styles.composerFooter}>
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
                  disabled={!input.trim() || locked}
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
            <span>{t("disclaimer")}</span>
          </p>
        </div>
      )}
    </div>
  );
}

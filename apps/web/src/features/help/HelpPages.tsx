import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { contactApi } from "@/api";
import { Toast } from "@/components/Toast";
import { useToast } from "@/hooks/useToast";
import styles from "./HelpPages.module.css";

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

export function FaqPage() {
  const { t } = useTranslation("help");
  const [open, setOpen] = useState<number | null>(0);
  const [query, setQuery] = useState("");
  const faqs = t("faqs", { returnObjects: true }) as Array<{ q: string; a: string }>;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return faqs;
    return faqs.filter((f) => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q));
  }, [faqs, query]);

  return (
    <div className={styles.page}>
      <div className={styles.helpHead}>
        <h1 className={styles.helpTitle}>{t("helpTitle")}</h1>
        <p className={styles.helpSubtitle}>{t("helpSubtitle")}</p>
        <div className={styles.searchBox}>
          <SearchIcon className={styles.searchIcon} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchPlaceholder")}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className={styles.noResults}>{t("noResults")}</div>
      ) : (
        <div className={styles.faqList}>
          {filtered.map((f, i) => {
            const isOpen = open === i;
            return (
              <div
                key={f.q}
                className={styles.faqCard}
                style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}
              >
                <button
                  className={styles.faqBtn}
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : i)}
                >
                  <span className={styles.faqQ}>{f.q}</span>
                  <span className={`${styles.faqChevron} ${isOpen ? styles.faqChevronOpen : ""}`} aria-hidden>
                    ▾
                  </span>
                </button>
                <div className={`${styles.faqAnswerWrap} ${isOpen ? styles.faqAnswerOpen : ""}`}>
                  <div className={styles.faqAnswerInner}>
                    <div className={styles.faqAnswer}>{f.a}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ContactPage() {
  const { t } = useTranslation("help");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [touched, setTouched] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast, flash } = useToast();

  const errors = {
    name: !name.trim(),
    email: !EMAIL_RE.test(email.trim()),
    message: message.trim().length < 5,
  };
  const hasErrors = errors.name || errors.email || errors.message;

  const sendMutation = useMutation({
    mutationFn: () => contactApi.send({ name, email, message }),
    onSuccess: () => {
      flash(t("messageSent"));
      setName("");
      setEmail("");
      setMessage("");
      setTouched(false);
      setSent(true);
      setTimeout(() => setSent(false), 4000);
    },
    onError: () => flash(t("sendFailed")),
  });

  function send() {
    setTouched(true);
    if (hasErrors) {
      flash(t("fillAll"));
      return;
    }
    sendMutation.mutate();
  }

  return (
    <div className={styles.page}>
      <Toast message={toast} />

      <div className={styles.helpHead}>
        <h1 className={styles.helpTitle}>{t("contactTitle")}</h1>
        <p className={styles.helpSubtitle}>{t("contactSubtitle")}</p>
      </div>

      <div className={styles.contactGrid}>
        <div className={styles.contactCard}>
          <div className={styles.cardTitle}>{t("getInTouch")}</div>
          <div className={styles.contactFields}>
            <label>
              <span className={styles.label}>{t("name")}</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={touched && errors.name ? styles.inputError : ""}
              />
            </label>
            <label>
              <span className={styles.label}>{t("email")}</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={touched && errors.email ? styles.inputError : ""}
              />
            </label>
          </div>
          <label>
            <span className={styles.label}>{t("message")}</span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              className={touched && errors.message ? styles.inputError : ""}
            />
          </label>
          <button className={styles.btnSend} onClick={send} disabled={sendMutation.isPending}>
            {sendMutation.isPending ? t("sending") : t("sendMessage")}
          </button>
          {sent && (
            <div className={styles.successBanner} role="status">
              <span className={styles.successMark} aria-hidden>
                ✓
              </span>
              <span>{t("messageSent")}</span>
            </div>
          )}
        </div>

        <div className={styles.asideCard}>
          <div className={styles.asideLabel}>{t("otherWays")}</div>
          <a className={styles.asideEmail} href="mailto:support@fiscor.ai">
            support@fiscor.ai
          </a>
          <div className={styles.asideBody}>{t("asideBody")}</div>
          <div className={styles.responseTime}>
            <span className={styles.responseDot} aria-hidden />
            {t("responseTime")}
          </div>
          <div className={styles.asideFooter}>{t("asideFooter")}</div>
        </div>
      </div>
    </div>
  );
}

export function LegalPage({ kind }: { kind: "privacy" | "terms" | "refund" | "cookies" }) {
  const { t } = useTranslation("help");
  const titleKey =
    kind === "privacy"
      ? "privacyTitle"
      : kind === "terms"
        ? "termsTitle"
        : kind === "refund"
          ? "refundTitle"
          : "cookiesTitle";
  const pointsKey =
    kind === "privacy"
      ? "privacyPoints"
      : kind === "terms"
        ? "termsPoints"
        : kind === "refund"
          ? "refundPoints"
          : "cookiesPoints";
  const points = t(pointsKey, { returnObjects: true }) as string[];

  return (
    <div className={styles.page}>
      <div className={styles.legalCard}>
        <div className={styles.cardTitle}>{t(titleKey)}</div>
        <div className={styles.legalIntro}>{t("legalIntro")}</div>
        <div className={styles.legalPoints}>
          {(Array.isArray(points) ? points : []).map((p) => (
            <div key={p} className={styles.legalPoint}>
              <span className={styles.legalDot}></span>
              <span>{p}</span>
            </div>
          ))}
        </div>
        <div className={styles.legalNote}>{t("legalNote")}</div>
      </div>
    </div>
  );
}

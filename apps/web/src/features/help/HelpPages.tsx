import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { contactApi } from "@/api";
import { Toast } from "@/components/Toast";
import { useToast } from "@/hooks/useToast";
import styles from "./HelpPages.module.css";

export function FaqPage() {
  const { t } = useTranslation("help");
  const [open, setOpen] = useState<number | null>(null);
  const faqs = t("faqs", { returnObjects: true }) as Array<{ q: string; a: string }>;

  return (
    <div className={styles.page}>
      <div className={styles.faqList}>
        {faqs.map((f, i) => (
          <div key={f.q} className={styles.faqCard}>
            <button className={styles.faqBtn} onClick={() => setOpen(open === i ? null : i)}>
              <span className={styles.faqQ}>{f.q}</span>
              <span className={styles.faqSign}>{open === i ? "−" : "+"}</span>
            </button>
            {open === i && <div className={styles.faqAnswer}>{f.a}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ContactPage() {
  const { t } = useTranslation("help");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const { toast, flash } = useToast();

  const sendMutation = useMutation({
    mutationFn: () => contactApi.send({ name, email, message }),
    onSuccess: () => {
      flash(t("messageSent"));
      setName("");
      setEmail("");
      setMessage("");
    },
    onError: () => flash(t("sendFailed")),
  });

  function send() {
    if (!name || !email || !message) {
      flash(t("fillAll"));
      return;
    }
    sendMutation.mutate();
  }

  return (
    <div className={styles.page}>
      <Toast message={toast} />

      <div className={styles.contactGrid}>
        <div className={styles.contactCard}>
          <div className={styles.cardTitle}>{t("getInTouch")}</div>
          <div className={styles.contactFields}>
            <label>
              <span className={styles.label}>{t("name")}</span>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label>
              <span className={styles.label}>{t("email")}</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
          </div>
          <label>
            <span className={styles.label}>{t("message")}</span>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5} />
          </label>
          <button className={styles.btnSend} onClick={send}>
            {t("sendMessage")}
          </button>
        </div>

        <div className={styles.asideCard}>
          <div className={styles.asideEmail}>support@fiscor.ai</div>
          <div className={styles.asideBody}>{t("asideBody")}</div>
          <div className={styles.asideFooter}>{t("asideFooter")}</div>
        </div>
      </div>
    </div>
  );
}

export function LegalPage({ kind }: { kind: "privacy" | "terms" }) {
  const { t } = useTranslation("help");
  const points =
    kind === "privacy"
      ? [t("privacy1"), t("privacy2"), t("privacy3"), t("privacy4")]
      : [t("terms1"), t("terms2"), t("terms3"), t("terms4")];

  return (
    <div className={styles.page}>
      <div className={styles.legalCard}>
        <div className={styles.cardTitle}>{kind === "privacy" ? t("privacyTitle") : t("termsTitle")}</div>
        <div className={styles.legalIntro}>{t("legalIntro")}</div>
        <div className={styles.legalPoints}>
          {points.map((p) => (
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

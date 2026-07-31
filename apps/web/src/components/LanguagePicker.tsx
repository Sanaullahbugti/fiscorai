import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { LANGUAGE_OPTIONS } from "@/constants";
import styles from "./LanguagePicker.module.css";

type Variant = "brand" | "sidebar" | "light";

export function LanguagePicker({
  value,
  onChange,
  variant = "light",
}: {
  value: string;
  onChange: (code: string) => void;
  variant?: Variant;
}) {
  const { t } = useTranslation("common");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const current =
    LANGUAGE_OPTIONS.find((o) => o.code === value) || LANGUAGE_OPTIONS[0];

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (variant === "sidebar" || variant === "light") {
    return (
      <div
        className={`${styles.pills} ${variant === "sidebar" ? styles.pillsSidebar : styles.pillsLight}`}
        role="group"
        aria-label={t("language")}
      >
        {LANGUAGE_OPTIONS.map((opt) => {
          const on = opt.code === value;
          return (
            <button
              key={opt.code}
              type="button"
              className={on ? styles.pillOn : styles.pill}
              aria-pressed={on}
              aria-label={opt.label}
              title={opt.label}
              onClick={() => onChange(opt.code)}
            >
              {opt.short}
            </button>
          );
        })}
      </div>
    );
  }

  // Mobile brand bar: compact trigger + menu
  return (
    <div className={styles.brandRoot} ref={rootRef}>
      <button
        type="button"
        className={`${styles.brandTrigger} ${open ? styles.brandTriggerOpen : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`${t("language")}: ${current.label}`}
        onClick={() => setOpen((v) => !v)}
      >
        <svg className={styles.globe} width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
          <path
            d="M3 12h18M12 3c2.5 2.8 3.8 5.8 3.8 9s-1.3 6.2-3.8 9c-2.5-2.8-3.8-5.8-3.8-9S9.5 5.8 12 3Z"
            stroke="currentColor"
            strokeWidth="1.75"
          />
        </svg>
        <span className={styles.brandCode}>{current.short}</span>
        <svg
          className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`}
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden
        >
          <path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open ? (
        <div className={styles.menu} role="listbox" id={listId} aria-label={t("chooseLanguage")}>
          <div className={styles.menuTitle}>{t("language")}</div>
          {LANGUAGE_OPTIONS.map((opt) => {
            const on = opt.code === value;
            return (
              <button
                key={opt.code}
                type="button"
                role="option"
                aria-selected={on}
                className={`${styles.menuItem} ${on ? styles.menuItemOn : ""}`}
                onClick={() => {
                  onChange(opt.code);
                  setOpen(false);
                }}
              >
                <span className={styles.menuShort}>{opt.short}</span>
                <span className={styles.menuLabel}>{opt.label}</span>
                {on ? (
                  <svg className={styles.check} width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M5 12.5l4.5 4.5L19 7.5"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <span className={styles.checkSpacer} />
                )}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

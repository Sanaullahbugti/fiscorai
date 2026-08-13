import { useTranslation } from "react-i18next";
import { useToastStore } from "@/stores/toastStore";
import styles from "./Toast.module.css";

export function Toast({ message }: { message: string }) {
  const { t } = useTranslation("common");
  const clear = useToastStore((s) => s.clear);
  if (!message) return null;
  return (
    <div className={styles.toast} role="status">
      <span className={styles.toastText}>{message}</span>
      <button type="button" className={styles.dismiss} onClick={clear} aria-label={t("close")}>
        ×
      </button>
    </div>
  );
}

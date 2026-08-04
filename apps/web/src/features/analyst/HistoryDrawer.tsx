import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { useConversations } from "./useConversations";
import { CloseIcon, TrashIcon, PencilIcon, CheckIcon } from "./icons";
import styles from "./HistoryDrawer.module.css";

type Props = {
  history: ReturnType<typeof useConversations>;
  open: boolean;
  onClose: () => void;
  onOpenConversation: (id: string) => void;
};

export function HistoryDrawer({ history, open, onClose, onOpenConversation }: Props) {
  const { t } = useTranslation("analyst");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  if (!open) return null;

  function commitRename(id: string) {
    const title = draft.trim();
    if (title) history.rename(id, title);
    setEditingId(null);
  }

  return (
    <>
      <div className={styles.scrim} onClick={onClose} aria-hidden />
      <aside className={styles.drawer} role="dialog" aria-label={t("historyTitle")}>
        <header className={styles.head}>
          <h2 className={styles.title}>{t("historyTitle")}</h2>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label={t("historyClose")}
          >
            <CloseIcon className={styles.closeIcon} />
          </button>
        </header>

        {history.loadingList ? (
          <p className={styles.empty}>{t("historyLoading")}</p>
        ) : !history.conversations.length ? (
          <p className={styles.empty}>{t("historyEmpty")}</p>
        ) : (
          <ul className={styles.list}>
            {history.conversations.map((c) => (
              <li
                key={c.id}
                className={`${styles.item} ${c.id === history.activeId ? styles.itemActive : ""}`}
              >
                {editingId === c.id ? (
                  <div className={styles.editRow}>
                    <input
                      className={styles.editInput}
                      value={draft}
                      autoFocus
                      aria-label={t("historyRename")}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitRename(c.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                    />
                    <button
                      type="button"
                      className={styles.iconBtn}
                      aria-label={t("historyRenameSave")}
                      onClick={() => commitRename(c.id)}
                    >
                      <CheckIcon className={styles.itemIcon} />
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      className={styles.openBtn}
                      onClick={() => {
                        onOpenConversation(c.id);
                        onClose();
                      }}
                    >
                      <span className={styles.itemTitle}>{c.title}</span>
                      <span className={styles.itemMeta}>
                        {c.mode === "ecommerce-strategy" ? t("modeStrategy") : t("modeVat")}
                        {" · "}
                        {new Date(c.updatedAt).toLocaleDateString()}
                      </span>
                    </button>
                    <div className={styles.itemActions}>
                      <button
                        type="button"
                        className={styles.iconBtn}
                        aria-label={t("historyRename")}
                        onClick={() => {
                          setEditingId(c.id);
                          setDraft(c.title);
                        }}
                      >
                        <PencilIcon className={styles.itemIcon} />
                      </button>
                      <button
                        type="button"
                        className={`${styles.iconBtn} ${styles.danger}`}
                        aria-label={t("historyDelete")}
                        onClick={() => history.remove(c.id)}
                      >
                        <TrashIcon className={styles.itemIcon} />
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </aside>
    </>
  );
}

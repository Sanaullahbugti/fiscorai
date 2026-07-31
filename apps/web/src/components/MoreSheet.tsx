import { useEffect, useRef, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { ROUTES } from "@/constants";
import { MORE_ITEMS, SHEET_ENTER_MS, SHEET_EXIT_MS } from "./AppShell.nav";
import styles from "./AppShell.module.css";

type SheetPhase = "idle" | "enter" | "open" | "exit";

export function MoreSheet({
  sheetPhase,
  setSheetPhase,
  dragY,
  setDragY,
  dragging,
  setDragging,
  plan,
  userLabel,
  moreBtnRef,
  closeBtnRef,
  onClose,
  onLogout,
}: {
  sheetPhase: SheetPhase;
  setSheetPhase: (p: SheetPhase) => void;
  dragY: number;
  setDragY: (n: number) => void;
  dragging: boolean;
  setDragging: (b: boolean) => void;
  plan: string;
  userLabel: string;
  moreBtnRef: RefObject<HTMLButtonElement | null>;
  closeBtnRef: RefObject<HTMLButtonElement | null>;
  onClose: (returnFocus?: boolean) => void;
  onLogout: () => void;
}) {
  const { t } = useTranslation(["shell", "common"]);
  const location = useLocation();
  const navigate = useNavigate();
  const sheetRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragStartY = useRef(0);
  const dragCurrentY = useRef(0);
  const draggingRef = useRef(false);
  const returnFocusRef = useRef(true);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (sheetPhase !== "open") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [sheetPhase, closeBtnRef, onClose]);

  const applyDragVisual = (dy: number) => {
    const sheet = sheetRef.current;
    const overlay = overlayRef.current;
    if (sheet) sheet.style.transform = `translate3d(0, ${dy}px, 0)`;
    if (overlay) {
      const h = Math.max(sheet?.offsetHeight ?? 420, 1);
      overlay.style.opacity = String(Math.max(0.15, 1 - (dy / h) * 0.9));
    }
  };

  const onDragStart = (clientY: number) => {
    if (sheetPhase !== "open") return;
    dragStartY.current = clientY;
    dragCurrentY.current = 0;
    draggingRef.current = true;
    setDragging(true);
    if (sheetRef.current) sheetRef.current.style.transition = "none";
    if (overlayRef.current) overlayRef.current.style.transition = "none";
  };

  const onDragMove = (clientY: number) => {
    if (!draggingRef.current) return;
    const dy = Math.max(0, clientY - dragStartY.current);
    dragCurrentY.current = dy;
    applyDragVisual(dy);
  };

  const onDragEnd = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
    const dy = dragCurrentY.current;
    const sheetH = sheetRef.current?.offsetHeight ?? 400;
    if (dy > Math.min(110, sheetH * 0.2)) {
      setDragY(dy);
      returnFocusRef.current = true;
      onClose();
    } else {
      if (sheetRef.current) {
        sheetRef.current.style.transition = `transform ${SHEET_ENTER_MS}ms cubic-bezier(0.05, 0.7, 0.1, 1)`;
        sheetRef.current.style.transform = "translate3d(0, 0, 0)";
      }
      if (overlayRef.current) {
        overlayRef.current.style.transition = `opacity ${SHEET_ENTER_MS}ms cubic-bezier(0.05, 0.7, 0.1, 1)`;
        overlayRef.current.style.opacity = "1";
      }
      setDragY(0);
    }
  };

  const sheetVisible = sheetPhase === "open";
  const overlayOpacity =
    sheetPhase === "exit" ? 0 : sheetVisible ? 1 : sheetPhase === "enter" ? 0 : 1;
  const sheetTransform =
    sheetPhase === "open" && !dragging
      ? "translate3d(0, 0, 0)"
      : sheetPhase === "exit"
        ? "translate3d(0, 105%, 0)"
        : dragging || dragY > 0
          ? `translate3d(0, ${dragY}px, 0)`
          : "translate3d(0, 100%, 0)";

  return (
    <div
      ref={overlayRef}
      className={styles.moreOverlay}
      role="presentation"
      style={{
        opacity: overlayOpacity,
        transition: dragging
          ? "none"
          : sheetPhase === "exit"
            ? `opacity ${SHEET_EXIT_MS}ms cubic-bezier(0.4, 0, 1, 1)`
            : `opacity ${SHEET_ENTER_MS}ms cubic-bezier(0.05, 0.7, 0.1, 1)`,
      }}
      onClick={() => onClose()}
    >
      <div
        ref={sheetRef}
        className={`${styles.moreSheet} ${sheetPhase === "open" || sheetPhase === "exit" ? styles.moreSheetSettled : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="more-sheet-title"
        style={{
          transform: sheetTransform,
          transition: dragging
            ? "none"
            : sheetPhase === "exit"
              ? `transform ${SHEET_EXIT_MS}ms cubic-bezier(0.4, 0, 1, 1)`
              : `transform ${SHEET_ENTER_MS}ms cubic-bezier(0.05, 0.7, 0.1, 1)`,
        }}
        onClick={(e) => e.stopPropagation()}
        onTransitionEnd={(e) => {
          if (e.target !== sheetRef.current || e.propertyName !== "transform") return;
          if (sheetPhase === "exit") {
            setSheetPhase("idle");
            setDragY(0);
            if (closeTimerRef.current) {
              clearTimeout(closeTimerRef.current);
              closeTimerRef.current = null;
            }
            if (returnFocusRef.current) moreBtnRef.current?.focus();
          }
        }}
      >
        <div
          className={styles.moreGrab}
          onPointerDown={(e) => {
            if ((e.target as HTMLElement).closest("button")) return;
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            onDragStart(e.clientY);
          }}
          onPointerMove={(e) => onDragMove(e.clientY)}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
        >
          <div className={styles.moreHandle} aria-hidden />
          <div className={styles.moreHeader}>
            <h2 id="more-sheet-title" className={styles.moreTitle}>
              {t("common:more")}
            </h2>
            <button
              ref={closeBtnRef as RefObject<HTMLButtonElement>}
              type="button"
              className={styles.moreClose}
              onClick={() => onClose()}
              aria-label={t("common:close")}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
        <div className={styles.moreBody}>
          <div className={styles.moreList}>
            {MORE_ITEMS.map((item, i) => (
              <button
                key={item.to}
                type="button"
                className={`${styles.moreItem} ${location.pathname === item.to ? styles.moreItemActive : ""}`}
                style={{ ["--i" as string]: i }}
                onClick={() => {
                  onClose(false);
                  navigate(item.to);
                }}
              >
                <span>{t(`nav.${item.key}`)}</span>
                {item.to === ROUTES.billing ? <span className={styles.moreHint}>{plan}</span> : null}
              </button>
            ))}
          </div>
          <button
            type="button"
            className={styles.moreLogout}
            style={{ ["--i" as string]: MORE_ITEMS.length }}
            onClick={() => {
              onClose(false);
              onLogout();
            }}
          >
            <span>{t("common:logOut")}</span>
            <span className={styles.moreHint}>{userLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

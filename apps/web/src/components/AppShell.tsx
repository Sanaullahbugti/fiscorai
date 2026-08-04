import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ROUTES } from "@/constants";
import { useAuth } from "@/hooks/useAuth";
import { useShellPeriod } from "@/hooks/PeriodProvider";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { usePeriodInsights } from "@/hooks/usePeriodInsights";
import { useProcessedData } from "@/hooks/useProcessedData";
import { LanguagePicker } from "@/components/LanguagePicker";
import { PeriodBar } from "@/components/PeriodBar";
import { MoreSheet } from "@/components/MoreSheet";
import { TabIcon } from "@/components/TabIcon";
import { HEADER_SLOT_ID } from "@/components/HeaderSlot";
import { useUiStore } from "@/stores/uiStore";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  MOBILE_TABS,
  MORE_ROUTES,
  NAV,
  SHEET_EXIT_MS,
  SHOW_PERIOD,
  TITLE_KEYS,
} from "./AppShell.nav";
import styles from "./AppShell.module.css";

function AppShellInner() {
  const { t } = useTranslation(["shell", "common"]);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const period = useShellPeriod();
  const isMobile = useIsMobile();
  const { hasData } = useProcessedData(period.payload);
  const { attentionCount } = usePeriodInsights(period.payload, hasData);
  const lang = useUiStore((s) => s.lang);
  const setLang = useUiStore((s) => s.setLang);
  const [sheetPhase, setSheetPhase] = useState<"idle" | "enter" | "open" | "exit">("idle");
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const moreBtnRef = useRef<HTMLButtonElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enterRafRef = useRef(0);

  const plan = user?.userSubscription?.plan || "Free";
  const showPeriod = SHOW_PERIOD.has(location.pathname);
  const titleKey = TITLE_KEYS[location.pathname];
  const title = titleKey ? t(`titles.${titleKey}`) : "FiscorAI";
  const moreActive = MORE_ROUTES.has(location.pathname);
  const moreMounted = sheetPhase !== "idle";
  const moreOpen = sheetPhase === "enter" || sheetPhase === "open";

  const clearSheetTimers = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    if (enterRafRef.current) {
      cancelAnimationFrame(enterRafRef.current);
      enterRafRef.current = 0;
    }
  }, []);

  const openMore = useCallback(() => {
    clearSheetTimers();
    setDragY(0);
    setDragging(false);
    setSheetPhase("enter");
    enterRafRef.current = requestAnimationFrame(() => {
      enterRafRef.current = requestAnimationFrame(() => {
        setSheetPhase("open");
        enterRafRef.current = 0;
      });
    });
  }, [clearSheetTimers]);

  const closeMore = useCallback(
    (returnFocus = true) => {
      if (sheetPhase === "idle" || sheetPhase === "exit") return;
      clearSheetTimers();
      setDragging(false);
      setSheetPhase("exit");
      closeTimerRef.current = setTimeout(() => {
        setSheetPhase("idle");
        setDragY(0);
        closeTimerRef.current = null;
        if (returnFocus) moreBtnRef.current?.focus();
      }, SHEET_EXIT_MS);
    },
    [sheetPhase, clearSheetTimers],
  );

  useEffect(() => () => clearSheetTimers(), [clearSheetTimers]);

  useEffect(() => {
    if (moreMounted) closeMore(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- close on route change only
  }, [location.pathname]);

  useEffect(() => {
    if (!isMobile && moreMounted) closeMore(false);
  }, [isMobile, moreMounted, closeMore]);

  const doLogout = () => {
    logout();
    navigate(ROUTES.signin);
  };

  return (
    <div className={`${styles.shell} ${isMobile ? styles.shellMobile : ""}`}>
      <aside className={styles.aside} aria-hidden={isMobile || undefined}>
        <div className={styles.brand}>
          Fiscor<span>AI</span>
        </div>
        <nav className={styles.nav}>
          {NAV.map((n) => {
              const reviewBadge =
                n.key === "review" && attentionCount > 0 ? String(attentionCount) : null;
              const badge =
                reviewBadge ?? ("badge" in n && n.badge ? String(n.badge) : null);
              return (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) => `${styles.navBtn} ${isActive ? styles.navActive : ""}`}
            >
              <span>{t(`nav.${n.key}`)}</span>
              {badge ? <span className={styles.badge}>{badge}</span> : null}
            </NavLink>
              );
            })}
        </nav>
        <div className={styles.footer}>
          <div className={styles.planBox}>
            <div className={styles.planLabel}>{t("currentPlan")}</div>
            <div className={styles.planName}>{plan}</div>
            <div className={styles.planLimit}>{t(`common:planLimitsShort.${plan}`, { defaultValue: t("common:planLimitsShort.Free") })}</div>
          </div>
          <LanguagePicker value={lang} onChange={setLang} variant="sidebar" />
          <button type="button" className={styles.logout} onClick={doLogout}>
            {t("common:logOut")}
          </button>
        </div>
      </aside>

      <main className={styles.main}>
        {isMobile ? (
          <div className={styles.mobileBrand}>
            <div className={styles.mobileBrandName}>
              Fiscor<span>AI</span>
            </div>
            <span className={styles.mobilePlan}>{plan}</span>
            <LanguagePicker value={lang} onChange={setLang} variant="brand" />
          </div>
        ) : null}

        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <h1>{title}</h1>
            <div className={styles.email}>{user?.email || user?.username}</div>
          </div>
          {showPeriod ? (
            <PeriodBar key={location.pathname} period={period} accentApply collapsible={isMobile} />
          ) : null}
          {/* Pages with their own toolbar portal into this instead of adding a
              second row below the header. Collapses to nothing when unused. */}
          <div id={HEADER_SLOT_ID} className={styles.headerSlot} />
        </header>

        <div className={styles.content}>
          <Outlet />
        </div>

        {isMobile ? (
          <nav className={styles.tabBar} aria-label={t("primaryNav")}>
            {MOBILE_TABS.map((tab) => {
              const active = location.pathname === tab.to;
              const reviewBadge =
                tab.key === "review" && attentionCount > 0 ? String(attentionCount) : null;
              const badge =
                reviewBadge ?? ("badge" in tab && tab.badge ? String(tab.badge) : null);
              return (
                <NavLink
                  key={tab.to}
                  to={tab.to}
                  className={`${styles.tabBtn} ${active ? styles.tabBtnActive : ""}`}
                  onClick={() => closeMore(false)}
                >
                  <span className={styles.tabIconWrap}>
                    <TabIcon name={tab.icon} />
                  </span>
                  <span className={styles.tabLabel}>{t(`tabs.${tab.key}`)}</span>
                  {badge ? <span className={styles.tabBadge}>{badge}</span> : null}
                </NavLink>
              );
            })}
            <button
              ref={moreBtnRef}
              type="button"
              className={`${styles.tabBtn} ${moreActive || moreOpen ? styles.tabBtnActive : ""}`}
              onClick={() => (moreOpen ? closeMore() : openMore())}
              aria-expanded={moreOpen}
              aria-haspopup="dialog"
            >
              <span className={styles.tabIconWrap}>
                <TabIcon name="more" />
              </span>
              <span className={styles.tabLabel}>{t("common:more")}</span>
            </button>
          </nav>
        ) : null}
      </main>

      {isMobile && moreMounted ? (
        <MoreSheet
          sheetPhase={sheetPhase}
          setSheetPhase={setSheetPhase}
          dragY={dragY}
          setDragY={setDragY}
          dragging={dragging}
          setDragging={setDragging}
          plan={plan}
          userLabel={user?.email || user?.username || ""}
          moreBtnRef={moreBtnRef}
          closeBtnRef={closeBtnRef}
          onClose={closeMore}
          onLogout={doLogout}
        />
      ) : null}
    </div>
  );
}

export function AppShell() {
  return <AppShellInner />;
}

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import { ROUTES } from "@/constants";
import { LanguagePicker } from "@/components/LanguagePicker";
import { useUiStore } from "@/stores/uiStore";
import { CheckIcon, FileIcon, SendIcon, SparkIcon, UploadIcon } from "@/features/analyst/icons";
import {
  BoxIcon3D,
  ChatIcon3D,
  CoinIcon3D,
  DocumentIcon3D,
  GearIcon3D,
  GlobeIcon3D,
  ShieldIcon3D,
} from "./LandingIcons";
import { useLandingDemo } from "./useLandingDemo";
import { CountryVatChart } from "@/components/CountryVatChart";
import styles from "./LandingPage.module.css";

/**
 * Animates a stat like "€36,466" or "90 sec" counting up from 0 the first
 * time it scrolls into view — splits off the leading number, animates just
 * that with an ease-out curve, and re-attaches whatever prefix/suffix text
 * came with it (currency symbol, "sec", etc.) unchanged.
 */
function CountUpValue({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    setDisplay(value);
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const match = value.match(/^([^\d-]*)([\d,.]+)(.*)$/);
    if (!match) return;
    const [, prefix, numStr, suffix] = match;
    const decimals = numStr.includes(".") ? numStr.split(".")[1].length : 0;
    const target = parseFloat(numStr.replace(/,/g, ""));
    if (!Number.isFinite(target)) return;

    let cancelled = false;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || cancelled) return;
        obs.disconnect();
        const duration = 1100;
        const start = performance.now();
        function tick(now: number) {
          if (cancelled) return;
          const t = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - t, 3);
          const formatted = (target * eased).toLocaleString("en-GB", {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
          });
          setDisplay(`${prefix}${formatted}${suffix}`);
          if (t < 1) requestAnimationFrame(tick);
          else setDisplay(value);
        }
        requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    obs.observe(el);
    return () => {
      cancelled = true;
      obs.disconnect();
    };
  }, [value]);

  return <span ref={ref}>{display}</span>;
}

/** Fades a section up into place the first time it scrolls into view. */
function Reveal({
  children,
  className = "",
  delayMs = 0,
}: {
  children: ReactNode;
  className?: string;
  delayMs?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          obs.disconnect();
          if (delayMs <= 0) setVisible(true);
          else window.setTimeout(() => setVisible(true), delayMs);
        }
      },
      { threshold: 0.01, rootMargin: "0px 0px -4% 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [delayMs]);

  return (
    <div
      ref={ref}
      className={`${styles.reveal} ${visible ? styles.revealIn : ""} ${className}`.trim()}
    >
      {children}
    </div>
  );
}

/** Soft parallax on decorative morphic orbs tied to scroll. */
function useParallaxStyle(strength = 28): CSSProperties {
  const [y, setY] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setY(window.scrollY));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);
  return { transform: `translate3d(0, ${-(y * strength) / 900}px, 0)` };
}

function MorphImg({
  src,
  alt,
  className,
  style,
}: {
  src: string;
  alt: string;
  className?: string;
  style?: CSSProperties;
}) {
  return <img src={src} alt={alt} className={className} style={style} draggable={false} />;
}

export function LandingPage() {
  const { t } = useTranslation("landing");
  const lang = useUiStore((s) => s.lang);
  const setLang = useUiStore((s) => s.setLang);
  const d = useLandingDemo();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [activeStep, setActiveStep] = useState(0);
  const stepRefs = useRef<(HTMLElement | null)[]>([]);
  const parallaxSlow = useParallaxStyle(18);
  const parallaxFast = useParallaxStyle(42);

  const nav = [
    { href: "#how", label: t("nav.how") },
    { href: "#chat", label: t("nav.chat") },
    { href: "#proof", label: t("nav.proof") },
    { href: "#report", label: t("nav.report") },
    { href: "#pricing", label: t("nav.pricing") },
    { href: "/blog/", label: t("nav.blog") },
  ] as const;

  const steps = [
    {
      n: "01",
      title: t("steps.s1Title"),
      body: t("steps.s1Body"),
      image: "/landing/step-01-upload.png",
      alt: t("steps.s1Alt"),
    },
    {
      n: "02",
      title: t("steps.s2Title"),
      body: t("steps.s2Body"),
      image: "/landing/step-02-process.png",
      alt: t("steps.s2Alt"),
    },
    {
      n: "03",
      title: t("steps.s3Title"),
      body: t("steps.s3Body"),
      image: "/landing/step-03-chat.png",
      alt: t("steps.s3Alt"),
    },
  ] as const;

  const offerItems = [
    { title: t("offer.i1Title"), body: t("offer.i1Body"), icon: ChatIcon3D },
    { title: t("offer.i2Title"), body: t("offer.i2Body"), icon: DocumentIcon3D },
    { title: t("offer.i3Title"), body: t("offer.i3Body"), icon: GlobeIcon3D },
    { title: t("offer.i4Title"), body: t("offer.i4Body"), icon: ShieldIcon3D },
  ] as const;

  const chatShowcase = [
    { role: "user" as const, text: t("chat.u1") },
    {
      role: "ai" as const,
      text: <Trans i18nKey="landing:chat.a1" components={{ strong: <strong /> }} />,
    },
    { role: "user" as const, text: t("chat.u2") },
    {
      role: "ai" as const,
      text: <Trans i18nKey="landing:chat.a2" components={{ strong: <strong /> }} />,
    },
    { role: "user" as const, text: t("chat.u3") },
    {
      role: "ai" as const,
      text: t("chat.a3"),
      report: { title: t("chat.reportTitle"), meta: t("chat.reportMeta") },
    },
  ] as const;

  useEffect(() => {
    document.title = t("docTitle");
  }, [t]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  useEffect(() => {
    const nodes = stepRefs.current.filter(Boolean) as HTMLElement[];
    if (!nodes.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible?.target) return;
        const idx = nodes.indexOf(visible.target as HTMLElement);
        if (idx >= 0) setActiveStep(idx);
      },
      { threshold: [0.35, 0.55, 0.75], rootMargin: "-20% 0px -35% 0px" },
    );
    nodes.forEach((n) => obs.observe(n));
    return () => obs.disconnect();
  }, []);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <div className={styles.page}>
      <div className={styles.navWrap}>
        <div className={styles.navBar}>
          <a href="#top" className={styles.logo} onClick={closeMenu}>
            Fiscor<span>AI</span>
          </a>

          <nav className={styles.navDesktop} aria-label={t("nav.primary")}>
            {nav.map((item) => (
              <a key={item.href} href={item.href} className={styles.navLink}>
                {item.label}
              </a>
            ))}
          </nav>

          <div className={styles.headerActions}>
            <div className={styles.langPicker}>
              <LanguagePicker value={lang} onChange={setLang} variant="brand" />
            </div>
            <Link to={ROUTES.signin} className={styles.btnGhost}>
              {t("cta.signIn")}
            </Link>
            <Link to={ROUTES.signup} className={styles.btnPrimarySm}>
              {t("cta.chatFree")}
            </Link>
            <button
              type="button"
              className={styles.menuBtn}
              aria-expanded={menuOpen}
              aria-controls="landing-mobile-nav"
              aria-label={menuOpen ? t("a11y.closeMenu") : t("a11y.openMenu")}
              onClick={() => setMenuOpen((o) => !o)}
            >
              <span className={menuOpen ? styles.menuIconOpen : styles.menuIcon} />
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav id="landing-mobile-nav" className={styles.navMobile} aria-label={t("nav.mobile")}>
            {nav.map((item) => (
              <a key={item.href} href={item.href} className={styles.navMobileLink} onClick={closeMenu}>
                {item.label}
              </a>
            ))}
            <div className={styles.navMobileLang}>
              <LanguagePicker value={lang} onChange={setLang} variant="brand" />
            </div>
            <Link to={ROUTES.signin} className={styles.navMobileLink} onClick={closeMenu}>
              {t("cta.signIn")}
            </Link>
            <Link to={ROUTES.signup} className={styles.btnPrimary} onClick={closeMenu}>
              {t("cta.chatFreeLong")}
            </Link>
          </nav>
        )}
      </div>

      <section id="top" className={styles.heroStage}>
        <div className={styles.heroAtmosphere} aria-hidden>
          <span className={styles.heroWash} />
          <span className={styles.heroMesh} />
          <MorphImg
            src="/landing/orb-glass-gold.png"
            alt=""
            className={`${styles.floatOrb} ${styles.floatOrbGold}`}
            style={parallaxFast}
          />
          <MorphImg
            src="/landing/orb-glass-green.png"
            alt=""
            className={`${styles.floatOrb} ${styles.floatOrbGreen}`}
            style={parallaxSlow}
          />
        </div>

        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <p className={styles.brandHero}>
              Fiscor<span>AI</span>
            </p>
            <h1 className={styles.heroTitle}>{t("hero.title")}</h1>
            <p className={styles.heroLead}>{t("hero.lead")}</p>
            <div className={styles.ctaRow}>
              <Link to={ROUTES.signup} className={`${styles.btnPrimary} ${styles.heroPulse}`}>
                {t("cta.chatFreeLong")}
              </Link>
              <a href="#how" className={styles.btnSecondary}>
                {t("cta.seeHow")}
              </a>
            </div>
            <div className={styles.trust}>
              <span>{t("hero.noCard")}</span>
              <span aria-hidden>·</span>
              <span>{t("hero.fileYours")}</span>
            </div>
          </div>

          <div className={styles.heroVisual}>
            <div className={styles.heroGlassRing} aria-hidden />
            <MorphImg
              src="/landing/hero-vat-analyst.png"
              alt={t("hero.artAlt")}
              className={styles.heroArt}
            />
          </div>
        </div>

        <a href="#how" className={styles.scrollCue} aria-label={t("a11y.scrollHow")}>
          <span className={styles.scrollCueLine} />
        </a>
      </section>

      <section id="how" className={styles.stepsSection}>
        <Reveal>
          <div className={styles.sectionHeadCenter}>
            <span className={styles.kicker}>{t("steps.kicker")}</span>
            <h2 className={styles.h2}>{t("steps.title")}</h2>
            <p className={styles.sectionLead}>{t("steps.lead")}</p>
          </div>
        </Reveal>

        <div className={styles.stepsRail} aria-hidden>
          <div className={styles.stepsRailTrack} />
          <div
            className={styles.stepsRailFill}
            style={{ width: `${((activeStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        <Reveal>
          <ol className={styles.stepsGrid}>
            {steps.map((s, i) => (
              <li
                key={s.n}
                ref={(el) => {
                  stepRefs.current[i] = el;
                }}
                className={`${styles.stepCard} ${activeStep === i ? styles.stepCardActive : ""}`}
              >
                <div className={styles.stepIconWrap}>
                  <MorphImg src={s.image} alt={s.alt} className={styles.stepIcon} />
                </div>
                <span className={styles.stepNum}>{s.n}</span>
                <h3 className={styles.stepTitle}>{s.title}</h3>
                <p className={styles.stepBody}>{s.body}</p>
              </li>
            ))}
          </ol>
        </Reveal>
      </section>

      <Reveal>
        <section className={styles.splitSection}>
          <div className={styles.splitRow}>
            <div className={styles.splitCopy}>
              <span className={styles.splitKicker}>{t("pipeline.kicker")}</span>
              <h2 className={styles.splitTitle}>{t("pipeline.title")}</h2>
              <p className={styles.splitBody}>{t("pipeline.body")}</p>
              <div className={styles.ctaRow} style={{ justifyContent: "flex-start", marginTop: 24 }}>
                <Link to={ROUTES.signup} className={styles.btnPrimary}>
                  {t("cta.tryOwnFile")}
                </Link>
              </div>
            </div>
            <div className={styles.splitVisual}>
              <div className={styles.haloWrap}>
              <span className={styles.glowHalo} aria-hidden />
              <BoxIcon3D className={styles.icon3d} style={{ width: 54, height: 54, top: -22, right: 12 }} />
              <GearIcon3D
                className={`${styles.icon3d} ${styles.orbSlow} ${styles.orbDelay}`}
                style={{ width: 36, height: 36, bottom: -14, left: 24 }}
              />
              <div className={styles.pipelineCard}>
                <div className={styles.pipelineDots} aria-hidden>
                  <span className={`${styles.pipelineDot} ${styles.pipelineDot1}`} />
                  <span className={`${styles.pipelineDot} ${styles.pipelineDot2}`} />
                  <span className={`${styles.pipelineDot} ${styles.pipelineDot3}`} />
                </div>

                <div className={styles.pipelineStage} aria-hidden>
                  <div className={`${styles.pipelinePanel} ${styles.pipelineUpload}`}>
                    <div className={styles.dropZone}>
                      <UploadIcon className={styles.dropZoneIcon} />
                      <span className={styles.dropZoneLabel}>{t("pipeline.dropLabel")}</span>
                    </div>
                    <div className={styles.fileChip}>
                      <FileIcon className={styles.fileChipIcon} />
                      <span>Amazon_VAT_Transactions.csv</span>
                    </div>
                  </div>

                  <div className={`${styles.pipelinePanel} ${styles.pipelineProcessing}`}>
                    <div className={styles.spinnerRing} />
                    <div className={styles.statusCycle}>
                      <span className={`${styles.statusLine} ${styles.statusLine1}`}>{t("pipeline.status1")}</span>
                      <span className={`${styles.statusLine} ${styles.statusLine2}`}>{t("pipeline.status2")}</span>
                      <span className={`${styles.statusLine} ${styles.statusLine3}`}>{t("pipeline.status3")}</span>
                    </div>
                    <div className={styles.progressTrack}>
                      <div className={styles.progressFill} />
                    </div>
                  </div>

                  <div className={`${styles.pipelinePanel} ${styles.pipelinePdf}`}>
                    <div className={styles.pdfPreview}>
                      <div className={styles.pdfPreviewHead}>
                        <FileIcon className={styles.pdfPreviewIcon} />
                        <span>VAT_Report_Q2_2026.pdf</span>
                        <span className={styles.pdfCheck}>
                          <CheckIcon className={styles.pdfCheckIcon} />
                        </span>
                      </div>
                      <div className={styles.pdfPreviewRow}>
                        <span>{t("pipelinePreview.germany")}</span>
                        <span>€1,842.10</span>
                      </div>
                      <div className={styles.pdfPreviewRow}>
                        <span>{t("pipelinePreview.france")}</span>
                        <span>€1,203.55</span>
                      </div>
                      <div className={styles.pdfPreviewRow}>
                        <span>{t("pipelinePreview.italy")}</span>
                        <span>€866.90</span>
                      </div>
                    </div>
                    <div className={styles.pdfBadgeRow}>
                      <span className={styles.pdfBadge}>{t("pipeline.ready")}</span>
                      <span className={styles.chip}>PDF</span>
                      <span className={styles.chip}>Excel</span>
                    </div>
                  </div>
                </div>

                <div className={styles.pipelineCaptions}>
                  <span className={`${styles.pipelineCaption} ${styles.pipelineCaption1}`}>{t("pipeline.cap1")}</span>
                  <span className={`${styles.pipelineCaption} ${styles.pipelineCaption2}`}>{t("pipeline.cap2")}</span>
                  <span className={`${styles.pipelineCaption} ${styles.pipelineCaption3}`}>{t("pipeline.cap3")}</span>
                </div>
              </div>
              </div>
            </div>
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section id="chat" className={styles.splitSection}>
          <div className={`${styles.splitRow} ${styles.splitReverse}`}>
            <div className={styles.splitCopy}>
              <span className={styles.splitKicker}>{t("chat.kicker")}</span>
              <h2 className={styles.splitTitle}>{t("chat.title")}</h2>
              <p className={styles.splitBody}>{t("chat.body")}</p>
              <div className={styles.ctaRow} style={{ justifyContent: "flex-start", marginTop: 24 }}>
                <Link to={ROUTES.signup} className={styles.btnPrimary}>
                  {t("cta.chatFreeLong")}
                </Link>
              </div>
            </div>
            <div className={styles.splitVisual}>
              <div className={styles.haloWrap}>
              <span className={styles.glowHalo} aria-hidden />
              <ChatIcon3D className={styles.icon3d} style={{ width: 50, height: 50, top: -20, left: 20 }} />
              <CoinIcon3D
                className={`${styles.icon3d} ${styles.orbSlow}`}
                style={{ width: 32, height: 32, bottom: -12, right: 36 }}
              />
              <div className={styles.heroCard}>
                <div className={styles.chatShowcaseBody} style={{ padding: 0 }}>
                  {chatShowcase.map((turn, i) =>
                    turn.role === "user" ? (
                      <div key={i} className={styles.chatMsg}>
                        <span className={styles.chatBubbleUser}>{turn.text}</span>
                      </div>
                    ) : (
                      <div key={i} className={styles.chatMsgGroup}>
                        <div className={styles.chatMsg}>
                          <span className={styles.chatAvatarAI} aria-hidden>
                            <SparkIcon className={styles.chatAvatarIcon} />
                          </span>
                          <span className={styles.chatBubbleAI}>{turn.text}</span>
                        </div>
                        {"report" in turn && turn.report && (
                          <div className={styles.chatReportCard}>
                            <FileIcon className={styles.chatReportIcon} />
                            <span className={styles.chatReportTextCol}>
                              <span className={styles.chatReportTitle}>{turn.report.title}</span>
                              <span className={styles.mutedSmall}>{turn.report.meta}</span>
                            </span>
                            <span className={styles.chip}>PDF</span>
                            <span className={styles.chip}>Excel</span>
                          </div>
                        )}
                      </div>
                    ),
                  )}
                  <Link to={ROUTES.signup} className={styles.chatComposer}>
                    <span className={styles.chatComposerText}>{t("chat.composer")}</span>
                    <span className={styles.chatComposerBtn} aria-hidden>
                      <SendIcon className={styles.chatComposerIcon} />
                    </span>
                  </Link>
                </div>
              </div>
              </div>
            </div>
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section id="proof" className={styles.offerSection}>
          <div className={styles.sectionHeadCenter}>
            <span className={styles.kicker}>{t("offer.kicker")}</span>
            <h2 className={styles.h2}>{t("offer.title")}</h2>
            <p className={styles.sectionLead}>{t("offer.lead")}</p>
          </div>
          <div className={styles.offerGrid}>
            {offerItems.map((item) => {
              const OfferIcon = item.icon;
              return (
                <div key={item.title} className={styles.offerCard}>
                  <OfferIcon className={styles.icon3dInline} />
                  <div className={styles.offerTitle}>{item.title}</div>
                  <p className={styles.offerBody}>{item.body}</p>
                </div>
              );
            })}
          </div>
        </section>
      </Reveal>

      <Reveal>
        <div className={`${styles.statsBand} ${styles.haloWrap}`}>
          <span
            className={`${styles.orb} ${styles.orbGreen}`}
            style={{ width: 34, height: 34, top: -14, left: "6%" }}
            aria-hidden
          />
          <span
            className={`${styles.orb} ${styles.orbGold} ${styles.orbDelay}`}
            style={{ width: 22, height: 22, bottom: -10, right: "10%" }}
            aria-hidden
          />
          {d.stats.map((s) => (
            <div key={s.label} className={styles.statCard}>
              <div className={styles.statValue}>
                <CountUpValue value={s.value} />
              </div>
              <div className={styles.statLabel}>{s.label}</div>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal>
        <section className={styles.section}>
          <div className={styles.chartsHead}>
            <div>
              <span className={styles.kicker}>{t("charts.kicker")}</span>
              <h2 className={styles.h2}>{t("charts.title")}</h2>
              <p className={styles.sectionLead}>{t("charts.lead")}</p>
            </div>
            <div className={styles.rangePills} role="group" aria-label={t("a11y.timeRange")}>
              {d.ranges.map((n) => (
                <button
                  key={n}
                  type="button"
                  className={d.range === n ? styles.rangeActive : styles.rangeBtn}
                  onClick={() => d.setRange(n)}
                >
                  {t("charts.months", { n })}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.chartsGrid}>
            <div className={styles.card}>
              <div className={styles.cardHead}>
                <span className={styles.cardTitle}>{t("charts.netVsVat")}</span>
                <span className={styles.lineLegend}>
                  {d.lineLegend.map((l) => (
                    <span key={l.label} className={styles.lineLegendItem}>
                      <span className={styles.lineSwatch} style={{ background: l.color }} />
                      {l.label}
                    </span>
                  ))}
                </span>
              </div>
              <div className={styles.lineChart}>
                <div className={styles.yAxis}>
                  {d.axisLabels.map((a) => (
                    <span key={a}>{a}</span>
                  ))}
                </div>
                <div className={styles.linePlot}>
                  <svg viewBox="0 0 560 264" className={styles.lineSvg} aria-hidden>
                    {d.grid.map((g) => (
                      <line key={g.y} x1="0" y1={g.y} x2="560" y2={g.y} stroke="#EDE7DB" strokeWidth="1" />
                    ))}
                    {d.lineSeries.map((s) => (
                      <polyline
                        key={s.color}
                        points={s.points}
                        fill="none"
                        stroke={s.color}
                        strokeWidth="2.5"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />
                    ))}
                    {d.lineDots.map((dot, i) => (
                      <circle key={i} cx={dot.x} cy={dot.y} r="3.5" fill={dot.color} />
                    ))}
                  </svg>
                  <div className={styles.xAxis}>
                    {d.monthLabels.map((m, i) => (
                      <span key={i}>{m}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardHead}>
                <span className={styles.cardTitle}>{t("charts.vatByCountry")}</span>
                <span className={styles.mutedSmall}>{d.rangeLabel}</span>
              </div>
              <CountryVatChart
                items={d.countryBars.map((c) => ({
                  code: c.code,
                  name: c.name,
                  valueLabel: c.value,
                  heightPct: c.heightPct,
                  color: c.color,
                }))}
                height={200}
              />
            </div>
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section id="report" className={styles.section}>
          <span className={styles.kicker}>{t("report.kicker")}</span>
          <h2 className={styles.h2}>{t("report.title")}</h2>
          <p className={styles.sectionLead}>{t("report.lead")}</p>

          <div className={styles.reportStage}>
            <div className={styles.reportAsk} aria-hidden>
              <span className={styles.reportAskBubble}>{t("report.askBubble")}</span>
            </div>

            <div className={styles.tableCard}>
              <div className={styles.reportDocHead}>
                <FileIcon className={styles.reportDocIcon} />
                <div className={styles.reportDocText}>
                  <span className={styles.reportDocTitle}>{t("report.docTitle")}</span>
                  <span className={styles.reportDocMeta}>{t("report.docMeta")}</span>
                </div>
                <div className={styles.reportChips}>
                  <span className={styles.chip}>PDF</span>
                  <span className={styles.chip}>Excel</span>
                </div>
              </div>

              <div className={styles.tableScroll}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th className={styles.thLeft}>{t("report.country")}</th>
                      <th className={styles.thRight}>{t("report.netSales")}</th>
                      <th className={styles.thRight}>{t("report.refunds")}</th>
                      <th className={styles.thRight}>{t("report.applied")}</th>
                      <th className={styles.thRight}>{t("report.correct")}</th>
                      <th className={styles.thRight}>{t("report.vatDue")}</th>
                      <th className={styles.thRight}>{t("report.gap")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.reportRows.map((r) => (
                      <tr key={r.name}>
                        <td className={styles.tdName}>{r.name}</td>
                        <td className={styles.tdNum}>{r.net}</td>
                        <td className={styles.tdMuted}>{r.refunds}</td>
                        <td className={styles.tdNum}>{r.applied}</td>
                        <td className={styles.tdNum}>{r.correct}</td>
                        <td className={styles.tdStrong}>{r.vat}</td>
                        <td className={styles.tdStrong} style={{ color: r.gapColor }}>
                          {r.gap}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className={styles.tfoot}>
                      <td className={styles.tdName}>{t("report.total")}</td>
                      <td className={styles.tdStrong}>{d.totalNetLabel}</td>
                      <td className={styles.tdMuted}>{d.totalRefundLabel}</td>
                      <td />
                      <td />
                      <td className={styles.tdStrong}>{d.totalVatLabel}</td>
                      <td className={styles.tdGap}>{d.totalGapLabel}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className={styles.reportLedger}>
                {d.reportRows.map((r) => (
                  <div key={r.name} className={styles.reportLedgerRow}>
                    <span className={styles.reportLedgerName}>{r.name}</span>
                    <span className={styles.reportLedgerVat}>{r.vat}</span>
                    <div className={styles.reportLedgerMeta}>
                      <span>{t("report.ledgerNet", { value: r.net })}</span>
                      <span>{t("report.ledgerRefunds", { value: r.refunds })}</span>
                      <span>
                        {t("report.ledgerRate", { applied: r.applied, correct: r.correct })}
                      </span>
                      <span className={styles.reportLedgerGap}>
                        {t("report.ledgerGap", { value: r.gap })}
                      </span>
                    </div>
                  </div>
                ))}
                <div className={`${styles.reportLedgerRow} ${styles.reportLedgerTotal}`}>
                  <span className={styles.reportLedgerName}>{t("report.total")}</span>
                  <span className={styles.reportLedgerVat}>{d.totalVatLabel}</span>
                  <div className={styles.reportLedgerMeta}>
                    <span>{t("report.ledgerNet", { value: d.totalNetLabel })}</span>
                    <span>{t("report.ledgerRefunds", { value: d.totalRefundLabel })}</span>
                    <span className={styles.reportLedgerGap}>
                      {t("report.ledgerGap", { value: d.totalGapLabel })}
                    </span>
                  </div>
                </div>
              </div>

              <div className={styles.tableFooter}>
                <span className={styles.mutedSmall}>{t("report.exportAs")}</span>
                <span className={styles.chip}>PDF</span>
                <span className={styles.chip}>Excel</span>
                <Link to={ROUTES.signup} className={styles.tableLink}>
                  {t("cta.openReport")}
                </Link>
              </div>
            </div>
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section id="risk" className={styles.riskSection}>
          <div className={styles.card}>
            <div className={styles.cardTitleLg}>{t("risk.title")}</div>
            <p className={styles.cardLead}>{t("risk.lead")}</p>
            <div className={styles.flags}>
              {d.flags.map((f) => (
                <div
                  key={f.title}
                  className={styles.flag}
                  style={{ borderColor: f.border, background: f.bg }}
                >
                  <div className={styles.flagHead}>
                    <span className={styles.flagLevel} style={{ color: f.fg }}>
                      {f.level}
                    </span>
                    <span className={styles.flagTitle}>{f.title}</span>
                    <span className={styles.flagAmount} style={{ color: f.fg }}>
                      {f.amount}
                    </span>
                  </div>
                  <div className={styles.flagBody}>{f.body}</div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.riskAside}>
            <div className={styles.card}>
              <div className={styles.cardTitleLg}>{t("risk.filingsTitle")}</div>
              <p className={styles.cardLead}>{t("risk.filingsLead")}</p>
              <div className={styles.filings}>
                {d.filings.map((f, i) => (
                  <div key={f.title} className={i === 0 ? styles.filingFirst : styles.filing}>
                    <div>
                      <div className={styles.filingTitle}>{f.title}</div>
                      <div className={styles.mutedSmall}>
                        {f.due} · {f.amount}
                      </div>
                    </div>
                    <span className={styles.countdown} style={{ background: f.bg, color: f.fg }}>
                      {f.countdown}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {d.showCalculator && (
              <div className={styles.calc}>
                <div className={styles.cardTitleLg}>{t("risk.calcTitle")}</div>
                <p className={styles.calcLead}>{t("risk.calcLead")}</p>
                <div className={styles.calcRev}>
                  <span className={styles.calcRevValue}>{d.calcRevenueLabel}</span>
                  <span className={styles.calcRevUnit}>{t("risk.calcUnit")}</span>
                </div>
                <input
                  type="range"
                  min={5000}
                  max={500000}
                  step={5000}
                  value={d.calcRevenue}
                  onChange={(e) => d.setCalc(Number(e.target.value))}
                  className={styles.slider}
                  aria-label={t("a11y.monthlyEuSales")}
                />
                <div className={styles.calcOut}>
                  {d.calcOut.map((c) => (
                    <div key={c.label} className={styles.calcOutItem}>
                      <div className={styles.calcOutLabel}>{c.label}</div>
                      <div className={styles.calcOutValue}>{c.value}</div>
                    </div>
                  ))}
                </div>
                <Link to={ROUTES.signup} className={styles.btnAccent}>
                  {t("cta.checkNumbers")}
                </Link>
              </div>
            )}
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section id="pricing" className={`${styles.pricingSection} ${styles.haloWrap}`}>
          <CoinIcon3D
            className={`${styles.icon3d} ${styles.orbSlow}`}
            style={{ width: 40, height: 40, top: -10, left: "4%" }}
          />
          <div className={styles.sectionHeadCenter}>
            <span className={styles.kicker}>{t("pricing.kicker")}</span>
            <h2 className={styles.h2}>{t("pricing.title")}</h2>
            <p className={styles.sectionLead}>{t("pricing.lead")}</p>
          </div>
          <div className={styles.plansGrid}>
            {d.plans.map((p) => (
              <div
                key={p.name}
                className={styles.plan}
                style={{ background: p.surface, color: p.ink, border: `1px solid ${p.border}` }}
              >
                <div className={styles.planNameRow}>
                  <span className={styles.cardTitleLg}>{p.name}</span>
                  {p.tag ? <span className={styles.planTag}>{p.tag}</span> : null}
                </div>
                <div className={styles.planPrice}>
                  <span className={styles.planAmount}>{p.price}</span>
                  <span className={styles.planPer}>{p.per}</span>
                </div>
                <div className={styles.planFeatures}>
                  {p.features.map((f) => (
                    <div key={f} className={styles.planFeature}>
                      <span style={{ color: p.check }} className={styles.check}>
                        ✓
                      </span>
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
                <Link
                  to={ROUTES.signup}
                  className={styles.planCta}
                  style={{ background: p.ctaBg, color: p.ctaFg, borderColor: p.ctaBorder }}
                >
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className={`${styles.faqSection} ${styles.haloWrap}`}>
          <DocumentIcon3D
            className={`${styles.icon3d} ${styles.orbDelay}`}
            style={{ width: 34, height: 34, top: -2, right: "6%" }}
          />
          <div className={styles.sectionHeadCenter}>
            <span className={styles.kicker}>{t("faq.kicker")}</span>
            <h2 className={styles.h2}>{t("faq.title")}</h2>
          </div>
          <div className={styles.faqPanel}>
            {d.faqs.map((q, i) => {
              const open = openFaq === i;
              return (
                <div key={q.q} className={styles.faqItem}>
                  <button
                    type="button"
                    className={styles.faqTrigger}
                    aria-expanded={open}
                    onClick={() => setOpenFaq(open ? null : i)}
                  >
                    <span className={styles.faqQ}>{q.q}</span>
                    <span className={open ? `${styles.faqIcon} ${styles.faqIconOpen}` : styles.faqIcon} aria-hidden>
                      +
                    </span>
                  </button>
                  {open && <div className={styles.faqA}>{q.a}</div>}
                </div>
              );
            })}
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className={styles.panel} style={{ marginTop: 96 }}>
          <span className={styles.panelBlobA} aria-hidden />
          <span className={styles.panelBlobB} aria-hidden />
          <MorphImg
            src="/landing/orb-glass-gold.png"
            alt=""
            className={styles.floatOrb}
            style={{ width: 88, top: 18, right: "8%", ...parallaxSlow }}
          />
          <MorphImg
            src="/landing/orb-glass-green.png"
            alt=""
            className={styles.floatOrb}
            style={{ width: 64, bottom: 28, left: "7%", animationDelay: "-4s", ...parallaxFast }}
          />
          <div className={styles.ctaPanel}>
            <div className={styles.ctaTitle}>{t("finalCta.title")}</div>
            <p className={styles.ctaLead}>{t("finalCta.lead")}</p>
            <div className={styles.ctaActions}>
              <Link to={ROUTES.signup} className={styles.btnLight}>
                {t("cta.chatShort")}
              </Link>
            </div>
          </div>
        </section>
      </Reveal>

      <footer className={styles.footer}>
        <span className={styles.footerBrand}>
          Fiscor<span>AI</span>
        </span>
        <span className={styles.footerLinks}>
          <a href="/blog/">{t("nav.blog")}</a>
          <Link to={ROUTES.signin}>{t("cta.signIn")}</Link>
          <a href="mailto:support@fiscorai.com">support@fiscorai.com</a>
          <Link to={ROUTES.faq}>{t("footer.faq")}</Link>
          <Link to={ROUTES.privacy}>{t("footer.privacy")}</Link>
          <Link to={ROUTES.terms}>{t("footer.terms")}</Link>
          <Link to={ROUTES.refund}>{t("footer.refunds")}</Link>
          <Link to={ROUTES.cookies}>{t("footer.cookies")}</Link>
        </span>
      </footer>
    </div>
  );
}

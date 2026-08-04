import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ROUTES } from "@/constants";
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

const NAV = [
  { href: "#how", label: "How it works" },
  { href: "#chat", label: "Ask FiscorAI" },
  { href: "#proof", label: "What you get" },
  { href: "#report", label: "Reports" },
  { href: "#pricing", label: "Pricing" },
  // Plain page, not an in-page anchor — static blog outside the SPA router.
  { href: "/blog/", label: "Blog" },
] as const;

const STEPS = [
  {
    n: "01",
    title: "Upload your Amazon report",
    body: "Drop your VAT transactions CSV once. No template, no column renaming — FiscorAI reads Amazon’s export as-is.",
    image: "/landing/step-01-upload.png",
    alt: "3D morphic icon of an Amazon VAT CSV upload",
  },
  {
    n: "02",
    title: "Processed locally, in minutes",
    body: "Every row is parsed, matched to the correct VAT rate by country, and scanned for wrong rates, refund anomalies, and unclassified rows.",
    image: "/landing/step-02-process.png",
    alt: "3D morphic icon of automated VAT processing",
  },
  {
    n: "03",
    title: "Ask anything, anytime",
    body: 'Just ask — “vat this quarter”, “what changed”, “send me the PDF” — answers from your real figures, never estimates.',
    image: "/landing/step-03-chat.png",
    alt: "3D morphic icon of the FiscorAI chat analyst",
  },
] as const;

const OFFER_ITEMS = [
  {
    title: "One chat, every answer",
    body: 'Ask in plain language — "vat this quarter", "what changed", "send me the PDF" — and get answers computed from your real data, never estimated.',
    icon: ChatIcon3D,
  },
  {
    title: "Reports, the moment you ask",
    body: "The chat hands you the exact PDF or Excel file as soon as you need it — no menu, no period picker to hunt through, just ask.",
    icon: DocumentIcon3D,
  },
  {
    title: "Country-by-country VAT report",
    body: "Net sales, refunds, applied vs. correct rate, and VAT due for every EU country you sold in — ready to export.",
    icon: GlobeIcon3D,
  },
  {
    title: "Deterministic error checks",
    body: "Every upload is scanned for wrong rates, refund anomalies, and unclassified rows — the same checks, every time, not a model's best guess.",
    icon: ShieldIcon3D,
  },
] as const;

// A second, fuller exchange for the dedicated showcase section — illustrates
// casual phrasing, a "what changed" question, and a report request landing on
// an actual download card, back to back, the way a real conversation runs.
const CHAT_SHOWCASE = [
  { role: "user" as const, text: "vat this quarter?" },
  {
    role: "ai" as const,
    text: (
      <>
        Q2 2026: you owe about <strong>€4,812.30</strong> in VAT on net sales of{" "}
        <strong>€21,340.10</strong> — refunds were <strong>€918.20</strong>.
      </>
    ),
  },
  { role: "user" as const, text: "what changed since last quarter?" },
  {
    role: "ai" as const,
    text: (
      <>
        VAT due is up <strong>12%</strong> quarter-on-quarter, mostly from higher Germany sales.
        Refund rate is steady at <strong>4.3%</strong>, right at your 12-month norm.
      </>
    ),
  },
  { role: "user" as const, text: "can I get that as a pdf?" },
  {
    role: "ai" as const,
    text: <>Here's your Q2 2026 VAT report — ready to download or hand to your accountant.</>,
    report: { title: "Q2 2026 VAT report", meta: "Ready to download" },
  },
] as const;

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
      // Generous rootMargin so fast scrolls still trip the reveal; 0.01 threshold
      // avoids needing a large fraction of tall sections on screen.
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
  const d = useLandingDemo();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [activeStep, setActiveStep] = useState(0);
  const stepRefs = useRef<(HTMLElement | null)[]>([]);
  const parallaxSlow = useParallaxStyle(18);
  const parallaxFast = useParallaxStyle(42);

  useEffect(() => {
    document.title = "FiscorAI — Ask your VAT questions, get the answer and the report";
  }, []);

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

          <nav className={styles.navDesktop} aria-label="Primary">
            {NAV.map((item) => (
              <a key={item.href} href={item.href} className={styles.navLink}>
                {item.label}
              </a>
            ))}
          </nav>

          <div className={styles.headerActions}>
            <Link to={ROUTES.signin} className={styles.btnGhost}>
              Sign in
            </Link>
            <Link to={ROUTES.signup} className={styles.btnPrimarySm}>
              Chat free
            </Link>
            <button
              type="button"
              className={styles.menuBtn}
              aria-expanded={menuOpen}
              aria-controls="landing-mobile-nav"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen((o) => !o)}
            >
              <span className={menuOpen ? styles.menuIconOpen : styles.menuIcon} />
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav id="landing-mobile-nav" className={styles.navMobile} aria-label="Mobile">
            {NAV.map((item) => (
              <a key={item.href} href={item.href} className={styles.navMobileLink} onClick={closeMenu}>
                {item.label}
              </a>
            ))}
            <Link to={ROUTES.signin} className={styles.navMobileLink} onClick={closeMenu}>
              Sign in
            </Link>
            <Link to={ROUTES.signup} className={styles.btnPrimary} onClick={closeMenu}>
              Chat with FiscorAI free
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
            <h1 className={styles.heroTitle}>Ask what you owe. Get the answer — and the report.</h1>
            <p className={styles.heroLead}>
              Upload your Amazon VAT file once. From then on, just ask — grounded in your figures,
              never guessed.
            </p>
            <div className={styles.ctaRow}>
              <Link to={ROUTES.signup} className={`${styles.btnPrimary} ${styles.heroPulse}`}>
                Chat with FiscorAI free
              </Link>
              <a href="#how" className={styles.btnSecondary}>
                See how it works
              </a>
            </div>
            <div className={styles.trust}>
              <span>No card required</span>
              <span aria-hidden>·</span>
              <span>Your file stays yours</span>
            </div>
          </div>

          <div className={styles.heroVisual}>
            <div className={styles.heroGlassRing} aria-hidden />
            <MorphImg
              src="/landing/hero-vat-analyst.png"
              alt="FiscorAI soft-3D product scene with VAT report, euro coin, and marketplace carts"
              className={styles.heroArt}
            />
          </div>
        </div>

        <a href="#how" className={styles.scrollCue} aria-label="Scroll to how it works">
          <span className={styles.scrollCueLine} />
        </a>
      </section>

      <section id="how" className={styles.stepsSection}>
        <Reveal>
          <div className={styles.sectionHeadCenter}>
            <span className={styles.kicker}>How it works</span>
            <h2 className={styles.h2}>Three steps. Upload to answer.</h2>
            <p className={styles.sectionLead}>
              A continuous loop from CSV to chat — no dashboards to configure, nothing to remap.
            </p>
          </div>
        </Reveal>

        <div className={styles.stepsRail} aria-hidden>
          <div className={styles.stepsRailTrack} />
          <div
            className={styles.stepsRailFill}
            style={{ width: `${((activeStep + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        <Reveal>
          <ol className={styles.stepsGrid}>
            {STEPS.map((s, i) => (
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
              <span className={styles.splitKicker}>Watch it run</span>
              <h2 className={styles.splitTitle}>The actual pipeline, animated on repeat</h2>
              <p className={styles.splitBody}>
                This is the real upload-to-report flow, looping so you can watch the whole thing
                without lifting a finger — parsing every row, matching VAT rates by country, and
                building the report.
              </p>
              <div className={styles.ctaRow} style={{ justifyContent: "flex-start", marginTop: 24 }}>
                <Link to={ROUTES.signup} className={styles.btnPrimary}>
                  Try it on my own file
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
                  {/* Step 1 — upload */}
                  <div className={`${styles.pipelinePanel} ${styles.pipelineUpload}`}>
                    <div className={styles.dropZone}>
                      <UploadIcon className={styles.dropZoneIcon} />
                      <span className={styles.dropZoneLabel}>Drop your Amazon VAT CSV</span>
                    </div>
                    <div className={styles.fileChip}>
                      <FileIcon className={styles.fileChipIcon} />
                      <span>Amazon_VAT_Transactions.csv</span>
                    </div>
                  </div>

                  {/* Step 2 — processing */}
                  <div className={`${styles.pipelinePanel} ${styles.pipelineProcessing}`}>
                    <div className={styles.spinnerRing} />
                    <div className={styles.statusCycle}>
                      <span className={`${styles.statusLine} ${styles.statusLine1}`}>Parsing every row…</span>
                      <span className={`${styles.statusLine} ${styles.statusLine2}`}>Matching VAT rates by country…</span>
                      <span className={`${styles.statusLine} ${styles.statusLine3}`}>Building your report…</span>
                    </div>
                    <div className={styles.progressTrack}>
                      <div className={styles.progressFill} />
                    </div>
                  </div>

                  {/* Step 3 — PDF ready */}
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
                        <span>Germany</span>
                        <span>€1,842.10</span>
                      </div>
                      <div className={styles.pdfPreviewRow}>
                        <span>France</span>
                        <span>€1,203.55</span>
                      </div>
                      <div className={styles.pdfPreviewRow}>
                        <span>Italy</span>
                        <span>€866.90</span>
                      </div>
                    </div>
                    <div className={styles.pdfBadgeRow}>
                      <span className={styles.pdfBadge}>Ready</span>
                      <span className={styles.chip}>PDF</span>
                      <span className={styles.chip}>Excel</span>
                    </div>
                  </div>
                </div>

                <div className={styles.pipelineCaptions}>
                  <span className={`${styles.pipelineCaption} ${styles.pipelineCaption1}`}>1. You drop the file</span>
                  <span className={`${styles.pipelineCaption} ${styles.pipelineCaption2}`}>2. Processed locally</span>
                  <span className={`${styles.pipelineCaption} ${styles.pipelineCaption3}`}>3. Report's ready</span>
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
              <span className={styles.splitKicker}>This is the product now</span>
              <h2 className={styles.splitTitle}>Not a dashboard. A conversation.</h2>
              <p className={styles.splitBody}>
                Casual phrasing is fine, and every figure it gives you is computed from your data,
                never estimated. Ask a follow-up, ask for a comparison, or just ask for the file.
              </p>
              <div className={styles.ctaRow} style={{ justifyContent: "flex-start", marginTop: 24 }}>
                <Link to={ROUTES.signup} className={styles.btnPrimary}>
                  Chat with FiscorAI free
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
                  {CHAT_SHOWCASE.map((turn, i) =>
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
                    <span className={styles.chatComposerText}>Ask about VAT, refunds, filings…</span>
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
            <span className={styles.kicker}>What you get</span>
            <h2 className={styles.h2}>One upload, a complete VAT position</h2>
            <p className={styles.sectionLead}>
              The report, the checks, and someone to ask about it — all from a single upload.
            </p>
          </div>
          <div className={styles.offerGrid}>
            {OFFER_ITEMS.map((item) => {
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
              <span className={styles.kicker}>The numbers</span>
              <h2 className={styles.h2}>The charts your accountant asks for</h2>
              <p className={styles.sectionLead}>
                Live from a real 12-month seller file. Switch the window — everything recalculates.
              </p>
            </div>
            <div className={styles.rangePills} role="group" aria-label="Time range">
              {d.ranges.map((n) => (
                <button
                  key={n}
                  type="button"
                  className={d.range === n ? styles.rangeActive : styles.rangeBtn}
                  onClick={() => d.setRange(n)}
                >
                  {n} months
                </button>
              ))}
            </div>
          </div>

          <div className={styles.chartsGrid}>
            <div className={styles.card}>
              <div className={styles.cardHead}>
                <span className={styles.cardTitle}>Net sales vs VAT due</span>
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
                <span className={styles.cardTitle}>VAT due by country</span>
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
          <span className={styles.kicker}>Reports</span>
          <h2 className={styles.h2}>Ask for it, get exactly this</h2>
          <p className={styles.sectionLead}>
            The file the chat hands you — net sales, refunds, the rate actually applied, and the rate
            that should have applied.
          </p>

          <div className={styles.reportStage}>
            <div className={styles.reportAsk} aria-hidden>
              <span className={styles.reportAskBubble}>send me january 2026 as pdf</span>
            </div>

            <div className={styles.tableCard}>
              <div className={styles.reportDocHead}>
                <FileIcon className={styles.reportDocIcon} />
                <div className={styles.reportDocText}>
                  <span className={styles.reportDocTitle}>January 2026 VAT report</span>
                  <span className={styles.reportDocMeta}>Opened from chat · ready to export</span>
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
                      <th className={styles.thLeft}>Country</th>
                      <th className={styles.thRight}>Net sales</th>
                      <th className={styles.thRight}>Refunds</th>
                      <th className={styles.thRight}>Applied</th>
                      <th className={styles.thRight}>Correct</th>
                      <th className={styles.thRight}>VAT due</th>
                      <th className={styles.thRight}>Gap</th>
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
                      <td className={styles.tdName}>Total</td>
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
                      <span>Net {r.net}</span>
                      <span>Refunds {r.refunds}</span>
                      <span>
                        Rate {r.applied} → {r.correct}
                      </span>
                      <span className={styles.reportLedgerGap}>Gap {r.gap}</span>
                    </div>
                  </div>
                ))}
                <div className={`${styles.reportLedgerRow} ${styles.reportLedgerTotal}`}>
                  <span className={styles.reportLedgerName}>Total</span>
                  <span className={styles.reportLedgerVat}>{d.totalVatLabel}</span>
                  <div className={styles.reportLedgerMeta}>
                    <span>Net {d.totalNetLabel}</span>
                    <span>Refunds {d.totalRefundLabel}</span>
                    <span className={styles.reportLedgerGap}>Gap {d.totalGapLabel}</span>
                  </div>
                </div>
              </div>

              <div className={styles.tableFooter}>
                <span className={styles.mutedSmall}>Export as</span>
                <span className={styles.chip}>PDF</span>
                <span className={styles.chip}>Excel</span>
                <Link to={ROUTES.signup} className={styles.tableLink}>
                  Open this report in the tool →
                </Link>
              </div>
            </div>
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section id="risk" className={styles.riskSection}>
          <div className={styles.card}>
            <div className={styles.cardTitleLg}>What nobody else tells you</div>
            <p className={styles.cardLead}>
              Deterministic checks run on every upload. These are the real ones from the sample file.
            </p>
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
              <div className={styles.cardTitleLg}>Next filings</div>
              <p className={styles.cardLead}>
                Counted from today. Miss one and the penalty is a percentage, not a fee.
              </p>
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
                <div className={styles.cardTitleLg}>What is this costing you?</div>
                <p className={styles.calcLead}>
                  Slide your monthly EU sales. Based on the average error rate we measure across uploaded
                  files.
                </p>
                <div className={styles.calcRev}>
                  <span className={styles.calcRevValue}>{d.calcRevenueLabel}</span>
                  <span className={styles.calcRevUnit}>EU sales / month</span>
                </div>
                <input
                  type="range"
                  min={5000}
                  max={500000}
                  step={5000}
                  value={d.calcRevenue}
                  onChange={(e) => d.setCalc(Number(e.target.value))}
                  className={styles.slider}
                  aria-label="Monthly EU sales"
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
                  Check my real numbers free
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
            <span className={styles.kicker}>Pricing</span>
            <h2 className={styles.h2}>Start free with the full report</h2>
            <p className={styles.sectionLead}>
              Upgrade for higher transaction limits and unlimited analyst questions.
            </p>
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
            <span className={styles.kicker}>FAQ</span>
            <h2 className={styles.h2}>Popular questions</h2>
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
            <div className={styles.ctaTitle}>One upload. Then just ask.</div>
            <p className={styles.ctaLead}>
              Free, no card, deletes on request. The report is yours either way.
            </p>
            <div className={styles.ctaActions}>
              <Link to={ROUTES.signup} className={styles.btnLight}>
                Chat with FiscorAI
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
          {/* Plain <a>, not <Link> — /blog is a static page outside the SPA router. */}
          <a href="/blog/">Blog</a>
          <Link to={ROUTES.signin}>Sign in</Link>
          <a href="mailto:support@fiscor.ai">support@fiscor.ai</a>
          <Link to={ROUTES.faq}>FAQ</Link>
          <Link to={ROUTES.privacy}>Privacy</Link>
          <Link to={ROUTES.terms}>Terms</Link>
          <Link to={ROUTES.refund}>Refunds</Link>
          <Link to={ROUTES.cookies}>Cookies</Link>
        </span>
      </footer>
    </div>
  );
}

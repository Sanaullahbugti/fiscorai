import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ROUTES } from "@/constants";
import { useLandingDemo } from "./useLandingDemo";
import styles from "./LandingPage.module.css";

const NAV = [
  { href: "#proof", label: "What you get" },
  { href: "#report", label: "Reports" },
  { href: "#risk", label: "Risk check" },
  { href: "#pricing", label: "Pricing" },
] as const;

export function LandingPage() {
  const d = useLandingDemo();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.title = "FiscorAI — EU VAT for Amazon sellers";
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
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
              Analyse my CSV free
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
              Analyse my CSV free
            </Link>
          </nav>
        )}
      </header>

      <section id="top" className={styles.hero}>
        <div className={styles.heroCopy}>
          <div className={styles.eyebrow}>For Amazon EU sellers</div>
          <h1 className={styles.h1}>Your EU VAT is probably wrong. Find out in 90 seconds.</h1>
          <p className={styles.lead}>
            Drop in your Amazon transaction report. FiscorAI rebuilds it into country-by-country VAT,
            flags the rows taxed at the wrong rate, and tells you what to file where — before the
            deadline, not after the assessment.
          </p>
          <div className={styles.ctaRow}>
            <Link to={ROUTES.signup} className={styles.btnPrimary}>
              Run my free analysis
            </Link>
            <a href="#report" className={styles.btnSecondary}>
              See a real report
            </a>
          </div>
          <div className={styles.trust}>
            <span>No card required</span>
            <span aria-hidden>·</span>
            <span>7 EU countries + OSS</span>
            <span aria-hidden>·</span>
            <span>Your file is never shared</span>
          </div>
        </div>

        <div className={styles.heroCard}>
          <div className={styles.heroCardHead}>
            <span className={styles.cardTitle}>VAT position</span>
            <span className={styles.mutedSmall}>{d.heroPeriod}</span>
            <span className={styles.badgeCritical}>{d.flagCount} issues found</span>
          </div>
          <div className={styles.donutRow}>
            <div className={styles.donutWrap}>
              <svg viewBox="0 0 200 200" className={styles.donutSvg} aria-hidden>
                {d.heroDonut.map((s) => (
                  <path key={s.label} d={s.d} fill={s.fill} stroke="var(--surface-card)" strokeWidth="2" />
                ))}
                <circle cx="100" cy="100" r="58" fill="var(--surface-card)" />
              </svg>
              <div className={styles.donutCenter}>
                <span className={styles.mutedSmall}>VAT due</span>
                <span className={styles.donutValue}>{d.totalVatLabel}</span>
              </div>
            </div>
            <div className={styles.legend}>
              {d.heroDonut.map((s) => (
                <div key={s.label} className={styles.legendItem}>
                  <span className={styles.swatch} style={{ background: s.fill }} />
                  <span className={styles.muted}>{s.label}</span>
                  <span className={styles.legendValue}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
          <div className={styles.kpiGrid}>
            {d.heroKpis.map((k) => (
              <div key={k.label} className={styles.kpi}>
                <div className={styles.mutedSmall}>{k.label}</div>
                <div className={styles.kpiValue} style={{ color: k.color }}>
                  {k.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="proof" className={styles.section}>
        <div className={styles.statsGrid}>
          {d.stats.map((s) => (
            <div key={s.label} className={styles.statCard}>
              <div className={styles.statValue} style={{ color: s.color }}>
                {s.value}
              </div>
              <div className={styles.statLabel}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.sectionCharts}>
        <div className={styles.chartsHead}>
          <div>
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
            <div className={styles.bars}>
              {d.countryBars.map((c) => (
                <div key={c.name} className={styles.barRow}>
                  <span className={styles.barName}>{c.name}</span>
                  <span className={styles.barTrack}>
                    <span className={styles.barFill} style={{ width: c.pct, background: c.color }} />
                  </span>
                  <span className={styles.barValue}>{c.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="report" className={styles.sectionCharts}>
        <h2 className={styles.h2}>A filing-ready country report</h2>
        <p className={styles.sectionLeadSpaced}>
          Exactly what comes out of the tool — net sales, refunds, the rate actually applied, and the
          rate that should have applied.
        </p>
        <div className={styles.tableCard}>
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
          <div className={styles.tableFooter}>
            <span className={styles.mutedSmall}>Export as</span>
            <span className={styles.chip}>PDF</span>
            <span className={styles.chip}>Excel</span>
            <Link to={ROUTES.signup} className={styles.tableLink}>
              Open this report in the tool →
            </Link>
          </div>
        </div>
      </section>

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

      <section id="pricing" className={styles.sectionPricing}>
        <h2 className={styles.h2}>Pricing</h2>
        <p className={styles.sectionLeadSpaced}>
          Start free with the full report. Pay when you want the transaction-level detail and unlimited
          analyst questions.
        </p>
        <div className={styles.plansGrid}>
          {d.plans.map((p) => (
            <div
              key={p.name}
              className={styles.plan}
              style={{ background: p.surface, color: p.ink, borderColor: p.border }}
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

      <section className={styles.sectionPricing}>
        <div className={styles.faqGrid}>
          {d.faqs.map((q) => (
            <div key={q.q} className={styles.faqCard}>
              <div className={styles.faqQ}>{q.q}</div>
              <div className={styles.faqA}>{q.a}</div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.sectionPricing}>
        <div className={styles.finalCta}>
          <div>
            <div className={styles.finalTitle}>One upload tells you whether you have a problem.</div>
            <p className={styles.sectionLead}>
              Free, no card, deletes on request. The report is yours either way.
            </p>
          </div>
          <div className={styles.finalActions}>
            <Link to={ROUTES.signup} className={styles.btnPrimary}>
              Analyse my CSV
            </Link>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <span className={styles.footerBrand}>
          Fiscor<span>AI</span>
        </span>
        <span className={styles.footerLinks}>
          <Link to={ROUTES.signin}>Sign in</Link>
          <a href="mailto:support@fiscor.ai">support@fiscor.ai</a>
          <Link to={ROUTES.privacy}>Privacy</Link>
          <Link to={ROUTES.terms}>Terms</Link>
        </span>
      </footer>
    </div>
  );
}

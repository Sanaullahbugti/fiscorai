import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTranslation } from "react-i18next";
import { EmptyPeriod } from "@/components/EmptyPeriod";
import { useShellPeriod } from "@/hooks/PeriodProvider";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { useProcessedData } from "@/hooks/useProcessedData";
import { usePeriodInsights } from "@/hooks/usePeriodInsights";
import { formatPeriodLabel } from "@/lib/period-label";
import { aggregateCountries, categoryColor, eur } from "@/lib/tax-agg";
import { CountryVatChart } from "@/components/CountryVatChart";
import { useDashboardOverview } from "./useDashboardOverview";
import styles from "./DashboardPage.module.css";

const COUNTRY_COLUMN_COLORS = [
  "#2E5D3B",
  "#3C7A4C",
  "#3B6E8F",
  "#C8862B",
  "#6AA377",
  "#8AB894",
  "#4E8F60",
  "#C1432E",
];

export function DashboardPage() {
  const { t } = useTranslation(["dashboard", "common", "empty"]);
  const period = useShellPeriod();
  const isNarrow = useIsMobile();
  const { data, loading, hasData, meta, canonical } = useProcessedData(period.payload);
  const { overview } = useDashboardOverview();
  const { insights } = usePeriodInsights(period.payload, hasData);
  const chartH = isNarrow ? 210 : 280;
  const pieH = isNarrow ? 180 : 200;

  const agg = aggregateCountries(data, canonical);
  const vatByCountry = [...agg.byCountry]
    .sort((a, b) => b.vat - a.vat)
    .slice(0, 8);
  const maxVat = Math.max(...vatByCountry.map((c) => c.vat), 1);
  const vatColumns = vatByCountry.map((c, i) => {
    const isIso = /^[A-Z]{2,3}$/i.test(c.country);
    return {
      code: c.country === "NO COUNTRY" ? "—" : isIso ? c.country : c.country.slice(0, 2).toUpperCase(),
      name: isIso || c.country === "NO COUNTRY" ? "" : c.country,
      valueLabel: eur(c.vat),
      heightPct: (c.vat / maxVat) * 100,
      color: COUNTRY_COLUMN_COLORS[i % COUNTRY_COLUMN_COLORS.length],
    };
  });
  const periodLabel = formatPeriodLabel({
    fileType: period.fileType,
    year: period.year,
    month: period.month,
    quarter: period.quarter,
  });

  // Oldest-to-newest so the trend reads left-to-right; the API returns newest first.
  const trend = overview
    ? [...overview.byPeriod].reverse().map((p) => ({
        label: p.period.label,
        sales: p.totals.sales,
        refunds: Math.abs(p.totals.refunds),
        vat: p.totals.vat,
      }))
    : [];
  const avgRefundRatePct = overview
    ? overview.overall.sales > 0
      ? Math.round((Math.abs(overview.overall.refunds) / overview.overall.sales) * 1000) / 10
      : 0
    : 0;

  const pieSales = [
    { name: t("common:sales"), value: Math.max(0, agg.sales), fill: "#2E5D3B" },
    { name: t("common:refunds"), value: Math.abs(agg.refunds), fill: "#C8862B" },
  ];
  const pieTypes = Object.entries(agg.byCat).map(([name, value]) => ({
    name,
    value,
    fill: categoryColor(name),
  }));

  return (
    <div className={styles.page}>
      {overview && (
        <section className={styles.overviewSection}>
          <div className={styles.sectionHead}>
            <div className={styles.sectionTitle}>{t("businessOverview")}</div>
            <span className={styles.allTimeTag}>
              {t("periodsAnalyzed", { n: overview.periodCount })}
            </span>
          </div>

          <div className={styles.kpis}>
            {[
              { label: t("totalNetSales"), value: eur(overview.overall.sales), color: "#2E5D3B" },
              { label: t("totalVatDue"), value: eur(overview.overall.vat), color: "#3B6E8F" },
              {
                label: t("totalRefunds"),
                value: eur(Math.abs(overview.overall.refunds)),
                color: "#C8862B",
              },
              { label: t("avgRefundRate"), value: `${avgRefundRatePct}%`, color: "var(--text-primary)" },
            ].map((k, i) => (
              <div
                key={k.label}
                className={styles.kpi}
                style={{ animationDelay: `${i * 45}ms` }}
              >
                <div className={styles.kpiLabel}>{k.label}</div>
                <div className={styles.kpiValue} style={{ color: k.color }}>
                  {k.value}
                </div>
              </div>
            ))}
          </div>

          <div className={styles.overviewGrid}>
            <section className={styles.card}>
              <div className={styles.sectionTitle}>{t("trendTitle")}</div>
              <div className={styles.sectionSub}>{t("trendSub")}</div>
              <div className={styles.chartScroll}>
                <div className={styles.chartInner}>
                  <ResponsiveContainer width="100%" height={chartH}>
                    <LineChart
                      data={trend}
                      margin={isNarrow ? { top: 8, right: 8, left: 0, bottom: 0 } : undefined}
                    >
                      <CartesianGrid stroke="var(--border-default)" strokeDasharray="0" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: isNarrow ? 10 : 11, fill: "var(--text-secondary)" }}
                      />
                      <YAxis
                        width={isNarrow ? 42 : 60}
                        tick={{ fontSize: isNarrow ? 10 : 11, fill: "var(--text-secondary)" }}
                      />
                      <Tooltip formatter={(v: number) => eur(v)} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="sales"
                        name={t("common:sales")}
                        stroke="#2E5D3B"
                        strokeWidth={2.5}
                        dot={{ r: isNarrow ? 2.5 : 3.5 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="refunds"
                        name={t("common:refunds")}
                        stroke="#C8862B"
                        strokeWidth={2.5}
                        dot={{ r: isNarrow ? 2.5 : 3.5 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="vat"
                        name={t("common:vat")}
                        stroke="#3B6E8F"
                        strokeWidth={2.5}
                        dot={{ r: isNarrow ? 2.5 : 3.5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>

            <section className={styles.card}>
              <div className={styles.sectionTitle}>{t("topCountriesTitle")}</div>
              <div className={styles.sectionSub}>{t("topCountriesSub")}</div>
              <div className={styles.metricList} role="table">
                <div className={styles.metricHead} role="row">
                  <span role="columnheader">{t("colCountry")}</span>
                  <span className={styles.metricHeadValue} role="columnheader">
                    {t("common:vat")}
                  </span>
                </div>
                {overview.overall.topCountries.map((c, i) => (
                  <div
                    key={c.country}
                    className={styles.metricRow}
                    role="row"
                    style={{ animationDelay: `${i * 30}ms` }}
                  >
                    <div className={styles.metricIdentity} role="cell">
                      <div className={styles.metricTitle}>{c.country}</div>
                      <div className={styles.metricSecondary}>
                        <span>
                          {t("common:sales")} {eur(c.sales)}
                        </span>
                        <span aria-hidden>·</span>
                        <span>
                          {t("colRefundRate")}{" "}
                          {c.refundRatePct == null ? "—" : `${c.refundRatePct}%`}
                        </span>
                      </div>
                    </div>
                    <div className={styles.metricValue} role="cell">
                      {eur(c.vat)}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </section>
      )}

      {loading ? <p className={styles.muted}>{t("common:loading")}</p> : null}
      {!loading && !hasData ? <EmptyPeriod body={t("empty:bodyDashboard")} /> : null}

      {hasData ? (
        <>
          <section className={styles.periodSummary}>
            <header className={styles.periodSummaryHead}>
              <div>
                <div className={styles.sectionTitle}>{t("thisPeriod")}</div>
                <p className={styles.periodSummaryHint}>{t("thisPeriodHint")}</p>
              </div>
              <span className={styles.periodTag}>{periodLabel}</span>
            </header>

            <div className={styles.kpis}>
              {[
                { label: t("common:sales"), value: eur(agg.sales), color: "#2E5D3B" },
                { label: t("common:refunds"), value: eur(agg.refunds), color: "#C8862B" },
                { label: t("common:net"), value: eur(agg.net), color: "var(--text-primary)" },
                { label: t("common:vat"), value: eur(agg.vat), color: "#3B6E8F" },
              ].map((k) => (
                <div key={k.label} className={styles.kpi}>
                  <div className={styles.kpiLabel}>{k.label}</div>
                  <div className={styles.kpiValue} style={{ color: k.color }}>
                    {k.value}
                  </div>
                </div>
              ))}
            </div>

            {insights && (
              <p className={styles.periodVerdict}>{insights.pulse.verdict}</p>
            )}
          </section>

          {(meta?.truncated || insights?.meta?.truncated) && (
            <div className={styles.truncBanner} role="status">
              {t("truncatedBadge")}
            </div>
          )}
          {hasData && !meta && !insights?.meta && (
            <div className={styles.truncBanner} role="status">
              {t("metaMissingHint")}
            </div>
          )}

          {insights && insights.alerts.length > 0 && (
            <section className={styles.card}>
              <div className={styles.sectionTitle}>{t("alertsTitle")}</div>
              <ul className={styles.alertList}>
                {insights.alerts.map((a) => (
                  <li key={a.code} className={`${styles.alertItem} ${styles[`sev_${a.sev}`]}`}>
                    <strong>{a.title}</strong>
                    <span>{a.detail}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {insights && (insights.byRate.length > 0 || insights.watchlist.length > 0) && (
            <div className={styles.overviewGrid}>
              {insights.byRate.length > 0 && (
                <section className={styles.card}>
                  <div className={styles.sectionTitle}>{t("vatByRate")}</div>
                  <div className={styles.sectionSub}>{t("vatByRateSub")}</div>
                  <div className={styles.metricList} role="table">
                    <div className={styles.metricHead} role="row">
                      <span role="columnheader">{t("colRate")}</span>
                      <span className={styles.metricHeadValue} role="columnheader">
                        {t("common:vat")}
                      </span>
                    </div>
                    {insights.byRate.slice(0, 8).map((r) => (
                      <div key={r.rate} className={styles.metricRow} role="row">
                        <div className={styles.metricIdentity} role="cell">
                          <div className={styles.metricTitle}>{r.rate}</div>
                          <div className={styles.metricSecondary}>
                            <span>
                              {t("colTotal")} {eur(r.total)}
                            </span>
                          </div>
                        </div>
                        <div className={styles.metricValue} role="cell">
                          {eur(r.vat)}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
              {insights.watchlist.length > 0 && (
                <section className={styles.card}>
                  <div className={styles.sectionTitle}>{t("watchlist")}</div>
                  <div className={styles.sectionSub}>{t("watchlistSub")}</div>
                  <div className={styles.metricList} role="table">
                    <div className={styles.metricHead} role="row">
                      <span role="columnheader">{t("colCountry")}</span>
                      <span className={styles.metricHeadValue} role="columnheader">
                        {t("common:vat")}
                      </span>
                    </div>
                    {insights.watchlist.map((c) => (
                      <div key={c.country} className={styles.metricRow} role="row">
                        <div className={styles.metricIdentity} role="cell">
                          <div className={styles.metricTitle}>{c.country}</div>
                          <div className={styles.metricSecondary}>
                            <span>
                              {t("colRefundRate")}{" "}
                              {c.refundRatePct == null ? "—" : `${c.refundRatePct}%`}
                            </span>
                          </div>
                        </div>
                        <div className={styles.metricValue} role="cell">
                          {eur(c.vat)}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {insights && insights.schemeMix.length > 0 && (
            <section className={styles.card}>
              <div className={styles.sectionTitle}>{t("schemeMix")}</div>
              <div className={styles.sectionSub}>{t("schemeMixSub")}</div>
              <div className={styles.metricList} role="table">
                <div className={styles.metricHead} role="row">
                  <span role="columnheader">{t("colScheme")}</span>
                  <span className={styles.metricHeadValue} role="columnheader">
                    {t("common:vat")}
                  </span>
                </div>
                {insights.schemeMix.map((s) => (
                  <div key={s.scheme} className={styles.metricRow} role="row">
                    <div className={styles.metricIdentity} role="cell">
                      <div className={styles.metricTitle}>{s.scheme}</div>
                      <div className={styles.metricSecondary}>
                        <span>
                          {t("colShare")} {s.salesSharePct}%
                        </span>
                        <span aria-hidden>·</span>
                        <span>
                          {t("common:sales")} {eur(s.sales)}
                        </span>
                      </div>
                    </div>
                    <div className={styles.metricValue} role="cell">
                      {eur(s.vat)}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className={styles.pies}>
            <section className={styles.card}>
              <div className={styles.sectionTitle}>{t("salesVsRefunds")}</div>
              <div className={styles.sectionSub}>{periodLabel}</div>
              <div className={styles.pieRow}>
                <div className={styles.pieChart}>
                  <ResponsiveContainer width="100%" height={pieH}>
                    <PieChart>
                      <Pie
                        data={pieSales}
                        dataKey="value"
                        innerRadius={isNarrow ? 44 : 52}
                        outerRadius={isNarrow ? 70 : 80}
                        stroke="#fffcf6"
                        strokeWidth={2}
                      >
                        {pieSales.map((e) => (
                          <Cell key={e.name} fill={e.fill} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => eur(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className={styles.legendCol}>
                  {pieSales.map((s) => (
                    <div key={s.name} className={styles.legendItem}>
                      <span style={{ background: s.fill }} />
                      <em>{s.name}</em>
                      <strong>{eur(s.value)}</strong>
                    </div>
                  ))}
                  <div className={styles.centerHint}>
                    <span>{t("common:net")}</span>
                    <b>{eur(agg.net)}</b>
                  </div>
                </div>
              </div>
            </section>

            <section className={styles.card}>
              <div className={styles.sectionTitle}>{t("salesByScheme")}</div>
              <div className={styles.sectionSub}>{periodLabel}</div>
              <div className={styles.pieRow}>
                <div className={styles.pieChart}>
                  <ResponsiveContainer width="100%" height={pieH}>
                    <PieChart>
                      <Pie
                        data={pieTypes}
                        dataKey="value"
                        innerRadius={isNarrow ? 44 : 52}
                        outerRadius={isNarrow ? 70 : 80}
                        stroke="#fffcf6"
                        strokeWidth={2}
                      >
                        {pieTypes.map((e) => (
                          <Cell key={e.name} fill={e.fill} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => eur(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className={styles.legendCol}>
                  {pieTypes.map((s) => (
                    <div key={s.name} className={styles.legendItem}>
                      <span style={{ background: s.fill }} />
                      <em>{s.name}</em>
                      <strong>{eur(s.value)}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>

          <section className={styles.card}>
            <div className={styles.sectionTitle}>{t("byCountryLine")}</div>
            <div className={styles.chartScroll}>
              <div className={styles.chartInner}>
                <ResponsiveContainer width="100%" height={chartH}>
                  <LineChart data={agg.byCountry} margin={isNarrow ? { top: 8, right: 8, left: 0, bottom: 0 } : undefined}>
                    <CartesianGrid stroke="var(--border-default)" strokeDasharray="0" vertical={false} />
                    <XAxis dataKey="country" tick={{ fontSize: isNarrow ? 10 : 11, fill: "var(--text-secondary)" }} />
                    <YAxis width={isNarrow ? 42 : 60} tick={{ fontSize: isNarrow ? 10 : 11, fill: "var(--text-secondary)" }} />
                    <Tooltip formatter={(v: number) => eur(v)} />
                    <Legend />
                    <Line type="monotone" dataKey="sales" stroke="#2E5D3B" strokeWidth={2.5} dot={{ r: isNarrow ? 2.5 : 3.5 }} />
                    <Line type="monotone" dataKey="refunds" stroke="#C8862B" strokeWidth={2.5} dot={{ r: isNarrow ? 2.5 : 3.5 }} />
                    <Line type="monotone" dataKey="vat" stroke="#3B6E8F" strokeWidth={2.5} dot={{ r: isNarrow ? 2.5 : 3.5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.sectionTitle}>{t("byCountryBar")}</div>
            <div className={styles.sectionSub}>{t("byCountryBarSub")}</div>
            <CountryVatChart
              items={vatColumns}
              height={isNarrow ? 200 : 240}
            />
          </section>
        </>
      ) : null}
    </div>
  );
}

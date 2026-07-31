import {
  Bar,
  BarChart,
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
import { formatPeriodLabel } from "@/lib/period-label";
import { aggregateCountries, categoryColor, eur } from "@/lib/tax-agg";
import styles from "./DashboardPage.module.css";

export function DashboardPage() {
  const { t } = useTranslation(["dashboard", "common", "empty"]);
  const period = useShellPeriod();
  const isNarrow = useIsMobile();
  const { data, loading, hasData } = useProcessedData(period.payload);
  const chartH = isNarrow ? 210 : 280;
  const pieH = isNarrow ? 180 : 200;

  const agg = aggregateCountries(data);
  const periodLabel = formatPeriodLabel({
    fileType: period.fileType,
    year: period.year,
    month: period.month,
    quarter: period.quarter,
  });

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
      {loading ? <p className={styles.muted}>{t("common:loading")}</p> : null}
      {!loading && !hasData ? <EmptyPeriod body={t("empty:bodyDashboard")} /> : null}

      {hasData ? (
        <>
          <div className={styles.kpis}>
            {[
              { label: t("common:sales"), value: eur(agg.sales), sub: periodLabel, color: "#2E5D3B" },
              { label: t("common:refunds"), value: eur(agg.refunds), sub: periodLabel, color: "#C8862B" },
              { label: t("common:net"), value: eur(agg.net), sub: periodLabel, color: "var(--text-primary)" },
              { label: t("common:vat"), value: eur(agg.vat), sub: periodLabel, color: "#3B6E8F" },
            ].map((k) => (
              <div key={k.label} className={styles.kpi}>
                <div className={styles.kpiLabel}>{k.label}</div>
                <div className={styles.kpiValue} style={{ color: k.color }}>
                  {k.value}
                </div>
                <div className={styles.kpiSub}>{k.sub}</div>
              </div>
            ))}
          </div>

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
            <div className={styles.chartScroll}>
              <div className={styles.chartInner}>
                <ResponsiveContainer width="100%" height={chartH}>
                  <BarChart data={agg.byCountry} margin={isNarrow ? { top: 8, right: 8, left: 0, bottom: 0 } : undefined}>
                    <CartesianGrid stroke="var(--border-default)" strokeDasharray="0" vertical={false} />
                    <XAxis dataKey="country" tick={{ fontSize: isNarrow ? 10 : 11, fill: "var(--text-secondary)" }} />
                    <YAxis width={isNarrow ? 42 : 60} tick={{ fontSize: isNarrow ? 10 : 11, fill: "var(--text-secondary)" }} />
                    <Tooltip formatter={(v: number) => eur(v)} />
                    <Bar dataKey="sales" fill="#2E5D3B" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

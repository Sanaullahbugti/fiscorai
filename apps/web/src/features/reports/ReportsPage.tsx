import { useTranslation } from "react-i18next";
import { Toast } from "@/components/Toast";
import { eur } from "@/lib/tax-agg";
import { useReports } from "./useReports";
import styles from "./ReportsPage.module.css";

export function ReportsPage() {
  const { t, i18n } = useTranslation(["reports", "common"]);
  const r = useReports();

  const showFilled = r.hasData && !r.dataLoading;
  const showEmpty = !r.hasData && !r.dataLoading;

  return (
    <div className={styles.page}>
      <Toast message={r.toast} />

      <section className={styles.statusStrip} aria-label={t("choosePeriod")}>
        <div className={styles.statusMain}>
          <PeriodPicker r={r} t={t} lang={i18n.language} />
          <span
            className={`${styles.statusChip} ${r.hasCurrentFile || r.hasData ? styles.statusReady : styles.statusEmpty}`}
          >
            {r.hasCurrentFile || r.hasData ? t("statusReady") : t("statusNoReport")}
          </span>
        </div>
        <div className={styles.statusActions}>
          {(r.hasCurrentFile || r.hasData) && (
            <>
              <button
                type="button"
                className={styles.formatBtn}
                disabled={r.downloading || r.uploading}
                onClick={() => r.download("pdf")}
              >
                {r.isDownloading("pdf") ? t("downloading") : t("pdf")}
              </button>
              <button
                type="button"
                className={styles.formatBtn}
                disabled={r.downloading || r.uploading}
                onClick={() => r.download("xlsx")}
              >
                {r.isDownloading("xlsx") ? t("downloading") : t("excel")}
              </button>
            </>
          )}
          <CsvDropControl
            r={r}
            t={t}
            mode={r.hasCurrentFile || r.hasData ? "replace" : "upload"}
          />
          {showEmpty && !r.uploading ? (
            <button
              type="button"
              className={styles.sampleLink}
              onClick={() => void r.upload(new File(["sample"], "sample.csv", { type: "text/csv" }))}
            >
              {t("useSample")}
            </button>
          ) : null}
        </div>
      </section>

      {r.dataLoading && (
        <section className={styles.card} aria-busy="true" aria-label={t("loadingSummary")}>
          <div className={styles.kpiGrid}>
            {[0, 1, 2].map((i) => (
              <div key={i} className={`${styles.kpi} ${styles.skeletonBlock}`} />
            ))}
          </div>
          <div className={`${styles.skeletonLine} ${styles.skeletonWide}`} />
          <div className={`${styles.skeletonTable}`} />
        </section>
      )}

      {showFilled && (
        <section className={styles.summaryCard} aria-label={t("periodTotals")}>
          <header className={styles.summaryHero}>
            <div className={styles.summaryIntro}>
              <span className={styles.summaryKicker}>{t("summaryKicker")}</span>
              <h2 className={styles.summaryTitle}>{t("summary", { period: r.periodLabel })}</h2>
            </div>
            <div className={styles.summaryHeroVat}>
              <span className={styles.summaryHeroVatLabel}>{t("kpiVat")}</span>
              <span className={styles.summaryHeroVatValue}>{eur(r.kpis.vat)}</span>
            </div>
          </header>

          <div className={styles.summaryMetrics} aria-label={t("periodTotals")}>
            <div className={styles.summaryMetric}>
              <span className={styles.summaryMetricLabel}>{t("kpiSales")}</span>
              <span className={styles.summaryMetricValue} style={{ color: "#2E5D3B" }}>
                {eur(r.kpis.sales)}
              </span>
            </div>
            <div className={styles.summaryMetric}>
              <span className={styles.summaryMetricLabel}>{t("kpiRefunds")}</span>
              <span className={styles.summaryMetricValue} style={{ color: "#C8862B" }}>
                {eur(r.kpis.refunds)}
              </span>
            </div>
            <div className={styles.summaryMetric}>
              <span className={styles.summaryMetricLabel}>{t("common:net")}</span>
              <span className={styles.summaryMetricValue}>
                {eur(r.kpis.sales + r.kpis.refunds)}
              </span>
            </div>
          </div>

          <div className={styles.toolbar}>
            <div className={styles.viewTabs} role="tablist" aria-label={t("viewsLabel")}>
              {(["summary", "vat", "tx"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  role="tab"
                  aria-selected={r.view === v}
                  className={`${styles.viewTab} ${r.view === v ? styles.viewTabActive : ""}`}
                  onClick={() => r.setView(v)}
                >
                  {v === "summary" ? t("viewByCountry") : v === "vat" ? t("viewVat") : t("viewTx")}
                </button>
              ))}
            </div>
            <div className={styles.tabs} role="tablist" aria-label={t("categoriesLabel")}>
              {r.categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="tab"
                  aria-selected={r.category === c}
                  className={`${styles.tab} ${r.category === c ? styles.tabActive : ""}`}
                  onClick={() => r.setCategory(c)}
                >
                  {t(`common:categories.${c}`, { defaultValue: c })}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.ledger} key={`${r.category}-${r.view}`}>
            {r.visibleRows.length === 0 ? (
              <div className={styles.ledgerEmpty}>{t("noRows")}</div>
            ) : (
              <BreakdownLedger view={r.view} rows={r.visibleRows} totals={r.tableTotals} t={t} />
            )}
          </div>
        </section>
      )}

      {showEmpty && (
        <div className={styles.emptyPeriodNote} role="status">
          {t("uploadForPeriod", { period: r.periodLabel })}
        </div>
      )}

      <section className={styles.card}>
        <div className={styles.sectionHead}>
          <div className={styles.libraryHeadRow}>
            <h2>{t("yourFiles")}</h2>
            {!r.filesLoading && r.allFiles.length > 0 ? (
              <span className={styles.libraryCount}>
                {t("libraryCount", { count: r.allFiles.length })}
              </span>
            ) : null}
          </div>
          <p>{t("yourFilesHint")}</p>
        </div>

        {r.filesLoading ? (
          <div className={styles.libraryList} aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`${styles.libraryRow} ${styles.skeletonBlock}`} style={{ height: 64 }} />
            ))}
          </div>
        ) : r.allFiles.length === 0 ? (
          <div className={styles.emptyFiles}>
            <div className={styles.emptyFilesTitle}>{t("noUploads")}</div>
            <p className={styles.emptyFilesHint}>{t("noUploadsHint")}</p>
          </div>
        ) : (
          <PeriodLibrary r={r} t={t} />
        )}
      </section>
    </div>
  );
}

type ReportsApi = ReturnType<typeof useReports>;
type TFn = ReturnType<typeof useTranslation>["t"];
type LedgerRow = ReportsApi["visibleRows"][number];
type LedgerTotals = ReportsApi["tableTotals"];

function sumLedger(rows: LedgerRow[]) {
  return rows.reduce(
    (acc, { row }) => ({
      total: acc.total + (row.total || 0),
      base: acc.base + (row.base || 0),
      vat: acc.vat + (row.vat || 0),
    }),
    { total: 0, base: 0, vat: 0 },
  );
}

function groupLedger(rows: LedgerRow[]) {
  const map = new Map<string, LedgerRow[]>();
  for (const row of rows) {
    const list = map.get(row.country) ?? [];
    list.push(row);
    map.set(row.country, list);
  }
  return [...map.entries()]
    .map(([country, items]) => ({ country, items, totals: sumLedger(items) }))
    .sort((a, b) => Math.abs(b.totals.vat) - Math.abs(a.totals.vat));
}

function StatStrip({
  total,
  base,
  currency,
  t,
}: {
  total: number;
  base: number;
  currency?: string | null;
  t: TFn;
}) {
  return (
    <div className={styles.statStrip}>
      <div className={styles.stat}>
        <span className={styles.statLabel}>{t("colTotal")}</span>
        <span className={styles.statValue}>{eur(total)}</span>
      </div>
      <div className={styles.stat}>
        <span className={styles.statLabel}>{t("colBase")}</span>
        <span className={styles.statValue}>{eur(base)}</span>
      </div>
      <div className={styles.stat}>
        <span className={styles.statLabel}>{t("colCurrency")}</span>
        <span className={styles.statValue}>{currency || "—"}</span>
      </div>
    </div>
  );
}

function BreakdownLedger({
  view,
  rows,
  totals,
  t,
}: {
  view: "summary" | "vat" | "tx";
  rows: LedgerRow[];
  totals: LedgerTotals;
  t: TFn;
}) {
  const groups = groupLedger(rows);

  return (
    <div className={styles.ledgerBody}>
      <ul className={styles.ledgerList}>
        {groups.map((group, i) => {
          const currency = group.items.find((x) => x.row.currency)?.row.currency;
          const isGrouped = view !== "summary" && group.items.length >= 1;

          return (
            <li
              key={group.country}
              className={styles.ledgerGroup}
              style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}
            >
              <div className={styles.ledgerEntry}>
                <div className={styles.ledgerTop}>
                  <div className={styles.ledgerIdentity}>
                    <div className={styles.ledgerTitle}>{group.country}</div>
                    {view === "summary" ? (
                      <div className={styles.ledgerHint}>
                        {t("colTotal")} {eur(group.totals.total)}
                      </div>
                    ) : (
                      <div className={styles.ledgerHint}>
                        {view === "vat"
                          ? t("ledgerRates", { count: group.items.length })
                          : t("ledgerTypes", { count: group.items.length })}
                      </div>
                    )}
                  </div>
                  <div className={styles.ledgerVatBlock}>
                    <span className={styles.ledgerVatLabel}>{t("colVat")}</span>
                    <span className={styles.ledgerVat}>{eur(group.totals.vat)}</span>
                  </div>
                </div>
                {view === "summary" ? null : (
                  <StatStrip total={group.totals.total} base={group.totals.base} currency={currency} t={t} />
                )}
              </div>

              {isGrouped ? (
                <ul className={styles.detailList}>
                  {group.items.map((item, j) => {
                    const kind = String(item.detail || "").toUpperCase();
                    const isRefund = kind.includes("REFUND");
                    const isSale = kind.includes("SALE");
                    return (
                      <li
                        key={`${item.country}-${item.detail}-${j}`}
                        className={`${styles.detailEntry} ${isRefund ? styles.detailRefund : ""} ${isSale ? styles.detailSale : ""}`}
                      >
                        <div className={styles.detailTop}>
                          <span className={styles.detailBadge}>{item.detail || "—"}</span>
                          <span className={styles.detailVat}>{eur(item.row.vat)}</span>
                        </div>
                        <StatStrip
                          total={item.row.total}
                          base={item.row.base}
                          currency={item.row.currency}
                          t={t}
                        />
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>

      <div className={styles.ledgerTotals} aria-label={t("totals")}>
        <div className={styles.ledgerTop}>
          <div className={styles.ledgerIdentity}>
            <div className={styles.ledgerTitle}>{t("totals")}</div>
            <div className={styles.ledgerHint}>{t("ledgerAllCountries")}</div>
          </div>
          <div className={styles.ledgerVatBlock}>
            <span className={styles.ledgerVatLabel}>{t("colVat")}</span>
            <span className={styles.ledgerVat}>{eur(totals.vat)}</span>
          </div>
        </div>
        {view === "summary" ? null : (
          <StatStrip total={totals.total} base={totals.base} currency={null} t={t} />
        )}
      </div>
    </div>
  );
}

function PeriodLibrary({ r, t }: { r: ReportsApi; t: TFn }) {
  const groups = r.allFiles.reduce<Array<{ year: number; rows: typeof r.allFiles }>>((acc, row) => {
    const year = row.period.year;
    const existing = acc.find((g) => g.year === year);
    if (existing) existing.rows.push(row);
    else acc.push({ year, rows: [row] });
    return acc;
  }, []);

  function openPeriod(row: (typeof r.allFiles)[number]) {
    const p = row.period;
    r.period.setFileType(p.fileType);
    r.period.setYear(p.year);
    if (p.fileType === "monthly") r.period.setPeriodValue(String(p.month));
    else r.period.setPeriodValue(String(p.quarter).toUpperCase());
  }

  return (
    <div className={styles.libraryGroups}>
      {groups.map((group) => (
        <div key={group.year} className={styles.libraryYear}>
          <div className={styles.libraryYearLabel}>{group.year}</div>
          <ul className={styles.libraryList}>
            {group.rows.map((row, i) => {
              const active = samePeriodPayload(row.period, r.period.payload);
              return (
                <li
                  key={row.f}
                  className={`${styles.libraryRow} ${active ? styles.libraryRowActive : ""}`}
                  style={{ animationDelay: `${Math.min(i, 10) * 35}ms` }}
                >
                  <button
                    type="button"
                    className={styles.libraryOpen}
                    onClick={() => openPeriod(row)}
                    aria-current={active ? "true" : undefined}
                  >
                    <span className={styles.libraryPeriod}>{row.label}</span>
                    <span className={styles.libraryMetaRow}>
                      <span className={styles.libraryType}>
                        {row.type === "monthly" ? t("common:monthly") : t("common:quarterly")}
                      </span>
                      {active ? <span className={styles.libraryViewing}>{t("libraryViewing")}</span> : null}
                    </span>
                  </button>
                  <div className={styles.libraryActions}>
                    <button
                      type="button"
                      className={styles.formatBtn}
                      disabled={r.downloading}
                      onClick={() => r.download("pdf", row.period)}
                    >
                      {r.isDownloading("pdf", row.period) ? t("downloading") : t("pdf")}
                    </button>
                    <button
                      type="button"
                      className={styles.formatBtn}
                      disabled={r.downloading}
                      onClick={() => r.download("xlsx", row.period)}
                    >
                      {r.isDownloading("xlsx", row.period) ? t("downloading") : t("excel")}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

function samePeriodPayload(
  a: { fileType: string; year: number; month?: string | number; quarter?: string },
  b: { fileType: string; year: number; month?: string | number; quarter?: string },
) {
  if (a.fileType !== b.fileType || a.year !== b.year) return false;
  if (a.fileType === "monthly") return String(a.month) === String(b.month);
  return String(a.quarter).toUpperCase() === String(b.quarter).toUpperCase();
}

function PeriodPicker({
  r,
  t,
  lang,
}: {
  r: ReportsApi;
  t: TFn;
  lang: string;
}) {
  const p = r.period;
  return (
    <div className={styles.periodPicker}>
      <div className={styles.typeToggle} role="group" aria-label={t("common:type")}>
        <button
          type="button"
          className={`${styles.typeBtn} ${p.fileType === "monthly" ? styles.typeBtnActive : ""}`}
          disabled={r.uploading}
          aria-pressed={p.fileType === "monthly"}
          onClick={() => p.setFileType("monthly")}
        >
          {t("common:monthly")}
        </button>
        <button
          type="button"
          className={`${styles.typeBtn} ${p.fileType === "quarterly" ? styles.typeBtnActive : ""}`}
          disabled={r.uploading}
          aria-pressed={p.fileType === "quarterly"}
          onClick={() => p.setFileType("quarterly")}
        >
          {t("common:quarterly")}
        </button>
      </div>

      <div className={styles.periodSelectGroup}>
        <label className={styles.periodSelect}>
          <span className={styles.srOnly}>{t("common:period")}</span>
          <select
            value={p.periodValue}
            disabled={r.uploading}
            onChange={(e) => p.setPeriodValue(e.target.value)}
            aria-label={t("common:period")}
          >
            {p.fileType === "monthly"
              ? Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={String(i + 1)}>
                    {new Date(2000, i, 1).toLocaleString(lang, { month: "long" })}
                  </option>
                ))
              : ["Q1", "Q2", "Q3", "Q4"].map((q) => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
          </select>
        </label>
        <span className={styles.periodDivider} aria-hidden />
        <label className={styles.periodSelect}>
          <span className={styles.srOnly}>{t("common:year")}</span>
          <select
            value={p.year}
            disabled={r.uploading}
            onChange={(e) => p.setYear(Number(e.target.value))}
            aria-label={t("common:year")}
          >
            {p.years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}

function isCsv(file: File | null | undefined): file is File {
  return !!file && file.name.toLowerCase().endsWith(".csv");
}

function CsvDropControl({
  r,
  t,
  mode,
}: {
  r: ReportsApi;
  t: TFn;
  mode: "upload" | "replace";
}) {
  function take(file: File | null | undefined) {
    if (!isCsv(file) || r.uploading) return;
    void r.upload(file);
  }

  const label = mode === "upload" ? t("uploadCsv") : t("replaceCsv");
  const sub = mode === "upload" ? t("uploadDropSub") : t("replaceDropSub");

  return (
    <div
      className={`${styles.replaceDrop} ${mode === "upload" ? styles.replaceDropPrimary : ""} ${r.dragOver ? styles.replaceDropActive : ""} ${r.uploading ? styles.replaceDropBusy : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        r.setDragOver(true);
      }}
      onDragLeave={() => r.setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        r.setDragOver(false);
        take(e.dataTransfer.files?.[0]);
      }}
      onClick={() => {
        if (!r.uploading) r.fileInputRef.current?.click();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (!r.uploading) r.fileInputRef.current?.click();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={label}
      aria-busy={r.uploading}
    >
      {r.uploading ? (
        <>
          <span className={styles.replaceCta}>{t("processing", { pct: r.uploadPct })}</span>
          <div className={styles.replaceProgressTrack} aria-hidden>
            <div className={styles.replaceProgressFill} style={{ width: `${r.uploadPct}%` }} />
          </div>
        </>
      ) : (
        <>
          <svg
            className={styles.replaceIcon}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M12 16V4" />
            <path d="M7 9l5-5 5 5" />
            <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
          </svg>
          <span className={styles.replaceCta}>{label}</span>
          <span className={styles.replaceSub}>{sub}</span>
        </>
      )}
      <input
        ref={r.fileInputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={(e) => {
          take(e.target.files?.[0]);
          e.target.value = "";
        }}
        style={{ display: "none" }}
      />
    </div>
  );
}

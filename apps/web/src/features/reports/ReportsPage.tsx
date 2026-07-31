import { useTranslation } from "react-i18next";
import { Toast } from "@/components/Toast";
import { eur } from "@/lib/tax-agg";
import { useReports } from "./useReports";
import styles from "./ReportsPage.module.css";

export function ReportsPage() {
  const { t } = useTranslation(["reports", "common"]);
  const r = useReports();

  return (
    <div className={styles.page}>
      <Toast message={r.toast} />

      <section className={styles.card}>
        <div className={styles.cardHead}>
          <h2>{t("uploadTitle")}</h2>
          <p>{t("uploadHint")}</p>
        </div>

        <div className={styles.uploadGrid}>
          <div
            className={`${styles.dropZone} ${r.dragOver ? styles.dragOver : ""} ${r.file ? styles.picked : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              r.setDragOver(true);
            }}
            onDragLeave={() => r.setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              r.setDragOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f && f.name.endsWith(".csv")) r.setFile(f);
            }}
            onClick={() => r.fileInputRef.current?.click()}
          >
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 16V4"></path>
              <path d="M7 9l5-5 5 5"></path>
              <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"></path>
            </svg>
            <div className={styles.dropText}>
              <span className={styles.dropHeadline}>
                {r.file ? t("dropReady") : r.dragOver ? t("dropAttach") : t("dropHere")}
              </span>
              <span className={styles.dropSub}>{r.file ? t("dropSubPicked") : t("dropSub")}</span>
            </div>
            <input
              ref={r.fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => r.setFile(e.target.files?.[0] || null)}
              style={{ display: "none" }}
            />
          </div>

          <div className={styles.uploadFacts}>
            <div className={styles.factRow}>
              <span>{t("reportType")}</span>
              <strong>{r.period.fileType === "monthly" ? t("common:monthly") : t("common:quarterly")}</strong>
            </div>
            <div className={styles.factRow}>
              <span>{t("period")}</span>
              <strong>{r.periodLabel}</strong>
            </div>
            <div className={styles.factRow}>
              <span>{t("planLimit")}</span>
              <strong>{t("planLimitValue")}</strong>
            </div>

            {r.file && (
              <div className={styles.pickedFile}>
                <span className={styles.fileTag}>CSV</span>
                <div className={styles.fileInfo}>
                  <div className={styles.fileName}>{r.file.name}</div>
                  <div className={styles.fileSize}>{(r.file.size / 1048576).toFixed(1)} MB</div>
                </div>
              </div>
            )}

            <button className={styles.uploadBtn} disabled={!r.file || r.uploading} onClick={() => void r.upload()}>
              {r.uploading ? t("processing", { pct: r.uploadPct }) : t("uploadProcess")}
            </button>
            <button
              className={styles.sampleBtn}
              onClick={() => r.setFile(new File(["sample"], "sample.csv", { type: "text/csv" }))}
            >
              {t("useSample")}
            </button>
          </div>
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHead}>
          <h2>{t("yourFiles")}</h2>
          <button className={styles.downloadBtn} onClick={() => r.download("pdf")} disabled={!r.hasData}>
            {t("downloadPdf")}
          </button>
        </div>

        <div className={styles.tableWrapper}>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>{t("colFile")}</th>
                <th>{t("colType")}</th>
                <th>{t("colPeriod")}</th>
                <th>{t("colStatus")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {r.allFiles.length > 0 ? (
                r.allFiles.map((row, i) => (
                  <tr key={row.f}>
                    <td>{i + 1}</td>
                    <td>{row.f}</td>
                    <td>{row.type === "monthly" ? t("common:monthly") : t("common:quarterly")}</td>
                    <td>{row.type}</td>
                    <td>
                      <span className={styles.statusBadge}>{t("statusReady")}</span>
                    </td>
                    <td>
                      <button className={styles.downloadRowBtn} onClick={() => r.download("xlsx")}>
                        {t("excel")}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "24px", color: "var(--text-secondary)" }}>
                    {t("noUploads")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {r.hasData && (
        <section className={styles.card}>
          <div className={styles.cardHead}>
            <h2>{t("summary", { period: r.periodLabel })}</h2>
          </div>

          <div className={styles.tabs}>
            {r.categories.map((c) => (
              <button
                key={c}
                className={`${styles.tab} ${r.category === c ? styles.tabActive : ""}`}
                onClick={() => r.setCategory(c)}
              >
                {t(`common:categories.${c}`, { defaultValue: c })}
              </button>
            ))}
          </div>

          <div className={styles.viewTabs}>
            {(["summary", "vat", "tx"] as const).map((v) => (
              <button
                key={v}
                className={`${styles.viewTab} ${r.view === v ? styles.viewTabActive : ""}`}
                onClick={() => r.setView(v)}
              >
                {v === "summary" ? t("viewByCountry") : v === "vat" ? t("viewVat") : t("viewTx")}
              </button>
            ))}
          </div>

          <div className={styles.tableWrapper}>
            <table>
              <thead>
                <tr>
                  <th>
                    {r.view === "vat" ? t("colCountryVat") : r.view === "tx" ? t("colCountryType") : t("colCountry")}
                  </th>
                  <th style={{ textAlign: "right" }}>{t("colTotal")}</th>
                  <th style={{ textAlign: "right" }}>{t("colBase")}</th>
                  <th style={{ textAlign: "right" }}>{t("colVat")}</th>
                  <th style={{ textAlign: "right" }}>{t("colCurrency")}</th>
                </tr>
              </thead>
              <tbody>
                {r.rows.flatMap(({ country, cat }) => {
                  if (r.view === "summary") {
                    const all = cat.transactions.ALL?.[0];
                    if (!all) return [];
                    return [
                      <tr key={country}>
                        <td>{country}</td>
                        <td style={{ textAlign: "right" }}>{eur(all.total)}</td>
                        <td style={{ textAlign: "right" }}>{eur(all.base)}</td>
                        <td style={{ textAlign: "right" }}>{eur(all.vat)}</td>
                        <td style={{ textAlign: "right" }}>{all.currency}</td>
                      </tr>,
                    ];
                  }
                  if (r.view === "vat") {
                    return (cat.transactions.VAT || []).map((row, i) => (
                      <tr key={`${country}-v-${i}`}>
                        <td>
                          {i === 0 ? <strong>{country}</strong> : ""}
                          <br />
                          {String(row.vat_percentage).split("-").pop()}
                        </td>
                        <td style={{ textAlign: "right" }}>{eur(row.total)}</td>
                        <td style={{ textAlign: "right" }}>{eur(row.base)}</td>
                        <td style={{ textAlign: "right" }}>{eur(row.vat)}</td>
                        <td style={{ textAlign: "right" }}>{row.currency}</td>
                      </tr>
                    ));
                  }
                  return (cat.transactions.TRANSACTION || []).map((row, i) => (
                    <tr key={`${country}-t-${i}`}>
                      <td>
                        {i === 0 ? <strong>{country}</strong> : ""}
                        <br />
                        {row.transaction_type || ""}
                      </td>
                      <td style={{ textAlign: "right" }}>{eur(row.total)}</td>
                      <td style={{ textAlign: "right" }}>{eur(row.base)}</td>
                      <td style={{ textAlign: "right" }}>{eur(row.vat)}</td>
                      <td style={{ textAlign: "right" }}>{row.currency}</td>
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { dataApi } from "@/api";
import { queryKeys } from "@/api/queryKeys";
import { useShellPeriod } from "@/hooks/PeriodProvider";
import { useProcessedData } from "@/hooks/useProcessedData";
import { useToast } from "@/hooks/useToast";
import { useCsvUpload } from "@/hooks/useCsvUpload";
import { formatPeriodLabel } from "@/lib/period-label";
import { aggregateCountries } from "@/lib/tax-agg";
import type { PeriodPayload, TransactionRow } from "@/types/api";

/** Folder keys look like "3-2026/name.csvprocesado.xlsx" (monthly) or "Q1-2026/...". */
function parsePeriodFromKey(f: string, type: "monthly" | "quarterly"): PeriodPayload | null {
  const m = f.match(/^([A-Za-z0-9]+)-(\d{4})\//);
  if (!m) return null;
  const [, seg, year] = m;
  return type === "monthly"
    ? { fileType: "monthly", year: Number(year), month: seg }
    : { fileType: "quarterly", year: Number(year), quarter: seg.toUpperCase() };
}

function samePeriod(a: PeriodPayload, b: PeriodPayload) {
  if (a.fileType !== b.fileType || a.year !== b.year) return false;
  if (a.fileType === "monthly") return String(a.month) === String(b.month);
  return String(a.quarter).toUpperCase() === String(b.quarter).toUpperCase();
}

function sumRows(rows: TransactionRow[]) {
  return rows.reduce(
    (acc, r) => ({
      total: acc.total + (r.total || 0),
      base: acc.base + (r.base || 0),
      vat: acc.vat + (r.vat || 0),
    }),
    { total: 0, base: 0, vat: 0 },
  );
}

export function useReports() {
  const { t } = useTranslation("reports");
  const period = useShellPeriod();
  const { toast, flash } = useToast();
  const { data: countries, hasData, loading: dataLoading, reload } = useProcessedData(period.payload);
  const [category, setCategory] = useState("");
  const [view, setView] = useState<"summary" | "vat" | "tx">("summary");

  const csv = useCsvUpload({ onUploaded: () => void reload() });

  const filesQuery = useQuery({
    queryKey: queryKeys.userFiles(),
    queryFn: async () => {
      const res = await dataApi.userFiles();
      return res.data;
    },
  });

  const files = filesQuery.data ?? { monthly: [], quarterly: [] };

  useEffect(() => {
    const cats = [...new Set(countries.flatMap((c) => c.transactionCategories.map((x) => x.category)))];
    setCategory((prev) => (prev && cats.includes(prev) ? prev : cats[0] || ""));
  }, [countries]);

  const downloadMutation = useMutation({
    mutationFn: async ({ ext, target }: { ext: "pdf" | "xlsx"; target: PeriodPayload }) => {
      const res = await dataApi.downloadFile({ ...target, fileExtension: ext });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${target.fileType}_report_${target.year}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      return { ext, target };
    },
    onError: () => flash(t("downloadFailed")),
  });

  async function upload(selected?: File | null) {
    return csv.upload(
      {
        fileType: period.fileType,
        year: period.year,
        month: period.month,
        quarter: period.quarter,
      },
      selected === undefined ? undefined : selected,
    );
  }

  const rows = useMemo(() => {
    return countries
      .map((c) => {
        const cat = c.transactionCategories.find((x) => x.category === category);
        return cat ? { country: c.country, cat } : null;
      })
      .filter(Boolean) as Array<{ country: string; cat: (typeof countries)[0]["transactionCategories"][0] }>;
  }, [countries, category]);

  const visibleRows = useMemo(() => {
    if (view === "summary") {
      return rows
        .map(({ country, cat }) => {
          const all = cat.transactions.ALL?.[0];
          return all ? { country, row: all, detail: null as string | null } : null;
        })
        .filter(Boolean) as Array<{ country: string; row: TransactionRow; detail: string | null }>;
    }
    if (view === "vat") {
      return rows.flatMap(({ country, cat }) =>
        (cat.transactions.VAT || []).map((row) => ({
          country,
          row,
          detail: String(row.vat_percentage ?? "").split("-").pop() || "",
        })),
      );
    }
    return rows.flatMap(({ country, cat }) =>
      (cat.transactions.TRANSACTION || []).map((row) => ({
        country,
        row,
        detail: row.transaction_type || "",
      })),
    );
  }, [rows, view]);

  const tableTotals = useMemo(() => sumRows(visibleRows.map((r) => r.row)), [visibleRows]);

  const categories = [...new Set(countries.flatMap((c) => c.transactionCategories.map((x) => x.category)))];
  const allFiles = [
    ...files.monthly.map((f) => ({ f, type: "monthly" as const, period: parsePeriodFromKey(f, "monthly") })),
    ...files.quarterly.map((f) => ({
      f,
      type: "quarterly" as const,
      period: parsePeriodFromKey(f, "quarterly"),
    })),
  ]
    .filter((row): row is typeof row & { period: PeriodPayload } => !!row.period)
    .map((row) => ({ ...row, label: formatPeriodLabel(row.period) }))
    .sort((a, b) => {
      if (a.period.year !== b.period.year) return b.period.year - a.period.year;
      const rank = (p: PeriodPayload) =>
        p.fileType === "monthly" ? Number(p.month) : Number(String(p.quarter).replace(/\D/g, "")) * 3;
      return rank(b.period) - rank(a.period);
    });

  const periodPayload = period.payload;
  const currentPeriodFile = allFiles.find((row) => samePeriod(row.period, periodPayload)) ?? null;
  const hasCurrentFile = !!currentPeriodFile;

  const agg = useMemo(() => aggregateCountries(countries), [countries]);
  const kpis = useMemo(
    () => ({
      sales: agg.sales,
      refunds: Math.abs(agg.refunds),
      vat: agg.vat,
    }),
    [agg],
  );
  const topCountries = useMemo(
    () =>
      [...agg.byCountry]
        .filter((c) => Math.abs(c.vat) >= 0.005)
        .sort((a, b) => Math.abs(b.vat) - Math.abs(a.vat))
        .slice(0, 5)
        .map((c) => ({ country: c.country, vat: c.vat, sales: c.sales })),
    [agg],
  );

  const periodLabel = formatPeriodLabel({
    fileType: period.fileType,
    year: period.year,
    month: period.month,
    quarter: period.quarter,
  });

  const downloadVars = downloadMutation.variables;

  function isDownloading(ext: "pdf" | "xlsx", target?: PeriodPayload) {
    if (!downloadMutation.isPending || !downloadVars) return false;
    const t = target ?? periodPayload;
    return downloadVars.ext === ext && samePeriod(downloadVars.target, t);
  }

  return {
    period,
    fileInputRef: csv.fileInputRef,
    file: csv.file,
    setFile: csv.setFile,
    dragOver: csv.dragOver,
    setDragOver: csv.setDragOver,
    uploading: csv.uploading,
    uploadPct: csv.uploadPct,
    toast,
    category,
    setCategory,
    view,
    setView,
    rows,
    visibleRows,
    tableTotals,
    categories,
    allFiles,
    hasData,
    hasCurrentFile,
    currentPeriodFile,
    periodLabel,
    kpis,
    topCountries,
    filesLoading: filesQuery.isPending,
    dataLoading,
    upload,
    download: (ext: "pdf" | "xlsx", target?: PeriodPayload) =>
      void downloadMutation.mutate({ ext, target: target ?? periodPayload }),
    downloading: downloadMutation.isPending,
    isDownloading,
  };
}

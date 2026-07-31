import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { dataApi } from "@/api";
import { queryKeys } from "@/api/queryKeys";
import { MAX_CSV_BYTES } from "@/constants";
import { useShellPeriod } from "@/hooks/PeriodProvider";
import { useProcessedData } from "@/hooks/useProcessedData";
import { useToast } from "@/hooks/useToast";
import { getApiErrorMessage } from "@/lib/api-error";
import { formatPeriodLabel } from "@/lib/period-label";

export function useReports() {
  const { t } = useTranslation("reports");
  const period = useShellPeriod();
  const { toast, flash } = useToast();
  const queryClient = useQueryClient();
  const { data: countries, hasData, reload } = useProcessedData(period.payload);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [category, setCategory] = useState("");
  const [view, setView] = useState<"summary" | "vat" | "tx">("summary");

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

  const uploadMutation = useMutation({
    mutationFn: async (selected: File) => {
      const form = new FormData();
      form.append("file", selected);
      form.append("fileType", period.fileType);
      form.append("year", String(period.year));
      if (period.fileType === "monthly") form.append("month", period.month);
      else form.append("quarter", period.quarter);
      await dataApi.uploadCsv(form);
    },
    onSuccess: async () => {
      setUploadPct(100);
      flash(t("uploadOk"));
      setFile(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.userFiles() });
      await queryClient.invalidateQueries({ queryKey: queryKeys.processed(period.payload) });
      await reload();
    },
    onError: (e: unknown) => {
      flash(getApiErrorMessage(e, t("uploadFailed")));
    },
    onSettled: () => {
      setTimeout(() => setUploadPct(0), 1000);
    },
  });

  const downloadMutation = useMutation({
    mutationFn: async (ext: "pdf" | "xlsx") => {
      const res = await dataApi.downloadFile({ ...period.payload, fileExtension: ext });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${period.fileType}_report_${period.year}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    },
    onError: () => flash(t("downloadFailed")),
  });

  async function upload() {
    if (!file) return;
    if (file.size > MAX_CSV_BYTES) {
      flash(t("fileTooLarge"));
      return;
    }
    setUploadPct(0);
    await uploadMutation.mutateAsync(file);
  }

  const rows = useMemo(() => {
    return countries
      .map((c) => {
        const cat = c.transactionCategories.find((x) => x.category === category);
        return cat ? { country: c.country, cat } : null;
      })
      .filter(Boolean) as Array<{ country: string; cat: (typeof countries)[0]["transactionCategories"][0] }>;
  }, [countries, category]);

  const categories = [...new Set(countries.flatMap((c) => c.transactionCategories.map((x) => x.category)))];
  const allFiles = [
    ...files.monthly.map((f) => ({ f, type: "monthly" as const })),
    ...files.quarterly.map((f) => ({ f, type: "quarterly" as const })),
  ];
  const periodLabel = formatPeriodLabel({
    fileType: period.fileType,
    year: period.year,
    month: period.month,
    quarter: period.quarter,
  });

  return {
    period,
    fileInputRef,
    file,
    setFile,
    dragOver,
    setDragOver,
    uploading: uploadMutation.isPending,
    uploadPct,
    toast,
    category,
    setCategory,
    view,
    setView,
    rows,
    categories,
    allFiles,
    hasData,
    periodLabel,
    upload,
    download: (ext: "pdf" | "xlsx") => void downloadMutation.mutate(ext),
  };
}

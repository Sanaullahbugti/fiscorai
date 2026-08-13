import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { dataApi } from "@/api";
import { queryKeys } from "@/api/queryKeys";
import { MAX_CSV_BYTES } from "@/constants";
import { useToast } from "@/hooks/useToast";
import { getApiErrorMessage, parsePeriodMismatch } from "@/lib/api-error";
import type { CsvPeriodTarget } from "@/lib/detect-csv-period";
import type { PeriodPayload } from "@/types/api";

export type UploadTarget = CsvPeriodTarget;

export type UploadResult = {
  filename?: string;
  status?: string;
  meta?: unknown;
};

export type PeriodMismatchState = {
  detectedLabel: string;
  selectedLabel: string;
  detectedTarget: UploadTarget | null;
};

const ERROR_TOAST_MS = 8000;

/**
 * Single owner of the CSV upload contract. Reports and Analyst both drive this so
 * the multipart field names, size guard and post-upload invalidation live in one
 * place — a second copy would silently drift from the API.
 */
export function useCsvUpload(options?: {
  onUploaded?: (result: UploadResult, target: UploadTarget) => void;
  skipSuccessToast?: boolean;
}) {
  const { t } = useTranslation("reports");
  const { flash } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFileState] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [mismatch, setMismatch] = useState<PeriodMismatchState | null>(null);

  function setFile(next: File | null) {
    setMismatch(null);
    setFileState(next);
  }

  const uploadMutation = useMutation({
    mutationFn: async ({ selected, target }: { selected: File; target: UploadTarget }) => {
      const form = new FormData();
      form.append("file", selected);
      form.append("fileType", target.fileType);
      form.append("year", String(target.year));
      if (target.fileType === "monthly") form.append("month", target.month);
      else form.append("quarter", target.quarter);
      const res = await dataApi.uploadCsv(form, (pct) => setUploadPct(pct));
      return res.data?.data ?? {};
    },
    onSuccess: async (result, { target }) => {
      setUploadPct(100);
      setMismatch(null);
      if (!options?.skipSuccessToast) flash(t("uploadOk"));
      setFileState(null);
      const payload: PeriodPayload = {
        fileType: target.fileType,
        year: target.year,
        month: target.fileType === "monthly" ? target.month : undefined,
        quarter: target.fileType === "quarterly" ? target.quarter : undefined,
      };
      await queryClient.invalidateQueries({ queryKey: queryKeys.userFiles() });
      await queryClient.invalidateQueries({ queryKey: queryKeys.processed(payload) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.overview() });
      await queryClient.invalidateQueries({ queryKey: ["insights"] });
      options?.onUploaded?.(result as UploadResult, target);
    },
    onError: (e: unknown) => {
      const parsed = parsePeriodMismatch(e);
      if (parsed) {
        setMismatch({
          detectedLabel: parsed.detectedLabel,
          selectedLabel: parsed.selectedLabel,
          detectedTarget: parsed.detectedTarget,
        });
        return;
      }
      flash(getApiErrorMessage(e, t("uploadFailed")), ERROR_TOAST_MS);
    },
    onSettled: () => {
      setTimeout(() => setUploadPct(0), 1000);
    },
  });

  /** Returns false when the file was rejected before any request was made. */
  async function upload(target: UploadTarget, selected: File | null = file): Promise<boolean> {
    if (!selected) return false;
    if (selected.size > MAX_CSV_BYTES) {
      flash(t("fileTooLarge"), ERROR_TOAST_MS);
      return false;
    }
    setMismatch(null);
    setUploadPct(0);
    try {
      await uploadMutation.mutateAsync({ selected, target });
      return true;
    } catch {
      // Period mismatch is kept as confirm state; other errors toast in onError.
      return false;
    }
  }

  async function uploadIntoDetected(): Promise<boolean> {
    if (!file || !mismatch?.detectedTarget) return false;
    const target = mismatch.detectedTarget;
    return upload(target, file);
  }

  return {
    fileInputRef,
    file,
    setFile,
    dragOver,
    setDragOver,
    uploading: uploadMutation.isPending,
    uploadPct,
    upload,
    error: uploadMutation.error,
    mismatch,
    clearMismatch: () => setMismatch(null),
    uploadIntoDetected,
  };
}

import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { dataApi } from "@/api";
import { queryKeys } from "@/api/queryKeys";
import { MAX_CSV_BYTES } from "@/constants";
import { useToast } from "@/hooks/useToast";
import { getApiErrorMessage } from "@/lib/api-error";
import type { CsvPeriodTarget } from "@/lib/detect-csv-period";
import type { PeriodPayload } from "@/types/api";

export type UploadTarget = CsvPeriodTarget;

export type UploadResult = {
  filename?: string;
  status?: string;
  meta?: unknown;
  target?: UploadTarget;
  targets?: UploadTarget[];
  uploads?: Array<{ target: UploadTarget; filename?: string; status?: string }>;
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

  function setFile(next: File | null) {
    setFileState(next);
  }

  const uploadMutation = useMutation({
    mutationFn: async ({ selected }: { selected: File; fallback: UploadTarget }) => {
      const form = new FormData();
      form.append("file", selected);
      const res = await dataApi.uploadCsv(form, (pct) => setUploadPct(pct));
      return res.data?.data ?? {};
    },
    onSuccess: async (rawResult, { fallback }) => {
      const result = rawResult as UploadResult;
      const targets = result.targets?.length
        ? result.targets
        : result.target
          ? [result.target]
          : [fallback];
      const target = result.target ?? targets[targets.length - 1] ?? fallback;
      setUploadPct(100);
      if (!options?.skipSuccessToast) flash(t("uploadOk"));
      setFileState(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.userFiles() });
      for (const resolved of targets) {
        const payload: PeriodPayload = {
          fileType: resolved.fileType,
          year: resolved.year,
          month: resolved.fileType === "monthly" ? resolved.month : undefined,
          quarter: resolved.fileType === "quarterly" ? resolved.quarter : undefined,
        };
        await queryClient.invalidateQueries({ queryKey: queryKeys.processed(payload) });
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.overview() });
      await queryClient.invalidateQueries({ queryKey: ["insights"] });
      options?.onUploaded?.(result, target);
    },
    onError: (e: unknown) => {
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
    setUploadPct(0);
    try {
      await uploadMutation.mutateAsync({ selected, fallback: target });
      return true;
    } catch {
      // Period mismatch is kept as confirm state; other errors toast in onError.
      return false;
    }
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
  };
}

import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { dataApi } from "@/api";
import { queryKeys } from "@/api/queryKeys";
import { MAX_CSV_BYTES } from "@/constants";
import { useToast } from "@/hooks/useToast";
import { getApiErrorMessage } from "@/lib/api-error";
import type { PeriodPayload } from "@/types/api";

export type UploadTarget = {
  fileType: "monthly" | "quarterly";
  year: number;
  month: string;
  quarter: string;
};

export type UploadResult = {
  filename?: string;
  status?: string;
  meta?: unknown;
};

/**
 * Single owner of the CSV upload contract. Reports and Analyst both drive this so
 * the multipart field names, size guard and post-upload invalidation live in one
 * place — a second copy would silently drift from the API.
 */
export function useCsvUpload(options?: { onUploaded?: (result: UploadResult, target: UploadTarget) => void }) {
  const { t } = useTranslation("reports");
  const { flash } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);

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
      flash(t("uploadOk"));
      setFile(null);
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
      flash(getApiErrorMessage(e, t("uploadFailed")));
    },
    onSettled: () => {
      setTimeout(() => setUploadPct(0), 1000);
    },
  });

  /** Returns false when the file was rejected before any request was made. */
  async function upload(target: UploadTarget, selected: File | null = file): Promise<boolean> {
    if (!selected) return false;
    if (selected.size > MAX_CSV_BYTES) {
      flash(t("fileTooLarge"));
      return false;
    }
    setUploadPct(0);
    try {
      await uploadMutation.mutateAsync({ selected, target });
      return true;
    } catch {
      // Surfaced by onError as a toast; callers just need the boolean.
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

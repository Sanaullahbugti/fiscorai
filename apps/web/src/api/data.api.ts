import { http } from "./http";
import type {
  Country,
  DashboardOverview,
  GeneralResponse,
  PeriodInsights,
  PeriodPayload,
  ProcessedPayload,
} from "@/types/api";

export const dataApi = {
  uploadCsv: (form: FormData, onProgress?: (pct: number) => void) =>
    http.post<GeneralResponse<{ filename: string; status: string; meta: unknown }>>(
      "/api/v1/data/upload-csv",
      form,
      {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: onProgress
          ? (e) => {
              if (!e.total) return;
              onProgress(Math.min(99, Math.round((e.loaded / e.total) * 100)));
            }
          : undefined,
      },
    ),

  userFiles: () => http.get<{ monthly: string[]; quarterly: string[] }>("/api/v1/data/user-files"),

  overview: () => http.get<GeneralResponse<DashboardOverview | null>>("/api/v1/data/overview"),

  insights: (body: PeriodPayload) =>
    http.post<GeneralResponse<PeriodInsights>>("/api/v1/data/insights", body),

  getProcessedJson: (body: PeriodPayload) =>
    http.post<GeneralResponse<ProcessedPayload | Country[]>>("/api/v1/data/get-processed-json", body),

  downloadFile: (body: PeriodPayload) =>
    http.post("/api/v1/data/download-file", body, { responseType: "blob" }),
};

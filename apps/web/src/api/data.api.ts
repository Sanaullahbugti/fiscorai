import { http } from "./http";
import type { Country, GeneralResponse, PeriodPayload } from "@/types/api";

export const dataApi = {
  uploadCsv: (form: FormData) =>
    http.post<GeneralResponse<{ filename: string; status: string; meta: unknown }>>(
      "/api/v1/data/upload-csv",
      form,
      { headers: { "Content-Type": "multipart/form-data" } },
    ),

  userFiles: () => http.get<{ monthly: string[]; quarterly: string[] }>("/api/v1/data/user-files"),

  getProcessedJson: (body: PeriodPayload) =>
    http.post<GeneralResponse<Country[]>>("/api/v1/data/get-processed-json", body),

  downloadFile: (body: PeriodPayload) =>
    http.post("/api/v1/data/download-file", body, { responseType: "blob" }),
};

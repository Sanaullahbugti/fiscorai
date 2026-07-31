import { http } from "./http";
import type { GeneralResponse } from "@/types/api";

export const contactApi = {
  send: (body: { name: string; email: string; message: string }) =>
    http.post<GeneralResponse<string>>("/api/v1/contact", body),
};

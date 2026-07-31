import { http } from "./http";
import type { GeneralResponse, UserProfile } from "@/types/api";

export const usersApi = {
  profile: () => http.get<GeneralResponse<UserProfile>>("/api/v1/users/profile"),
  update: (id: string, body: { username?: string; alias?: string }) =>
    http.put<GeneralResponse<UserProfile>>(`/api/v1/users/${id}`, body),
  updateAmazon: (amazonId: string) =>
    http.put<GeneralResponse<UserProfile>>(
      `/api/v1/users/update/amazon/${encodeURIComponent(amazonId)}`,
    ),
};

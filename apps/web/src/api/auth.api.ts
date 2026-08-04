import { http } from "./http";
import type { AuthUser, GeneralResponse } from "@/types/api";

export const authApi = {
  login: (email: string, password: string) =>
    http.post<GeneralResponse<AuthUser>>("/api/v1/auth/login", {
      email,
      password,
      businessUser: false,
      influencer: false,
    }),

  register: (body: {
    email: string;
    username: string;
    password: string;
    plan?: string;
  }) => http.post<GeneralResponse<unknown>>("/api/v1/users", body),

  changePassword: (currentPassword: string, newPassword: string) =>
    http.put("/api/v1/auth/change-password", { currentPassword, newPassword }),

  forgotPassword: (email: string) => http.post("/api/v1/auth/forgot-password", { email }),

  resetPassword: (token: string, newPassword: string) =>
    http.post("/api/v1/auth/reset-password", { token, newPassword }),
};

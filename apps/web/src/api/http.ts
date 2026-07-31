import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { API_BASE_URL, STORAGE_KEYS } from "@/constants";

export const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120_000,
});

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem(STORAGE_KEYS.accessToken);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing: Promise<string | null> | null = null;

async function refreshAccess(): Promise<string | null> {
  const refreshToken = localStorage.getItem(STORAGE_KEYS.refreshToken);
  if (!refreshToken) return null;
  const { data } = await axios.get(`${API_BASE_URL}/api/v1/auth/refresh`, {
    params: { refreshToken },
  });
  const token = data?.data?.jwtToken as string | undefined;
  const nextRefresh = data?.data?.refreshToken as string | undefined;
  if (!token) return null;
  localStorage.setItem(STORAGE_KEYS.accessToken, token);
  if (nextRefresh) localStorage.setItem(STORAGE_KEYS.refreshToken, nextRefresh);
  return token;
}

http.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      refreshing = refreshing ?? refreshAccess().finally(() => {
        refreshing = null;
      });
      const token = await refreshing;
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return http(original);
      }
      localStorage.removeItem(STORAGE_KEYS.accessToken);
      localStorage.removeItem(STORAGE_KEYS.refreshToken);
      localStorage.removeItem(STORAGE_KEYS.user);
      if (!window.location.pathname.includes("/signin")) {
        window.location.href = "/signin?expired=1";
      }
    }
    return Promise.reject(error);
  },
);

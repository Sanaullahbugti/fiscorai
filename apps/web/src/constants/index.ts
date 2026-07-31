export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:9292";

export const STORAGE_KEYS = {
  accessToken: "fiscor.accessToken",
  refreshToken: "fiscor.refreshToken",
  user: "fiscor.user",
  lang: "fiscor.lang",
  lastActive: "fiscor.lastActive",
} as const;

export const ROUTES = {
  home: "/",
  signin: "/signin",
  signup: "/signup",
  graphics: "/graphics",
  information: "/information",
  review: "/review",
  analyst: "/analyst",
  account: "/account",
  billing: "/billing",
  faq: "/faq",
  contact: "/contact",
  privacy: "/privacy",
  terms: "/terms",
} as const;

export const PLANS = [
  { code: "Free", price: 0 },
  { code: "Basic", price: 19.9 },
  { code: "Standard", price: 49.9 },
  { code: "Pro", price: 99.9 },
] as const;

export const CATEGORY_COLORS: Record<string, string> = {
  REGULAR: "#2E5D3B",
  "UNION-OSS": "#C8862B",
  VOEC: "#3B6E8F",
  EMPTY: "#6B7268",
};

export const LANGUAGES = ["en", "de", "es", "fr", "it"] as const;

export const LANGUAGE_OPTIONS = [
  { code: "en", short: "EN", label: "English" },
  { code: "de", short: "DE", label: "Deutsch" },
  { code: "es", short: "ES", label: "Español" },
  { code: "fr", short: "FR", label: "Français" },
  { code: "it", short: "IT", label: "Italiano" },
] as const;
export const SESSION_IDLE_MS = 12 * 3600 * 1000;
export const MAX_CSV_BYTES = 100 * 1024 * 1024;

import { ROUTES } from "@/constants";

export const NAV = [
  { to: ROUTES.graphics, key: "graphics" },
  { to: ROUTES.information, key: "information" },
  { to: ROUTES.review, key: "review" },
  { to: ROUTES.analyst, key: "analyst", badge: "AI" },
  { to: ROUTES.account, key: "account" },
  { to: ROUTES.billing, key: "billing" },
  { to: ROUTES.faq, key: "faq" },
  { to: ROUTES.contact, key: "contact" },
] as const;

export const MOBILE_TABS = [
  { to: ROUTES.graphics, key: "graphics", icon: "dash" as const },
  { to: ROUTES.information, key: "information", icon: "vat" as const },
  { to: ROUTES.review, key: "review", icon: "review" as const },
  { to: ROUTES.analyst, key: "analyst", icon: "analyst" as const, badge: "AI" },
] as const;

export const MORE_ITEMS = [
  { to: ROUTES.account, key: "account" },
  { to: ROUTES.billing, key: "billing" },
  { to: ROUTES.faq, key: "faq" },
  { to: ROUTES.contact, key: "contact" },
  { to: ROUTES.privacy, key: "privacy" },
  { to: ROUTES.terms, key: "terms" },
] as const;

export const MORE_ROUTES = new Set<string>([
  ROUTES.account,
  ROUTES.billing,
  ROUTES.faq,
  ROUTES.contact,
  ROUTES.privacy,
  ROUTES.terms,
]);

export const TITLE_KEYS: Record<string, string> = {
  [ROUTES.graphics]: "graphics",
  [ROUTES.information]: "information",
  [ROUTES.review]: "review",
  [ROUTES.analyst]: "analyst",
  [ROUTES.account]: "account",
  [ROUTES.billing]: "billing",
  [ROUTES.faq]: "faq",
  [ROUTES.contact]: "contact",
  [ROUTES.privacy]: "privacy",
  [ROUTES.terms]: "terms",
};

export const SHOW_PERIOD = new Set<string>([ROUTES.graphics, ROUTES.information, ROUTES.review]);

export const SHEET_ENTER_MS = 420;
export const SHEET_EXIT_MS = 280;

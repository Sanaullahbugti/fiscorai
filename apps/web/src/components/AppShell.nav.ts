import { ROUTES } from "@/constants";

export const NAV = [
  // Analyst leads — it is the default landing route and the primary workspace.
  { to: ROUTES.analyst, key: "analyst", badge: "AI" },
  { to: ROUTES.graphics, key: "graphics" },
  { to: ROUTES.information, key: "information" },
  { to: ROUTES.review, key: "review" },
  { to: ROUTES.amazonConnection, key: "amazonConnection", badge: "Soon" },
  { to: ROUTES.account, key: "account" },
  { to: ROUTES.billing, key: "billing" },
  { to: ROUTES.faq, key: "faq" },
  { to: ROUTES.contact, key: "contact" },
] as const;

export const MOBILE_TABS = [
  { to: ROUTES.analyst, key: "analyst", icon: "analyst" as const, badge: "AI" },
  { to: ROUTES.graphics, key: "graphics", icon: "dash" as const },
  { to: ROUTES.information, key: "information", icon: "vat" as const },
  { to: ROUTES.review, key: "review", icon: "review" as const },
] as const;

export const MORE_ITEMS = [
  { to: ROUTES.amazonConnection, key: "amazonConnection", badge: "Soon" },
  { to: ROUTES.account, key: "account" },
  { to: ROUTES.billing, key: "billing" },
  { to: ROUTES.faq, key: "faq" },
  { to: ROUTES.contact, key: "contact" },
  { to: ROUTES.privacy, key: "privacy" },
  { to: ROUTES.terms, key: "terms" },
  { to: ROUTES.refund, key: "refund" },
  { to: ROUTES.cookies, key: "cookies" },
] as const;

export const MORE_ROUTES = new Set<string>([
  ROUTES.account,
  ROUTES.billing,
  ROUTES.faq,
  ROUTES.contact,
  ROUTES.privacy,
  ROUTES.terms,
  ROUTES.refund,
  ROUTES.cookies,
  ROUTES.thankyou,
  ROUTES.paymentFailed,
]);

export const TITLE_KEYS: Record<string, string> = {
  [ROUTES.graphics]: "graphics",
  [ROUTES.information]: "information",
  [ROUTES.review]: "review",
  [ROUTES.analyst]: "analyst",
  [ROUTES.amazonConnection]: "amazonConnection",
  [ROUTES.account]: "account",
  [ROUTES.billing]: "billing",
  [ROUTES.thankyou]: "thankyou",
  [ROUTES.paymentFailed]: "paymentFailed",
  [ROUTES.faq]: "faq",
  [ROUTES.contact]: "contact",
  [ROUTES.privacy]: "privacy",
  [ROUTES.terms]: "terms",
  [ROUTES.refund]: "refund",
  [ROUTES.cookies]: "cookies",
};

export const SHOW_PERIOD = new Set<string>([ROUTES.graphics, ROUTES.information, ROUTES.review]);

export const SHEET_ENTER_MS = 420;
export const SHEET_EXIT_MS = 280;

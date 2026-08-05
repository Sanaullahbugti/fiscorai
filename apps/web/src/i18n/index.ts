import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { STORAGE_KEYS, LANGUAGES } from "@/constants";

import enCommon from "./locales/en/common.json";
import enShell from "./locales/en/shell.json";
import enEmpty from "./locales/en/empty.json";
import enAuth from "./locales/en/auth.json";
import enReports from "./locales/en/reports.json";
import enBilling from "./locales/en/billing.json";
import enAccount from "./locales/en/account.json";
import enHelp from "./locales/en/help.json";
import enReview from "./locales/en/review.json";
import enAnalyst from "./locales/en/analyst.json";
import enDashboard from "./locales/en/dashboard.json";
import enAmazon from "./locales/en/amazon.json";
import enLanding from "./locales/en/landing.json";

import deCommon from "./locales/de/common.json";
import deShell from "./locales/de/shell.json";
import deEmpty from "./locales/de/empty.json";
import deAuth from "./locales/de/auth.json";
import deReports from "./locales/de/reports.json";
import deBilling from "./locales/de/billing.json";
import deAccount from "./locales/de/account.json";
import deHelp from "./locales/de/help.json";
import deReview from "./locales/de/review.json";
import deAnalyst from "./locales/de/analyst.json";
import deDashboard from "./locales/de/dashboard.json";
import deAmazon from "./locales/de/amazon.json";
import deLanding from "./locales/de/landing.json";

import esCommon from "./locales/es/common.json";
import esShell from "./locales/es/shell.json";
import esEmpty from "./locales/es/empty.json";
import esAuth from "./locales/es/auth.json";
import esReports from "./locales/es/reports.json";
import esBilling from "./locales/es/billing.json";
import esAccount from "./locales/es/account.json";
import esHelp from "./locales/es/help.json";
import esReview from "./locales/es/review.json";
import esAnalyst from "./locales/es/analyst.json";
import esDashboard from "./locales/es/dashboard.json";
import esAmazon from "./locales/es/amazon.json";
import esLanding from "./locales/es/landing.json";

import frCommon from "./locales/fr/common.json";
import frShell from "./locales/fr/shell.json";
import frEmpty from "./locales/fr/empty.json";
import frAuth from "./locales/fr/auth.json";
import frReports from "./locales/fr/reports.json";
import frBilling from "./locales/fr/billing.json";
import frAccount from "./locales/fr/account.json";
import frHelp from "./locales/fr/help.json";
import frReview from "./locales/fr/review.json";
import frAnalyst from "./locales/fr/analyst.json";
import frDashboard from "./locales/fr/dashboard.json";
import frAmazon from "./locales/fr/amazon.json";
import frLanding from "./locales/fr/landing.json";

import itCommon from "./locales/it/common.json";
import itShell from "./locales/it/shell.json";
import itEmpty from "./locales/it/empty.json";
import itAuth from "./locales/it/auth.json";
import itReports from "./locales/it/reports.json";
import itBilling from "./locales/it/billing.json";
import itAccount from "./locales/it/account.json";
import itHelp from "./locales/it/help.json";
import itReview from "./locales/it/review.json";
import itAnalyst from "./locales/it/analyst.json";
import itDashboard from "./locales/it/dashboard.json";
import itAmazon from "./locales/it/amazon.json";
import itLanding from "./locales/it/landing.json";

const namespaces = [
  "common",
  "shell",
  "empty",
  "auth",
  "reports",
  "billing",
  "account",
  "help",
  "review",
  "analyst",
  "dashboard",
  "amazon",
  "landing",
] as const;

function pack(
  common: object,
  shell: object,
  empty: object,
  auth: object,
  reports: object,
  billing: object,
  account: object,
  help: object,
  review: object,
  analyst: object,
  dashboard: object,
  amazon: object,
  landing: object,
) {
  return { common, shell, empty, auth, reports, billing, account, help, review, analyst, dashboard, amazon, landing };
}

const resources = {
  en: pack(enCommon, enShell, enEmpty, enAuth, enReports, enBilling, enAccount, enHelp, enReview, enAnalyst, enDashboard, enAmazon, enLanding),
  de: pack(deCommon, deShell, deEmpty, deAuth, deReports, deBilling, deAccount, deHelp, deReview, deAnalyst, deDashboard, deAmazon, deLanding),
  es: pack(esCommon, esShell, esEmpty, esAuth, esReports, esBilling, esAccount, esHelp, esReview, esAnalyst, esDashboard, esAmazon, esLanding),
  fr: pack(frCommon, frShell, frEmpty, frAuth, frReports, frBilling, frAccount, frHelp, frReview, frAnalyst, frDashboard, frAmazon, frLanding),
  it: pack(itCommon, itShell, itEmpty, itAuth, itReports, itBilling, itAccount, itHelp, itReview, itAnalyst, itDashboard, itAmazon, itLanding),
};

function readInitialLang(): string {
  const raw = localStorage.getItem(STORAGE_KEYS.lang) || "en";
  return (LANGUAGES as readonly string[]).includes(raw) ? raw : "en";
}

void i18n.use(initReactI18next).init({
  resources,
  lng: readInitialLang(),
  fallbackLng: "en",
  ns: [...namespaces],
  defaultNS: "common",
  interpolation: { escapeValue: false },
});

export default i18n;

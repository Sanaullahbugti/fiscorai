import { create } from "zustand";
import { STORAGE_KEYS, LANGUAGES } from "@/constants";
import { isAnalystMode, type AnalystMode } from "@/features/analyst/analyst.types";
import i18n from "@/i18n";

export type AppLang = (typeof LANGUAGES)[number];

function readLang(): AppLang {
  const raw = localStorage.getItem(STORAGE_KEYS.lang) || "en";
  return (LANGUAGES as readonly string[]).includes(raw) ? (raw as AppLang) : "en";
}

function readAnalystMode(): AnalystMode | null {
  const raw = localStorage.getItem(STORAGE_KEYS.analystMode);
  return isAnalystMode(raw) ? raw : null;
}

type UiState = {
  lang: AppLang;
  setLang: (code: string) => void;
  /** null until the user picks a mode, so the page can default from their data. */
  analystMode: AnalystMode | null;
  setAnalystMode: (mode: AnalystMode) => void;
};

export const useUiStore = create<UiState>((set) => ({
  lang: readLang(),
  setLang: (code) => {
    const lang = (LANGUAGES as readonly string[]).includes(code) ? (code as AppLang) : "en";
    localStorage.setItem(STORAGE_KEYS.lang, lang);
    void i18n.changeLanguage(lang);
    set({ lang });
  },
  analystMode: readAnalystMode(),
  setAnalystMode: (mode) => {
    localStorage.setItem(STORAGE_KEYS.analystMode, mode);
    set({ analystMode: mode });
  },
}));

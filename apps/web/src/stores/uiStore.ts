import { create } from "zustand";
import { STORAGE_KEYS, LANGUAGES } from "@/constants";
import i18n from "@/i18n";

export type AppLang = (typeof LANGUAGES)[number];

function readLang(): AppLang {
  const raw = localStorage.getItem(STORAGE_KEYS.lang) || "en";
  return (LANGUAGES as readonly string[]).includes(raw) ? (raw as AppLang) : "en";
}

type UiState = {
  lang: AppLang;
  setLang: (code: string) => void;
};

export const useUiStore = create<UiState>((set) => ({
  lang: readLang(),
  setLang: (code) => {
    const lang = (LANGUAGES as readonly string[]).includes(code) ? (code as AppLang) : "en";
    localStorage.setItem(STORAGE_KEYS.lang, lang);
    void i18n.changeLanguage(lang);
    set({ lang });
  },
}));

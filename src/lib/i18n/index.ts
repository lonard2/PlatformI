/**
 * PlatformI - Multi-Language Internationalization (i18n) Engine & Hook
 * Reactive Zustand store with persistent localStorage, strict typing, and instant reactivity.
 */

"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SupportedLanguage, SUPPORTED_LANGUAGES, TranslationDictionary } from "./types";
import { id as idTranslations } from "./dictionaries/id";
import { en as enTranslations } from "./dictionaries/en";
import { ja as jaTranslations } from "./dictionaries/ja";
import { zh as zhTranslations } from "./dictionaries/zh";
import { ko as koTranslations } from "./dictionaries/ko";
import { ar as arTranslations } from "./dictionaries/ar";

export * from "./types";

export const DICTIONARIES: Record<SupportedLanguage, TranslationDictionary> = {
  id: idTranslations,
  en: enTranslations,
  ja: jaTranslations,
  zh: zhTranslations,
  ko: koTranslations,
  ar: arTranslations,
};

interface LanguageStoreState {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
}

/** Applies the language and writing direction to the document root. */
function applyDocumentLanguage(lang: SupportedLanguage): void {
  if (typeof document === "undefined") return;
  const meta = SUPPORTED_LANGUAGES.find((l) => l.code === lang);
  if (!meta) return;
  document.documentElement.dir = meta.dir;
  document.documentElement.lang = meta.code;
}

export const useLanguageStore = create<LanguageStoreState>()(
  persist(
    (set) => ({
      language: "id",
      setLanguage: (lang: SupportedLanguage) => {
        applyDocumentLanguage(lang);
        set({ language: lang });
      },
    }),
    {
      name: "platformi_preferred_language",
      // Rehydrating a persisted language must re-apply the document language
      // and direction, otherwise a reload keeps the previous document locale.
      onRehydrateStorage: () => (state) => {
        if (state) applyDocumentLanguage(state.language);
      },
    }
  )
);

export function useTranslation() {
  const language = useLanguageStore((state) => state.language);
  const setLanguage = useLanguageStore((state) => state.setLanguage);

  const t = DICTIONARIES[language] || DICTIONARIES.id;
  const currentLanguageMeta =
    SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];

  const formatCurrencyRp = (amount: number): string => {
    return `Rp ${amount.toLocaleString(currentLanguageMeta.locale)}`;
  };

  const formatTimeStr = (isoOrTime: string): string => {
    if (!isoOrTime) return "";
    if (isoOrTime.length <= 5) return `${isoOrTime} WIB`;
    try {
      const d = new Date(isoOrTime);
      return (
        d.toLocaleTimeString(currentLanguageMeta.locale, {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: "Asia/Jakarta",
        }) + " WIB"
      );
    } catch {
      return isoOrTime;
    }
  };

  return {
    t,
    language,
    setLanguage,
    currentLanguageMeta,
    supportedLanguages: SUPPORTED_LANGUAGES,
    dir: currentLanguageMeta.dir,
    formatCurrencyRp,
    formatTimeStr,
  };
}

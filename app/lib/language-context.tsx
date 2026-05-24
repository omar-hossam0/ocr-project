"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Locale, TranslationKey, Translations } from "./translations";
import { translations } from "./translations";

const STORAGE_KEY = "documind-locale";

type LanguageContextType = {
  locale: Locale;
  dir: "ltr" | "rtl";
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  t: (key: TranslationKey) => string;
  /** Returns Arabic translation when locale is 'ar', otherwise returns the English fallback text. This keeps the English text visible in source code. */
  tr: (key: TranslationKey, englishText: string) => string;
};

const LanguageContext = createContext<LanguageContextType | null>(null);

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "en";
  const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
  if (stored === "en" || stored === "ar") return stored;
  // Check browser preference
  const langs = navigator.languages || [navigator.language];
  const prefersArabic = langs.some(
    (l) => l.startsWith("ar"),
  );
  return prefersArabic ? "ar" : "en";
}

export function LanguageProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const initial = getInitialLocale();
    setLocaleState(initial);
    setMounted(true);
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(STORAGE_KEY, newLocale);
    // Update document direction for RTL support
    document.documentElement.lang = newLocale;
    document.documentElement.dir = newLocale === "ar" ? "rtl" : "ltr";
  }, []);

  const toggleLocale = useCallback(() => {
    setLocale(locale === "en" ? "ar" : "en");
  }, [locale, setLocale]);

  const t = useCallback(
    (key: TranslationKey): string => {
      return translations[locale]?.[key] ?? key;
    },
    [locale],
  );

  const dir = useMemo(() => (locale === "ar" ? "rtl" : "ltr"), [locale]);

  // Sync document attributes on mount and locale change
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [locale, dir]);

  const tr = useCallback(
    (key: TranslationKey, _englishText: string): string => {
      if (locale === "ar") return translations.ar[key] ?? key;
      return _englishText;
    },
    [locale],
  );

  const value = useMemo<LanguageContextType>(
    () => ({ locale, dir, setLocale, toggleLocale, t, tr }),
    [locale, dir, setLocale, toggleLocale, t, tr],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

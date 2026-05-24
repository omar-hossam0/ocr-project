"use client";

import type { ReactNode } from "react";
import { useLanguage } from "@/app/lib/language-context";
import type { TranslationKey } from "@/app/lib/translations";

/**
 * Translation component that preserves the original English text in source code.
 *
 * In English mode: renders children (the original English text).
 * In Arabic mode: renders the translated text from the translations file.
 *
 * Usage: <T k="dashboard.title">Dashboard</T>
 */
export function T({
  children,
  k,
}: {
  children: ReactNode;
  k: TranslationKey;
}) {
  const { locale, t } = useLanguage();
  if (locale === "ar") return <>{t(k)}</>;
  return <>{children}</>;
}

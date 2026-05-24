"use client";

import { useLanguage } from "@/app/lib/language-context";
import { motion, AnimatePresence } from "motion/react";

export default function LanguageToggle() {
  const { locale, toggleLocale } = useLanguage();

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={toggleLocale}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all duration-300 text-xs font-medium"
      aria-label={`Switch to ${locale === "en" ? "Arabic" : "English"}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={locale}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-2"
        >
          {locale === "en" ? (
            <>
              <span className="text-base">🇸🇦</span>
              <span className="tracking-tight">AR</span>
            </>
          ) : (
            <>
              <span className="text-base">🇬🇧</span>
              <span className="tracking-tight">EN</span>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.button>
  );
}

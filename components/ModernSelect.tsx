"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Option {
  id: string;
  name: string;
  nameAr?: string;
}

interface ModernSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  locale?: string;
  className?: string;
  loading?: boolean;
}

export default function ModernSelect({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  icon,
  locale = "en",
  className = "",
  loading = false,
}: ModernSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.name === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayValue = selectedOption
    ? locale === "ar"
      ? selectedOption.nameAr || selectedOption.name
      : selectedOption.name
    : placeholder;

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => !loading && setIsOpen(!isOpen)}
        disabled={loading}
        className={`w-full flex items-center justify-between ${icon ? "pl-10" : "px-4"} pr-4 py-3 rounded-xl border border-white/15 bg-[#0a0f1e] text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500/50 transition-all hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          {icon && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 shrink-0">
              {icon}
            </div>
          )}
          <span className={`truncate ${!selectedOption ? "text-gray-500" : ""}`}>
            {loading ? "Loading..." : displayValue}
          </span>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          )}
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: -5, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute z-50 w-full bottom-full mb-1 bg-[#0f172a] border border-white/15 rounded-xl shadow-2xl shadow-black/50 overflow-hidden max-h-60 overflow-y-auto backdrop-blur-md"
          >
            <div className="py-1">
              {options.length > 0 ? (
                options.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      onChange(option.name);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-sky-500/10 ${
                      value === option.name ? "text-sky-400 bg-sky-500/5" : "text-gray-300"
                    }`}
                  >
                    <span className="truncate">
                      {locale === "ar" ? option.nameAr || option.name : option.name}
                    </span>
                    {value === option.name && (
                      <Check className="w-4 h-4 text-sky-400" />
                    )}
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-sm text-gray-500 italic text-center">
                  No options available
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

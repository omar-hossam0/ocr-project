"use client";
import React, { createContext, useContext, useMemo, useState } from "react";

type Toast = { id: number; message: string; type?: "success" | "error" };

const ToastContext = createContext<{
  showToast: (message: string, type?: "success" | "error") => void;
} | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (
    message: string,
    type: "success" | "error" = "success",
  ) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    const t: Toast = { id, message, type };
    setToasts((s) => [t, ...s]);
    setTimeout(() => {
      setToasts((s) => s.filter((x) => x.id !== id));
    }, 3500);
  };

  const value = useMemo(() => ({ showToast }), []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-3">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`max-w-xs px-4 py-2 rounded-lg shadow-lg text-sm text-white transition-all transform origin-top-right ${
              t.type === "success" ? "bg-emerald-500" : "bg-red-500"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export default ToastProvider;

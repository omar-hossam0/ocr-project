"use client";
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

type ToastType = "success" | "error";

type MessageToast = {
  id: number;
  kind: "message";
  message: string;
  type: ToastType;
};

type ConfirmToast = {
  id: number;
  kind: "confirm";
  message: string;
  confirmText: string;
  cancelText: string;
  resolver: (value: boolean) => void;
};

type Toast = MessageToast | ConfirmToast;

type ToastContextType = {
  showToast: (message: string, type?: ToastType) => void;
  showConfirmToast: (
    message: string,
    options?: { confirmText?: string; cancelText?: string },
  ) => Promise<boolean>;
};

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "success") => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      const t: MessageToast = { id, kind: "message", message, type };
      setToasts((s) => [t, ...s]);

      setTimeout(() => {
        removeToast(id);
      }, 3500);
    },
    [removeToast],
  );

  const showConfirmToast = useCallback(
    (
      message: string,
      options?: { confirmText?: string; cancelText?: string },
    ) => {
      return new Promise<boolean>((resolve) => {
        const id = Date.now() + Math.floor(Math.random() * 1000);
        const t: ConfirmToast = {
          id,
          kind: "confirm",
          message,
          confirmText: options?.confirmText || "Confirm",
          cancelText: options?.cancelText || "Cancel",
          resolver: resolve,
        };
        setToasts((s) => [t, ...s]);
      });
    },
    [],
  );

  const value = useMemo(
    () => ({ showToast, showConfirmToast }),
    [showToast, showConfirmToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-3">
        {toasts.map((t) => {
          if (t.kind === "confirm") {
            return (
              <div
                key={t.id}
                className="toast-zoom-in max-w-sm rounded-xl border border-white/15 bg-[#0f172a] p-4 shadow-2xl text-white"
              >
                <p className="text-sm leading-relaxed text-gray-100">
                  {t.message}
                </p>
                <div className="mt-3 flex items-center gap-2 justify-end">
                  <button
                    onClick={() => {
                      t.resolver(false);
                      removeToast(t.id);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-white/15 bg-white/5 text-gray-300 hover:bg-white/10 transition"
                  >
                    {t.cancelText}
                  </button>
                  <button
                    onClick={() => {
                      t.resolver(true);
                      removeToast(t.id);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500 text-white hover:bg-red-400 transition"
                  >
                    {t.confirmText}
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div
              key={t.id}
              className={`toast-zoom-in max-w-xs px-4 py-2 rounded-lg shadow-lg text-sm text-white transition-all transform origin-top-right ${
                t.type === "success" ? "bg-emerald-500" : "bg-red-500"
              }`}
            >
              {t.message}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export default ToastProvider;

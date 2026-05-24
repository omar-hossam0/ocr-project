"use client";
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, CheckCircle2, AlertCircle } from "lucide-react";

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
      setToasts((s) => [...s, t]);

      // Auto-remove after 2 seconds
      setTimeout(() => {
        removeToast(id);
      }, 2000);
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
        setToasts((s) => [...s, t]);
      });
    },
    [],
  );

  const value = useMemo(
    () => ({ showToast, showConfirmToast }),
    [showToast, showConfirmToast],
  );

  const messageToasts = toasts.filter((t): t is MessageToast => t.kind === "message");
  const confirmToasts = toasts.filter((t): t is ConfirmToast => t.kind === "confirm");

  return (
    <ToastContext.Provider value={value}>
      {children}
      
      {/* Top-Right Notifications (Success/Error) */}
      <div className="fixed top-6 right-6 z-[110] flex flex-col items-end pointer-events-none gap-3 max-w-[calc(100vw-3rem)]">
        <AnimatePresence mode="popLayout">
          {messageToasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.9, transition: { duration: 0.2 } }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="pointer-events-auto"
            >
              <div
                className={`flex items-center gap-4 px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-xl ${
                  t.type === "success"
                    ? "bg-emerald-500/90 border-emerald-500/20 text-white"
                    : "bg-red-500/90 border-red-500/20 text-white"
                }`}
              >
                {t.type === "success" ? (
                  <CheckCircle2 className="w-6 h-6 shrink-0" />
                ) : (
                  <AlertCircle className="w-6 h-6 shrink-0" />
                )}
                <p className="text-base font-bold tracking-tight whitespace-nowrap overflow-hidden text-ellipsis max-w-xs md:max-w-md">
                  {t.message}
                </p>
                <button
                  onClick={() => removeToast(t.id)}
                  className="p-1.5 rounded-xl hover:bg-white/20 transition-colors shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Centered Confirm Modals */}
      <div className="fixed inset-0 z-[120] flex items-center justify-center pointer-events-none">
        <AnimatePresence>
          {confirmToasts.map((t) => (
            <div key={t.id} className="fixed inset-0 flex items-center justify-center p-4 pointer-events-auto">
              {/* Backdrop with blur */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-md"
                onClick={() => {
                  t.resolver(false);
                  removeToast(t.id);
                }}
              />
              
              {/* Modal Content */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="relative max-w-lg w-full rounded-3xl border border-white/20 bg-[#0f172a]/90 backdrop-blur-2xl p-8 shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] text-white overflow-hidden"
              >
                {/* Decorative glow */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-500/10 blur-[60px] rounded-full pointer-events-none" />
                <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-sky-500/10 blur-[60px] rounded-full pointer-events-none" />

                <div className="flex flex-col items-center text-center gap-6">
                  <div className="p-4 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20">
                    <AlertCircle className="w-10 h-10" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-white tracking-tight">
                      {t.confirmText === "Delete" ? "Confirm Deletion" : "Confirmation Required"}
                    </h3>
                    <p className="text-lg leading-relaxed text-gray-300">
                      {t.message}
                    </p>
                  </div>
                </div>

                <div className="mt-10 flex items-center gap-3">
                  <button
                    onClick={() => {
                      t.resolver(false);
                      removeToast(t.id);
                    }}
                    className="flex-1 py-4 rounded-2xl text-base font-bold border border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white transition-all active:scale-[0.98]"
                  >
                    {t.cancelText}
                  </button>
                  <button
                    onClick={() => {
                      t.resolver(true);
                      removeToast(t.id);
                    }}
                    className="flex-1 py-4 rounded-2xl text-base font-bold bg-red-500 text-white hover:bg-red-600 shadow-xl shadow-red-500/20 hover:shadow-red-500/40 transition-all active:scale-[0.98]"
                  >
                    {t.confirmText}
                  </button>
                </div>
              </motion.div>
            </div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export default ToastProvider;

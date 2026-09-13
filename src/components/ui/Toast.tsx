"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

type Kind = "info" | "success" | "error";
interface Toast {
  id: number;
  kind: Kind;
  title: string;
  hint?: string;
}

interface ToastApi {
  toast: (kind: Kind, title: string, hint?: string) => void;
  success: (title: string, hint?: string) => void;
  error: (title: string, hint?: string) => void;
  info: (title: string, hint?: string) => void;
}

const Ctx = createContext<ToastApi | null>(null);

const ICONS: Record<Kind, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  error: AlertCircle,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const toast = useCallback(
    (kind: Kind, title: string, hint?: string) => {
      const id = ++seq.current;
      setToasts((t) => [...t.slice(-2), { id, kind, title, hint }]);
      window.setTimeout(() => dismiss(id), kind === "error" ? 7000 : 3500);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      toast,
      success: (t, h) => toast("success", t, h),
      error: (t, h) => toast("error", t, h),
      info: (t, h) => toast("info", t, h),
    }),
    [toast],
  );

  return (
    <Ctx.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+12px)] z-50 flex flex-col items-center gap-2 px-4"
      >
        <AnimatePresence>
          {toasts.map((t) => {
            const Icon = ICONS[t.kind];
            return (
              <motion.div
                key={t.id}
                role={t.kind === "error" ? "alert" : "status"}
                initial={{ opacity: 0, y: -12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border border-line bg-surface px-4 py-3 shadow-float"
              >
                <Icon
                  size={20}
                  className={
                    t.kind === "error"
                      ? "text-danger"
                      : t.kind === "success"
                        ? "text-ok"
                        : "text-accent"
                  }
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{t.title}</p>
                  {t.hint && <p className="mt-0.5 text-xs text-muted">{t.hint}</p>}
                </div>
                <button
                  onClick={() => dismiss(t.id)}
                  aria-label="סגור הודעה"
                  className="-me-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-text"
                >
                  <X size={16} aria-hidden />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): ToastApi {
  const v = useContext(Ctx);
  if (!v) throw new Error("useToast must be used inside ToastProvider");
  return v;
}

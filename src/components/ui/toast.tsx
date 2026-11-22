"use client";

import { CheckCircle2, Info, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

interface ToastAction {
  label: string;
  onClick: () => void;
}
interface ToastItem {
  id: number;
  message: string;
  tone: "success" | "info";
  action?: ToastAction;
}
interface ToastApi {
  show: (message: string, opts?: { tone?: ToastItem["tone"]; action?: ToastAction; durationMs?: number }) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
  }, []);

  const show = useCallback<ToastApi["show"]>(
    (message, opts = {}) => {
      const id = nextId.current++;
      setToasts((t) => [...t.slice(-2), { id, message, tone: opts.tone ?? "success", action: opts.action }]);
      timers.current.set(id, setTimeout(() => dismiss(id), opts.durationMs ?? (opts.action ? 6000 : 3500)));
    },
    [dismiss],
  );

  useEffect(() => {
    const map = timers.current;
    return () => map.forEach((t) => clearTimeout(t));
  }, []);

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        role="status"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex w-full max-w-md animate-toast items-center gap-3 rounded-[0.75rem] bg-ink px-4 py-3 text-sm text-white shadow-lift"
          >
            {t.tone === "success" ? (
              <CheckCircle2 className="size-[1.1rem] shrink-0 text-[#9CC7AE]" aria-hidden strokeWidth={1.75} />
            ) : (
              <Info className="size-[1.1rem] shrink-0 text-[#E3B27A]" aria-hidden strokeWidth={1.75} />
            )}
            <p className="flex-1">{t.message}</p>
            {t.action && (
              <button
                type="button"
                className="rounded-[0.5rem] px-3 py-1.5 font-medium text-white underline decoration-white/40 underline-offset-4 hover:bg-white/10"
                onClick={() => {
                  t.action!.onClick();
                  dismiss(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
            <button type="button" aria-label="Dismiss notification" className="rounded-[0.375rem] p-1 text-white/60 hover:text-white" onClick={() => dismiss(t.id)}>
              <X className="size-4" aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

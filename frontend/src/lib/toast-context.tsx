"use client";

/**
 * Toast notification context: exposes a `toast()` function and renders a stack
 * of auto-dismissing success/error/info messages fixed at the bottom of the screen.
 */

import { createContext, useCallback, useContext, useRef, useState } from "react";

import { Icon, type IconName } from "@/components/Icon";

type ToastKind = "success" | "error" | "info";

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  toast: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

// Provides the toast() action and renders the live toast stack for the app.
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, kind: ToastKind = "info") => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, kind, message }]);
      // auto-dismiss after 5s
      setTimeout(() => dismiss(id), 5000);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl px-4 py-3 text-sm shadow-[var(--shadow-card)] ${
              t.kind === "success"
                ? "bg-contrast text-on-contrast"
                : t.kind === "error"
                  ? "bg-accent text-white"
                  : "bg-surface text-ink ring-1 ring-line"
            }`}
          >
            <span className="mt-0.5 shrink-0">
              <Icon name={iconFor(t.kind)} size={18} />
            </span>
            <span className="flex-1">{t.message}</span>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
              className="shrink-0 opacity-70 transition-opacity hover:opacity-100"
            >
              <Icon name="close" size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function iconFor(kind: ToastKind): IconName {
  return kind === "success" ? "check_circle" : kind === "error" ? "error" : "info";
}

// Hook to read the toast context; throws if used outside a ToastProvider.
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (ctx === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}

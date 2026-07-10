"use client";

import * as React from "react";
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastMessage {
  id: string;
  title?: string;
  description: string;
  type?: ToastType;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastMessage[];
  toast: (message: Omit<ToastMessage, "id">) => void;
  dismiss: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastMessage[]>([]);

  const toast = React.useCallback(
    ({ title, description, type = "info", duration = 4000 }: Omit<ToastMessage, "id">) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, title, description, type, duration }]);

      if (duration > 0) {
        setTimeout(() => {
          dismiss(id);
        }, duration);
      }
    },
    []
  );

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  dismiss: (id: string) => void;
}

function ToastContainer({ toasts, dismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex w-full max-w-md flex-col gap-2 p-4">
      {toasts.map((toast) => {
        const Icon = {
          success: CheckCircle,
          error: AlertCircle,
          warning: AlertTriangle,
          info: Info,
        }[toast.type || "info"];

        return (
          <div
            key={toast.id}
            className={cn(
              "flex w-full items-start gap-3 rounded-lg border p-4 shadow-lg transition-all duration-300 animate-in slide-in-from-bottom-5",
              {
                "bg-emerald-50 border-emerald-200 text-emerald-950 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-100":
                  toast.type === "success",
                "bg-rose-50 border-rose-200 text-rose-950 dark:bg-rose-950/20 dark:border-rose-800 dark:text-rose-100":
                  toast.type === "error",
                "bg-amber-50 border-amber-200 text-amber-950 dark:bg-amber-950/20 dark:border-amber-800 dark:text-amber-100":
                  toast.type === "warning",
                "bg-zinc-50 border-zinc-200 text-zinc-950 dark:bg-zinc-900/50 dark:border-zinc-800 dark:text-zinc-100":
                  toast.type === "info" || !toast.type,
              }
            )}
          >
            <Icon className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              {toast.title && <h4 className="font-semibold text-sm">{toast.title}</h4>}
              <p className="text-xs opacity-90">{toast.description}</p>
            </div>
            <button
              onClick={() => dismiss(toast.id)}
              className="rounded-full p-1 hover:bg-black/5 dark:hover:bg-white/5 transition-colors shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

"use client";

import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import * as RadixToast from "@radix-ui/react-toast";
import { cn } from "@/lib/ui/cn";

/**
 * Sistema de toasts global (RF-B1). Montar `ToastProvider` UNA vez en el
 * layout raíz; cualquier client component dispara avisos con `useToast()`:
 *
 *   const toast = useToast();
 *   toast({ title: "OT actualizada", description: "Técnico en ruta" });
 *   toast({ variant: "error", title: "No se pudo guardar" });
 *
 * Criterio del design system: la validación de campos se muestra inline
 * junto al campo; el RESULTADO de una operación (éxito o fallo del server)
 * se muestra con toast.
 */

export type ToastVariant = "success" | "error";

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
}

interface ToastItem {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
}

const ToastContext = createContext<((opts: ToastOptions) => void) | null>(null);

export function useToast(): (opts: ToastOptions) => void {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast requiere <ToastProvider> montado en el layout raíz");
  }
  return ctx;
}

const VARIANTE: Record<ToastVariant, { borde: string; glifo: string; glifoCls: string; duracion: number }> = {
  success: { borde: "border-emerald-700/60", glifo: "✓", glifoCls: "text-emerald-400", duracion: 4500 },
  error:   { borde: "border-red-700/60",     glifo: "✕", glifoCls: "text-red-400",     duracion: 7000 },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const toast = useCallback((opts: ToastOptions) => {
    const id = ++idRef.current;
    setToasts((prev) => [
      ...prev,
      { id, title: opts.title, description: opts.description, variant: opts.variant ?? "success" },
    ]);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      <RadixToast.Provider swipeDirection="right">
        {children}

        {toasts.map((t) => {
          const v = VARIANTE[t.variant];
          return (
            <RadixToast.Root
              key={t.id}
              duration={v.duracion}
              onOpenChange={(open) => {
                if (!open) setToasts((prev) => prev.filter((x) => x.id !== t.id));
              }}
              className={cn(
                "animate-toast-in relative rounded-xl border bg-slate-800 shadow-2xl p-4 pr-11",
                "data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=end]:opacity-0",
                v.borde,
              )}
            >
              <div className="flex gap-3">
                <span aria-hidden="true" className={cn("text-base font-bold leading-5", v.glifoCls)}>
                  {v.glifo}
                </span>
                <div className="min-w-0">
                  <RadixToast.Title className="text-sm font-semibold text-white">
                    {t.title}
                  </RadixToast.Title>
                  {t.description && (
                    <RadixToast.Description className="text-xs text-slate-400 mt-0.5">
                      {t.description}
                    </RadixToast.Description>
                  )}
                </div>
              </div>
              <RadixToast.Close className="absolute top-2.5 right-2.5 min-h-[28px] min-w-[28px] flex items-center justify-center rounded-md text-slate-500 hover:text-white transition-colors">
                <span aria-hidden="true">✕</span>
                <span className="sr-only">Cerrar aviso</span>
              </RadixToast.Close>
            </RadixToast.Root>
          );
        })}

        <RadixToast.Viewport className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 w-[min(92vw,380px)] outline-none" />
      </RadixToast.Provider>
    </ToastContext.Provider>
  );
}

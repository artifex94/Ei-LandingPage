"use client";

import React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/ui/cn";

export type ModalSize = "sm" | "md" | "lg";

const SIZE_CLASS: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
};

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  size?: ModalSize;
  children: React.ReactNode;
}

/**
 * Diálogo modal accesible. Extrae el patrón Radix de `PagoModal` (overlay,
 * content centrado, cierre 44px con label sr-only, scroll interno) a una
 * primitiva única (RF-A6).
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  size = "md",
  children,
}: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70 z-40" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50",
            "bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl",
            "w-full p-6 max-h-[90vh] overflow-y-auto",
            SIZE_CLASS[size],
          )}
          // Sin descripción optamos explícitamente por no describir (evita el
          // warning de Radix); con descripción, Dialog.Description lo cablea.
          {...(description ? {} : { "aria-describedby": undefined })}
        >
          <Dialog.Title className="text-xl font-bold text-white mb-1">
            {title}
          </Dialog.Title>
          {description && (
            <Dialog.Description className="text-slate-400 text-sm mb-6">
              {description}
            </Dialog.Description>
          )}

          {children}

          <Dialog.Close className="absolute top-4 right-4 text-slate-400 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg transition-colors">
            <span aria-hidden="true" className="text-xl">
              ✕
            </span>
            <span className="sr-only">Cerrar</span>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default Modal;

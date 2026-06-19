import React from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/ui/cn";

export type EmptyStateTone = "neutral" | "success";

type EmptyStateAction =
  | { label: string; href: string; onClick?: never }
  | { label: string; onClick: () => void; href?: never };

export interface EmptyStateProps {
  /** Icono opcional (lucide) o nodo arbitrario. */
  icon?: LucideIcon;
  /** Etiqueta superior en mayúsculas (ej. "Todo al día"). */
  eyebrow?: string;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  tone?: EmptyStateTone;
  className?: string;
}

const TONE = {
  neutral: {
    wrap: "border-slate-700 bg-slate-800/50",
    iconWrap: "bg-slate-800 border-slate-700 text-slate-400",
    eyebrow: "text-slate-500",
  },
  success: {
    wrap: "border-emerald-800/30 bg-emerald-950/10",
    iconWrap: "bg-emerald-900/50 border-emerald-700/50 text-emerald-400",
    eyebrow: "text-emerald-500",
  },
} satisfies Record<EmptyStateTone, { wrap: string; iconWrap: string; eyebrow: string }>;

/**
 * Estado vacío genérico. Consolida los empty-states inline de las 23 tablas y
 * reemplaza a `EmptyStateSuccess` vía `tone="success"` (RF-A3).
 */
export function EmptyState({
  icon: Icon,
  eyebrow,
  title,
  description,
  action,
  tone = "neutral",
  className,
}: EmptyStateProps) {
  const t = TONE[tone];

  return (
    <div
      className={cn(
        "rounded-xl border px-6 py-10 text-center",
        t.wrap,
        className,
      )}
    >
      {Icon && (
        <div
          className={cn(
            "inline-flex items-center justify-center w-11 h-11 rounded-full border mb-4",
            t.iconWrap,
          )}
          aria-hidden="true"
        >
          <Icon className="w-5 h-5" strokeWidth={2} />
        </div>
      )}
      {eyebrow && (
        <p className={cn("text-[11px] font-bold uppercase tracking-widest mb-1", t.eyebrow)}>
          {eyebrow}
        </p>
      )}
      <p className="text-base font-semibold text-white">{title}</p>
      {description && (
        <p className="text-sm text-slate-400 mt-1 max-w-xs mx-auto">{description}</p>
      )}
      {action &&
        (action.href ? (
          <Link
            href={action.href}
            className="mt-4 inline-block text-xs font-semibold text-orange-400 hover:text-orange-300 transition-colors"
          >
            {action.label} →
          </Link>
        ) : (
          <button
            type="button"
            onClick={action.onClick}
            className="mt-4 inline-block text-xs font-semibold text-orange-400 hover:text-orange-300 transition-colors"
          >
            {action.label} →
          </button>
        ))}
    </div>
  );
}

export default EmptyState;

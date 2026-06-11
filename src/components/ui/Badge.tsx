import React from "react";
import { cn } from "@/lib/ui/cn";

export type BadgeVariant =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "brand";

export type BadgeSize = "sm" | "md";

const VARIANT_CLASS: Record<BadgeVariant, string> = {
  neutral: "bg-slate-700 text-slate-300",
  info: "bg-blue-500/20 text-blue-300",
  success: "bg-emerald-500/20 text-emerald-300",
  warning: "bg-amber-500/20 text-amber-300",
  danger: "bg-red-500/20 text-red-300",
  brand: "bg-tactical-500/20 text-tactical-300",
};

const SIZE_CLASS: Record<BadgeSize, string> = {
  sm: "text-xs font-semibold px-2 py-0.5",
  md: "text-xs font-semibold px-2.5 py-1",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
}

/**
 * Etiqueta de estado reutilizable. Consolida el patrón
 * `bg-X-500/20 text-X-300 rounded-full` duplicado en el proyecto (RF-A1).
 */
export function Badge({
  variant = "neutral",
  size = "sm",
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full",
        VARIANT_CLASS[variant],
        SIZE_CLASS[size],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export default Badge;

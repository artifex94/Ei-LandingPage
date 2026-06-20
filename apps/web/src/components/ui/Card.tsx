import React from "react";
import { cn } from "@/lib/ui/cn";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Atenúa el fondo (`bg-slate-800/50`) — útil para contenedores secundarios. */
  muted?: boolean;
}

/**
 * Contenedor base. Consolida el patrón `rounded-lg border border-slate-700`
 * repetido en tablas, paneles y tarjetas (RF-A2).
 */
export function Card({ muted = false, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-700/70",
        muted ? "bg-slate-800/40" : "bg-slate-900/70",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "px-4 py-3 border-b border-slate-700/60 bg-slate-800/40",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardBody({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("p-4", className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "px-4 py-3 border-t border-slate-700/60 bg-slate-800/25",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export default Card;

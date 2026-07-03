"use client";

import { cn } from "@/lib/ui/cn";
import { useCountUp } from "@/lib/ui/useCountUp";

interface StatCounterProps {
  to: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

/**
 * Número que sube de 0 al valor final al entrar en pantalla, como la lectura
 * de un panel de monitoreo que se estabiliza. La copia invisible con el valor
 * final reserva el ancho (la cantidad de dígitos cambia durante el conteo) y
 * evita saltos de layout; también es lo que queda en el HTML sin JS.
 */
export default function StatCounter({ to, prefix = "", suffix = "", className }: StatCounterProps) {
  const { ref, value, done } = useCountUp<HTMLSpanElement>(to);

  return (
    <span ref={ref} className={cn("stat-figure", className)}>
      <span aria-hidden="true" className="invisible">
        {prefix}
        {to}
        {suffix}
      </span>
      <span className={cn("tabular-nums", done && "stat-settled")}>
        {prefix}
        {value}
        {suffix}
      </span>
    </span>
  );
}

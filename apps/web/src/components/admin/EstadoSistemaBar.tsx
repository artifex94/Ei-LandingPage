"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface Props {
  eventosSinProcesar: number;
  pendingMantenimiento: number;
  altasUsuarioPendientes: number;
  pendingSolicitudes: number;
  cuentasEnMora: number;
  otsPendientes: number;
}

export function EstadoSistemaBar({
  eventosSinProcesar,
  pendingMantenimiento,
  altasUsuarioPendientes,
  pendingSolicitudes,
  cuentasEnMora,
  otsPendientes,
}: Props) {
  const pathname = usePathname();

  // En el dashboard ya hay alertas inline — la barra sería redundante
  if (pathname === "/admin/dashboard") return null;

  const total =
    eventosSinProcesar +
    pendingMantenimiento +
    altasUsuarioPendientes +
    pendingSolicitudes +
    cuentasEnMora +
    otsPendientes;

  if (total === 0) return null;

  const esCritico = eventosSinProcesar > 0;

  return (
    <Link
      href="/admin/dashboard"
      className={`flex items-center gap-2.5 mb-6 rounded-xl border px-4 py-2.5 text-sm transition-colors ${
        esCritico
          ? "border-red-800/50 bg-red-950/20 text-red-300 hover:border-red-700/60"
          : "border-amber-800/40 bg-amber-950/10 text-amber-400 hover:border-amber-700/50"
      }`}
      aria-label={`${total} ítems pendientes — ir al dashboard`}
    >
      <span
        className={`w-2 h-2 rounded-full flex-shrink-0 ${
          esCritico ? "bg-red-500 animate-led-crit" : "bg-amber-500 animate-led-alert"
        }`}
        aria-hidden="true"
      />
      <span className="font-medium">
        {total} ítem{total > 1 ? "s" : ""} pendientes
      </span>
      <span className="ml-auto text-xs opacity-50">Ver dashboard →</span>
    </Link>
  );
}

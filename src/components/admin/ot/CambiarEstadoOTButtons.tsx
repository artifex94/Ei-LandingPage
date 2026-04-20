"use client";

import { useTransition } from "react";
import type { EstadoOT } from "@/generated/prisma/client";
import { cambiarEstadoOT } from "@/lib/actions/ot";

const TRANSICIONES: Record<string, { estado: EstadoOT; label: string; color: string }[]> = {
  SOLICITADA: [
    { estado: "ASIGNADA",  label: "Marcar asignada",  color: "bg-blue-600 hover:bg-blue-500" },
    { estado: "CANCELADA", label: "Cancelar OT",       color: "bg-red-700 hover:bg-red-600" },
  ],
  ASIGNADA: [
    { estado: "EN_RUTA",   label: "Técnico en ruta",   color: "bg-indigo-600 hover:bg-indigo-500" },
    { estado: "CANCELADA", label: "Cancelar OT",        color: "bg-red-700 hover:bg-red-600" },
  ],
  EN_RUTA: [
    { estado: "EN_SITIO",  label: "Llegó al sitio",    color: "bg-emerald-600 hover:bg-emerald-500" },
  ],
  EN_SITIO: [
    { estado: "COMPLETADA", label: "Marcar completada", color: "bg-emerald-600 hover:bg-emerald-500" },
  ],
};

export function CambiarEstadoOTButtons({
  ot_id,
  estado_actual,
}: {
  ot_id: string;
  estado_actual: string;
}) {
  const [pending, startTransition] = useTransition();
  const opciones = TRANSICIONES[estado_actual] ?? [];

  if (opciones.length === 0) return null;

  function handleCambio(estado: EstadoOT) {
    startTransition(async () => { await cambiarEstadoOT(ot_id, estado); });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {opciones.map((op) => (
        <button
          key={op.estado}
          onClick={() => handleCambio(op.estado)}
          disabled={pending}
          className={`px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50 ${op.color}`}
        >
          {op.label}
        </button>
      ))}
    </div>
  );
}

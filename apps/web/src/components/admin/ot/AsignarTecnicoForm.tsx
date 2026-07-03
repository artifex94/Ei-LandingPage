"use client";

import { useState, useTransition } from "react";
import { asignarTecnico } from "@/lib/actions/ot";
import { useToast } from "@/components/ui/Toast";

type EmpleadoConPerfil = { id: string; perfil: { nombre: string } };

export function AsignarTecnicoForm({
  ot_id,
  tecnicos,
  tecnico_actual,
  fecha_actual,
}: {
  ot_id: string;
  tecnicos: EmpleadoConPerfil[];
  tecnico_actual?: string;
  fecha_actual?: Date;
}) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  // Validación de campos inline; el resultado de la operación va por toast.
  const [error, setError] = useState<string | null>(null);
  // Conflictos de agenda detectados por el server: se pide confirmación
  // explícita antes de asignar igual (nunca se bloquea, solo se avisa).
  const [conflicto, setConflicto] = useState<{
    tecnico_id: string;
    fecha: Date;
    detalles: string[];
  } | null>(null);

  function ejecutarAsignacion(tecnico_id: string, fecha: Date, confirmarConflictos: boolean) {
    startTransition(async () => {
      try {
        const resultado = await asignarTecnico(ot_id, tecnico_id, fecha, true, confirmarConflictos);
        if ("warning" in resultado && resultado.warning) {
          setConflicto({ tecnico_id, fecha, detalles: resultado.conflictos });
          return;
        }
        setConflicto(null);
        toast({
          title: "Técnico asignado",
          description: "Vehículo reservado automáticamente.",
        });
      } catch (err) {
        toast({
          variant: "error",
          title: "No se pudo asignar el técnico",
          description: err instanceof Error ? err.message : undefined,
        });
      }
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const tecnico_id = fd.get("tecnico_id") as string;
    const fecha_str  = fd.get("fecha_visita") as string;

    if (!tecnico_id || !fecha_str) {
      setError("Seleccioná técnico y fecha.");
      return;
    }

    ejecutarAsignacion(tecnico_id, new Date(fecha_str), false);
  }

  const fechaDefault = fecha_actual
    ? new Date(fecha_actual.getTime() - fecha_actual.getTimezoneOffset() * 60000)
        .toISOString().slice(0, 16)
    : "";

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">
        <div>
          <label htmlFor="tecnico_id" className="block text-xs text-slate-400 mb-1">Técnico</label>
          <select id="tecnico_id" name="tecnico_id" defaultValue={tecnico_actual ?? ""}
            className="rounded-lg border border-slate-600 bg-slate-800 text-white px-3 py-2 text-sm focus:outline-none focus:outline-2 focus:outline-orange-500">
            <option value="">Seleccionar…</option>
            {tecnicos.map((t) => (
              <option key={t.id} value={t.id}>{t.perfil.nombre}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="fecha_visita_asig" className="block text-xs text-slate-400 mb-1">Fecha y hora</label>
          <input id="fecha_visita_asig" name="fecha_visita" type="datetime-local"
            defaultValue={fechaDefault}
            className="rounded-lg border border-slate-600 bg-slate-800 text-white px-3 py-2 text-sm focus:outline-none focus:outline-2 focus:outline-orange-500" />
        </div>

        <button type="submit" disabled={pending}
          className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-slate-900 text-sm font-medium transition-colors disabled:opacity-50">
          {pending ? "Asignando…" : "Asignar"}
        </button>

        {error && <p className="text-xs text-red-400">{error}</p>}
      </form>

      {conflicto && (
        <div className="rounded-lg border border-orange-500/40 bg-orange-500/10 px-3 py-2.5 space-y-2">
          <p className="text-xs font-medium text-orange-300">
            El técnico tiene conflictos de agenda ese día:
          </p>
          <ul className="text-xs text-orange-200/90 list-disc list-inside space-y-0.5">
            {conflicto.detalles.map((detalle, i) => (
              <li key={i}>{detalle}</li>
            ))}
          </ul>
          <button
            type="button"
            disabled={pending}
            onClick={() => ejecutarAsignacion(conflicto.tecnico_id, conflicto.fecha, true)}
            className="px-3 py-1.5 rounded-md bg-orange-500 hover:bg-orange-600 text-slate-900 text-xs font-medium transition-colors disabled:opacity-50"
          >
            {pending ? "Asignando…" : "Asignar igualmente"}
          </button>
        </div>
      )}
    </div>
  );
}

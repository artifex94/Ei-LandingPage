"use client";

import { useState, useTransition } from "react";
import { asignarTecnico } from "@/lib/actions/ot";

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
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setOk(false);
    const fd = new FormData(e.currentTarget);
    const tecnico_id = fd.get("tecnico_id") as string;
    const fecha_str  = fd.get("fecha_visita") as string;

    if (!tecnico_id || !fecha_str) {
      setError("Seleccioná técnico y fecha.");
      return;
    }

    startTransition(async () => {
      try {
        await asignarTecnico(ot_id, tecnico_id, new Date(fecha_str));
        setOk(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
      }
    });
  }

  const fechaDefault = fecha_actual
    ? new Date(fecha_actual.getTime() - fecha_actual.getTimezoneOffset() * 60000)
        .toISOString().slice(0, 16)
    : "";

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">
      <div>
        <label htmlFor="tecnico_id" className="block text-xs text-slate-400 mb-1">Técnico</label>
        <select id="tecnico_id" name="tecnico_id" defaultValue={tecnico_actual ?? ""}
          className="rounded-lg border border-slate-600 bg-slate-800 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
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
          className="rounded-lg border border-slate-600 bg-slate-800 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
      </div>

      <button type="submit" disabled={pending}
        className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors disabled:opacity-50">
        {pending ? "Asignando…" : "Asignar"}
      </button>

      {ok    && <p className="text-xs text-emerald-400">✓ Asignado (vehículo reservado automáticamente)</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </form>
  );
}

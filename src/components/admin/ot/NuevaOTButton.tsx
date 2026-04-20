"use client";

import { useState, useTransition } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { crearOT } from "@/lib/actions/ot";

type EmpleadoConPerfil = { id: string; perfil: { nombre: string } };

const TIPOS = [
  { value: "INSTALACION", label: "Instalación" },
  { value: "CORRECTIVO",  label: "Correctivo" },
  { value: "PREVENTIVO",  label: "Preventivo" },
  { value: "RETIRO",      label: "Retiro" },
] as const;

const PRIORIDADES = [
  { value: "BAJA",  label: "Baja" },
  { value: "MEDIA", label: "Media" },
  { value: "ALTA",  label: "Alta" },
] as const;

export function NuevaOTButton({ empleados }: { empleados: EmpleadoConPerfil[] }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);

    const tipo        = fd.get("tipo") as string;
    const descripcion = (fd.get("descripcion") as string).trim();
    const prioridad   = fd.get("prioridad") as string;
    const fecha_str   = fd.get("fecha_visita") as string;
    const notas       = (fd.get("notas_admin") as string).trim();

    if (!tipo || !descripcion) {
      setError("Tipo y descripción son obligatorios.");
      return;
    }

    startTransition(async () => {
      try {
        await crearOT({
          tipo:        tipo as never,
          descripcion,
          prioridad:   prioridad as never,
          fecha_visita: fecha_str ? new Date(fecha_str) : undefined,
          notas_admin:  notas || undefined,
        });
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
      }
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors">
          <span aria-hidden="true">+</span> Nueva OT
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
          aria-describedby="nueva-ot-desc"
        >
          <Dialog.Title className="text-lg font-semibold text-white mb-1">Nueva orden de trabajo</Dialog.Title>
          <Dialog.Description id="nueva-ot-desc" className="text-sm text-slate-400 mb-5">
            Creá una OT para asignar al técnico.
          </Dialog.Description>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="ot-tipo" className="block text-sm font-medium text-slate-300 mb-1">
                  Tipo <span className="text-red-400" aria-hidden="true">*</span>
                </label>
                <select id="ot-tipo" name="tipo" required
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Seleccionar…</option>
                  {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="ot-prioridad" className="block text-sm font-medium text-slate-300 mb-1">Prioridad</label>
                <select id="ot-prioridad" name="prioridad" defaultValue="MEDIA"
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {PRIORIDADES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="ot-descripcion" className="block text-sm font-medium text-slate-300 mb-1">
                Descripción <span className="text-red-400" aria-hidden="true">*</span>
              </label>
              <textarea id="ot-descripcion" name="descripcion" required rows={3}
                placeholder="Describí el trabajo a realizar…"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 text-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>

            <div>
              <label htmlFor="ot-fecha" className="block text-sm font-medium text-slate-300 mb-1">Fecha de visita (opcional)</label>
              <input id="ot-fecha" name="fecha_visita" type="datetime-local"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>

            <div>
              <label htmlFor="ot-notas" className="block text-sm font-medium text-slate-300 mb-1">Notas internas (opcional)</label>
              <textarea id="ot-notas" name="notas_admin" rows={2}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 text-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>

            {error && (
              <p role="alert" className="text-sm text-red-400 bg-red-400/10 rounded px-3 py-2">{error}</p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Dialog.Close asChild>
                <button type="button" className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">Cancelar</button>
              </Dialog.Close>
              <button type="submit" disabled={pending}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors disabled:opacity-50">
                {pending ? "Creando…" : "Crear OT"}
              </button>
            </div>
          </form>

          <Dialog.Close asChild>
            <button className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors" aria-label="Cerrar">✕</button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

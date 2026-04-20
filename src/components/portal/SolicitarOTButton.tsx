"use client";

import { useState, useTransition } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { crearOT } from "@/lib/actions/ot";

export function SolicitarOTButton({
  cuentas,
  perfil_id,
}: {
  cuentas: { id: string; descripcion: string }[];
  perfil_id: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const descripcion = (fd.get("descripcion") as string).trim();
    const cuenta_id   = fd.get("cuenta_id") as string;

    if (!descripcion) { setError("Describí el problema o trabajo."); return; }

    startTransition(async () => {
      try {
        await crearOT({
          tipo: "CORRECTIVO",
          descripcion,
          perfil_id,
          cuenta_id: cuenta_id || undefined,
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
          <span aria-hidden="true">+</span> Solicitar servicio
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
          aria-describedby="solicitar-ot-desc"
        >
          <Dialog.Title className="text-lg font-semibold text-white mb-1">
            Solicitar servicio técnico
          </Dialog.Title>
          <Dialog.Description id="solicitar-ot-desc" className="text-sm text-slate-400 mb-5">
            Describí el problema y te contactamos para coordinar una visita.
          </Dialog.Description>

          <form onSubmit={handleSubmit} className="space-y-4">
            {cuentas.length > 0 && (
              <div>
                <label htmlFor="solicitar-cuenta" className="block text-sm font-medium text-slate-300 mb-1">
                  Servicio afectado (opcional)
                </label>
                <select id="solicitar-cuenta" name="cuenta_id"
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Todos / No sé</option>
                  {cuentas.map((c) => (
                    <option key={c.id} value={c.id}>{c.descripcion}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label htmlFor="solicitar-desc" className="block text-sm font-medium text-slate-300 mb-1">
                ¿Qué necesitás? <span className="text-red-400" aria-hidden="true">*</span>
              </label>
              <textarea id="solicitar-desc" name="descripcion" required rows={4}
                placeholder="Ej: La alarma no para de sonar, el sensor del garage no responde…"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 text-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>

            {error && (
              <p role="alert" className="text-sm text-red-400 bg-red-400/10 rounded px-3 py-2">{error}</p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Dialog.Close asChild>
                <button type="button" className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">
                  Cancelar
                </button>
              </Dialog.Close>
              <button type="submit" disabled={pending}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors disabled:opacity-50">
                {pending ? "Enviando…" : "Enviar solicitud"}
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

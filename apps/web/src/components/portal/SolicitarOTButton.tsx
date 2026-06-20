"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
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
  const [success, setSuccess] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timerRef.current), []);

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
        setSuccess(true);
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => { setOpen(false); setSuccess(false); }, 2000);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="portal-action portal-action-primary"
      >
        <span aria-hidden="true">+</span> Pedir asistencia
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        size="md"
        title="Solicitar servicio técnico"
        description="Describí el problema y te contactamos para coordinar una visita."
      >
        {success ? (
          <div className="text-center space-y-3 py-4">
            <p className="text-green-400 text-3xl" aria-hidden="true">✓</p>
            <p className="text-white font-semibold">¡Solicitud enviada!</p>
            <p className="text-slate-400 text-sm">Un técnico se pondrá en contacto a la brevedad.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} aria-label="Solicitar orden de trabajo" className="space-y-4">
            {cuentas.length > 0 && (
              <div>
                <label htmlFor="solicitar-cuenta" className="block text-sm font-medium text-slate-300 mb-1">
                  Servicio afectado (opcional)
                </label>
                <select id="solicitar-cuenta" name="cuenta_id" autoFocus
                  className="w-full rounded-lg border border-slate-600 bg-slate-700 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
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
                className="w-full rounded-lg border border-slate-600 bg-slate-700 text-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>

            {error && (
              <p role="alert" className="text-sm text-red-400 bg-red-400/10 rounded px-3 py-2">{error}</p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button type="submit" disabled={pending}
                className="portal-action portal-action-primary disabled:opacity-50">
                {pending ? "Enviando…" : "Enviar solicitud"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}

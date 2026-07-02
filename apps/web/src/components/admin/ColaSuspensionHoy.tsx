"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import { Modal } from "@/components/ui/Modal";
import {
  suspenderCandidato,
  condonarCandidato,
  type CandidatoSuspensionActionResult,
} from "@/lib/actions/candidatos-suspension";

export interface CandidatoSuspensionFila {
  id: string;
  clienteNombre: string;
  cuentaEtiqueta: string;
  dpd: number;
  deudaTotal: number;
}

/**
 * Tarjeta "A suspender hoy" — Fase 3 del plan maestro (tesoreros).
 * Muestra la cola generada por el cron (`CandidatoSuspension` abiertos) con dos
 * acciones por fila: Suspender (escribe Cuenta.estado = SUSPENDIDA_PAGO) o Condonar
 * (cierra el candidato sin tocar la cuenta). Ambas piden justificación obligatoria.
 * Naranja siempre, nunca rojo (AegisCore) — suspender no es un error, es una decisión.
 */
export function ColaSuspensionHoy({ candidatos }: { candidatos: CandidatoSuspensionFila[] }) {
  if (candidatos.length === 0) return null;

  return (
    <section
      aria-labelledby="cola-suspension-heading"
      className="bg-orange-950/20 border border-orange-700/50 rounded-xl p-5"
    >
      <div className="mb-3">
        <h2 id="cola-suspension-heading" className="text-lg font-bold text-orange-300">
          A suspender hoy
        </h2>
        <p className="text-xs text-orange-400/70 mt-0.5">
          {candidatos.length} cuenta{candidatos.length !== 1 ? "s" : ""} superó los días de
          gracia de mora. La suspensión nunca es automática: la decisión es tuya.
        </p>
      </div>

      <div className="divide-y divide-orange-900/40">
        {candidatos.map((candidato) => (
          <FilaCandidato key={candidato.id} candidato={candidato} />
        ))}
      </div>
    </section>
  );
}

function FilaCandidato({ candidato }: { candidato: CandidatoSuspensionFila }) {
  const [modal, setModal] = useState<"suspender" | "condonar" | null>(null);

  return (
    <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="font-semibold text-white text-sm truncate">{candidato.clienteNombre}</p>
        <p className="text-xs text-slate-400 truncate">{candidato.cuentaEtiqueta}</p>
        <p className="text-xs text-orange-300 mt-0.5">
          {candidato.dpd} días de atraso · ${candidato.deudaTotal.toLocaleString("es-AR")}
        </p>
      </div>

      <div className="flex gap-2 shrink-0">
        <button
          type="button"
          onClick={() => setModal("condonar")}
          className="border border-slate-600 text-slate-300 hover:text-white hover:border-slate-500 px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px]"
        >
          Condonar
        </button>
        <button
          type="button"
          onClick={() => setModal("suspender")}
          className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded-lg text-sm font-semibold transition-colors min-h-[44px]"
        >
          Suspender
        </button>
      </div>

      {modal && (
        <ConfirmarResolucionModal
          tipo={modal}
          candidatoId={candidato.id}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

const initialState: CandidatoSuspensionActionResult = {};

function ConfirmarResolucionModal({
  tipo,
  candidatoId,
  onClose,
}: {
  tipo: "suspender" | "condonar";
  candidatoId: string;
  onClose: () => void;
}) {
  const accion = tipo === "suspender" ? suspenderCandidato : condonarCandidato;
  const [state, formAction, pending] = useActionState(accion, initialState);

  // El revalidatePath de la action refresca la cola desde el server component;
  // acá solo cerramos el modal al confirmar éxito.
  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, onClose]);

  const fieldId = `justificacion-${candidatoId}-${tipo}`;

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={tipo === "suspender" ? "Confirmar suspensión" : "Confirmar condonación"}
      description={
        tipo === "suspender"
          ? "La cuenta pasa a SUSPENDIDA por falta de pago. El cliente pierde acceso al servicio hasta que regularice."
          : "La cuenta sigue activa; la mora queda registrada como condonada en el historial."
      }
    >
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="candidato_id" value={candidatoId} />

        <div>
          <label htmlFor={fieldId} className="block text-sm font-medium text-slate-300 mb-1">
            Justificación <span aria-hidden="true">*</span>
            <span className="text-slate-500 font-normal ml-1">(mínimo 10 caracteres)</span>
          </label>
          <textarea
            id={fieldId}
            name="justificacion"
            rows={3}
            required
            minLength={10}
            placeholder={
              tipo === "suspender"
                ? "Ej: Sin respuesta tras 3 avisos por WhatsApp, deuda de 2 meses..."
                : "Ej: Acordamos condonar el mes por reclamo de servicio validado..."
            }
            className="w-full bg-slate-700 border border-slate-600 text-white placeholder:text-slate-400 rounded-lg px-3 py-2 text-sm focus:outline-2 focus:outline-orange-500 resize-none"
          />
        </div>

        {state.error && (
          <p
            role="alert"
            className="text-red-400 text-sm bg-red-900/30 border border-red-700/60 rounded-lg px-3 py-2"
          >
            {state.error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-slate-600 text-slate-300 hover:text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px]"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={pending}
            className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors min-h-[44px]"
          >
            {pending ? "Guardando…" : tipo === "suspender" ? "Suspender cuenta" : "Condonar mora"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

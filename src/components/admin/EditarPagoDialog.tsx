"use client";

import { useState, useActionState, useTransition } from "react";
import { editarPago, anularPago } from "@/app/admin/pagos/actions";
import { METODOS } from "@/lib/constants/payment";

interface Pago {
  id: string;
  mes: number;
  anio: number;
  importe: number;
  estado: string;
  metodo: string | null;
  cuentaNombre: string;
  cuentaDesc: string;
}

interface Props {
  pago: Pago;
}

const MESES = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const ESTADOS = [
  { value: "PENDIENTE",  label: "Pendiente" },
  { value: "PAGADO",     label: "Pagado" },
  { value: "VENCIDO",    label: "Vencido" },
  { value: "PROCESANDO", label: "Procesando" },
];

const METODOS_CON_VACIO = [{ value: "", label: "Sin método" }, ...METODOS];

const inputCls = "w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-2 focus:outline-orange-500";

export function EditarPagoDialog({ pago }: Props) {
  const [open, setOpen] = useState(false);
  const [confirmAnular, setConfirmAnular] = useState(false);
  const [anularPending, startAnular] = useTransition();
  const [state, action, pending] = useActionState(editarPago, {});

  function handleAnular() {
    startAnular(async () => {
      await anularPago(pago.id);
      setOpen(false);
    });
  }

  return (
    <>
      <button
        onClick={() => { setOpen(true); setConfirmAnular(false); }}
        aria-label={`Editar pago ${MESES[pago.mes]}/${pago.anio} de ${pago.cuentaNombre}`}
        className="text-xs text-slate-400 hover:text-white transition-colors px-2 py-1.5 rounded min-h-[36px] flex items-center"
      >
        Editar
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="editar-pago-title"
            className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm space-y-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 id="editar-pago-title" className="text-base font-bold text-white">Editar pago</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {pago.cuentaNombre} · {pago.cuentaDesc} · {MESES[pago.mes]}/{pago.anio}
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Cerrar diálogo"
                className="text-slate-500 hover:text-white text-lg leading-none min-h-[36px] min-w-[36px] flex items-center justify-center rounded"
              >
                ×
              </button>
            </div>

            {state.ok && (
              <p role="status" className="text-green-400 text-sm bg-green-900/30 border border-green-800 rounded-lg px-3 py-2">
                Pago actualizado.
              </p>
            )}
            {state.errores && (
              <div role="alert" className="bg-amber-900/30 border border-amber-700/60 text-amber-200 rounded-lg p-3 text-sm">
                {state.errores.map((e) => <p key={e}>{e}</p>)}
              </div>
            )}

            <form action={action} className="space-y-3">
              <input type="hidden" name="pago_id" value={pago.id} />

              <div>
                <label htmlFor="ep-estado" className="block text-xs font-semibold text-slate-400 mb-1.5">Estado</label>
                <select id="ep-estado" name="estado" defaultValue={pago.estado} autoFocus className={inputCls}>
                  {ESTADOS.map((e) => (
                    <option key={e.value} value={e.value}>{e.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="ep-importe" className="block text-xs font-semibold text-slate-400 mb-1.5">Importe (ARS)</label>
                <input
                  id="ep-importe"
                  name="importe"
                  type="number"
                  min="0"
                  step="100"
                  required
                  defaultValue={pago.importe}
                  className={inputCls}
                />
              </div>

              <div>
                <label htmlFor="ep-metodo" className="block text-xs font-semibold text-slate-400 mb-1.5">Método de pago</label>
                <select id="ep-metodo" name="metodo" defaultValue={pago.metodo ?? ""} className={inputCls}>
                  {METODOS_CON_VACIO.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={pending}
                  className="flex-1 text-sm font-semibold bg-orange-500 hover:bg-orange-400 disabled:opacity-60 text-slate-900 px-4 py-2.5 rounded-lg transition-colors"
                >
                  {pending ? "Guardando…" : "Guardar"}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-sm bg-slate-700 hover:bg-slate-600 text-white px-4 py-2.5 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>

            {/* Zona de anulación */}
            <div className="border-t border-slate-700 pt-3">
              {!confirmAnular ? (
                <button
                  onClick={() => setConfirmAnular(true)}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors px-2 py-1.5 rounded min-h-[36px] flex items-center"
                >
                  Anular pago…
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-red-300">
                    Esto elimina el registro. ¿Confirmar?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAnular}
                      disabled={anularPending}
                      className="text-xs font-semibold bg-red-700 hover:bg-red-600 disabled:opacity-60 text-white px-3 py-2 rounded-lg transition-colors min-h-[36px]"
                    >
                      {anularPending ? "Anulando…" : "Sí, anular"}
                    </button>
                    <button
                      onClick={() => setConfirmAnular(false)}
                      className="text-xs text-slate-400 hover:text-white transition-colors px-3 py-2 rounded min-h-[36px]"
                    >
                      No
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

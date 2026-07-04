"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import Textarea from "@/components/ui/Textarea";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { solicitarCambioTurno, cancelarSolicitudCambioTurno } from "@/lib/actions/turnos";
import { MOTIVO_MIN, MOTIVO_MAX } from "@/lib/turnos-cambio";

interface Companero {
  id: string;
  nombre: string;
}

interface Props {
  turnoId: string;
  fechaLabel: string;
  franjaLabel: string;
  companeros: Companero[];
  /** Si el turno ya tiene una solicitud PENDIENTE, se ofrece cancelarla. */
  solicitudPendienteId?: string;
}

export function SolicitarCambioTurnoDialog({
  turnoId,
  fechaLabel,
  franjaLabel,
  companeros,
  solicitudPendienteId,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [reemplazoId, setReemplazoId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (solicitudPendienteId) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-amber-300">Cambio solicitado</span>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const r = await cancelarSolicitudCambioTurno(solicitudPendienteId);
              if ("error" in r) setError(r.error);
              else router.refresh();
            })
          }
          className="text-xs font-semibold text-slate-400 hover:text-white underline underline-offset-2 min-h-[44px] px-1 transition-colors disabled:opacity-50"
        >
          Cancelar pedido
        </button>
        {error && (
          <span role="alert" className="text-xs text-red-400">
            {error}
          </span>
        )}
      </div>
    );
  }

  function enviar() {
    setError(null);
    startTransition(async () => {
      const r = await solicitarCambioTurno({
        turnoId,
        motivo,
        reemplazoId: reemplazoId || undefined,
      });
      if ("error" in r) {
        setError(r.error);
      } else {
        setOpen(false);
        setMotivo("");
        setReemplazoId("");
        router.refresh();
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-semibold text-orange-400 hover:text-orange-300 min-h-[44px] px-1 transition-colors"
      >
        Pedir cambio
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Pedir cambio de turno"
        description={`${fechaLabel} · ${franjaLabel}`}
        size="sm"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="motivo-cambio" className="text-sm font-bold text-slate-200">
              Motivo
            </label>
            <Textarea
              id="motivo-cambio"
              placeholder="Contanos por qué necesitás el cambio…"
              className="h-24"
              value={motivo}
              minLength={MOTIVO_MIN}
              maxLength={MOTIVO_MAX}
              onChange={(e) => setMotivo(e.target.value)}
              error={error ?? undefined}
            />
          </div>

          {companeros.length > 0 && (
            <div className="space-y-2">
              <label htmlFor="reemplazo-cambio" className="text-sm font-bold text-slate-200">
                Compañero propuesto <span className="font-normal text-slate-400">(opcional)</span>
              </label>
              <Select
                id="reemplazo-cambio"
                value={reemplazoId}
                onChange={(e) => setReemplazoId(e.target.value)}
              >
                <option value="">Que lo decida el admin</option>
                {companeros.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </Select>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-sm text-slate-400 hover:text-white min-h-[44px] px-3 transition-colors"
            >
              Volver
            </button>
            <Button type="button" onClick={enviar} isLoading={pending} loadingText="Enviando…">
              Enviar solicitud
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

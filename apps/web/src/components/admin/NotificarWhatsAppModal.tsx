"use client";

/**
 * Notificación de evento(s) por WhatsApp — cualquier criticidad (P1/P2/resto).
 *
 * Wrapper sobre `MensajeClienteModal`: arma el header, el mensaje pre-escrito (una o
 * varias zonas de la MISMA cuenta disparadas en ventana corta) con el tono acorde a la
 * prioridad, y el payload de auditoría, y delega el flujo wa.me.
 * Contrato { evento, onClose } + `eventosGrupo` opcional.
 */

import { useCallback, useMemo } from "react";
import { MensajeClienteModal } from "./MensajeClienteModal";
import { prioridadStyle, horaConDia } from "./eventos-live";
import { mensajeEvento, categoriaEvento, type CategoriaEvento } from "@/lib/whatsapp";
import type { MotivoMensaje } from "@/lib/whatsapp-templates";
import type { EventoLive } from "@/app/api/admin/eventos-live/route";
import type { WebContactoCuenta } from "@/lib/softguard/api";

/** Etiqueta, color y motivo de auditoría por criticidad (para header y audit payload). */
const CATEGORIA_UI: Record<CategoriaEvento, { etiqueta: string; color: string; motivo: MotivoMensaje }> = {
  critica: { etiqueta: "Prioridad alta", color: "text-red-300", motivo: "EVENTO_P1" },
  media: { etiqueta: "Prioridad media", color: "text-amber-300", motivo: "EVENTO_P2" },
  otra: { etiqueta: "Evento", color: "text-slate-400", motivo: "EVENTO_OTRO" },
};

export function NotificarWhatsAppModal({
  evento,
  eventosGrupo,
  onClose,
}: {
  evento: EventoLive;
  eventosGrupo?: EventoLive[];
  onClose: () => void;
}) {
  const grupo = useMemo(
    () => (eventosGrupo && eventosGrupo.length ? eventosGrupo : [evento]),
    [eventosGrupo, evento],
  );
  const p = prioridadStyle(evento.prioridad);
  const cat = CATEGORIA_UI[categoriaEvento(evento.prioridad)];

  const construirMensaje = useCallback(
    (c: WebContactoCuenta) =>
      mensajeEvento({
        prioridad: evento.prioridad,
        nombreContacto: c.nombre,
        eventos: grupo.map((e) => ({ descripcion: e.descripcion, zona: e.zona })),
        fechaISO: grupo[grupo.length - 1].fecha, // el más reciente (grupo ordenado asc)
      }),
    [grupo, evento.prioridad],
  );

  const resumenHeader =
    grupo.length > 1 ? (
      <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-3">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold uppercase tracking-widest ${cat.color}`}>{cat.etiqueta}</span>
          <span className="text-[10px] text-slate-400">· {grupo.length} eventos de esta cuenta</span>
        </div>
        <ul className="mt-2 space-y-1">
          {grupo.map((e) => (
            <li key={e.id} className="flex items-center gap-2 text-[11px]">
              <span className={`font-mono font-bold rounded border px-1 py-px ${prioridadStyle(e.prioridad).badge}`}>
                {e.codigo}
              </span>
              <span className="min-w-0 truncate text-slate-200">
                {e.descripcion}
                {e.zona ? ` · zona ${e.zona}` : ""}
              </span>
              <span className="ml-auto shrink-0 text-slate-500">{horaConDia(e.fecha)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[10px] text-slate-500">
          #{evento.softguard_ref} · {evento.titular} · se notifican juntos
        </p>
      </div>
    ) : (
      <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-3">
        <div className="flex items-center gap-2">
          <span className={`font-mono text-[10px] font-bold rounded border px-1.5 py-px ${p.badge}`}>
            {evento.codigo}
          </span>
          <span className={`text-[10px] font-bold uppercase tracking-widest ${cat.color}`}>{cat.etiqueta}</span>
        </div>
        <p className={`text-sm font-semibold mt-2 ${p.texto}`}>{evento.descripcion}</p>
        <p className="text-[11px] text-slate-500 mt-0.5">
          #{evento.softguard_ref} · {evento.titular} · {horaConDia(evento.fecha)}
          {evento.zona && <span> · zona {evento.zona}</span>}
        </p>
      </div>
    );

  return (
    <MensajeClienteModal
      tituloModal="Notificar por WhatsApp"
      resumenHeader={resumenHeader}
      fuente={{ modo: "resolver", ref: evento.softguard_ref, iid: evento.iid_cuenta }}
      construirMensaje={construirMensaje}
      auditPayload={{
        accion: "NOTIFICAR_WHATSAPP",
        entidad: "evento_alarma",
        entidad_id: evento.id,
        motivo: cat.motivo,
        detalle: {
          softguard_ref: evento.softguard_ref,
          codigo: evento.codigo,
          eventos_agrupados: grupo.length,
        },
      }}
      onClose={onClose}
    />
  );
}

export default NotificarWhatsAppModal;

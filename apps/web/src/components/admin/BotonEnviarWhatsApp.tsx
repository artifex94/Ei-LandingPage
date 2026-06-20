"use client";

/**
 * Botón de outreach al cliente por WhatsApp (pagos/cobranza), reutilizable en
 * morosidad, detalle de cuenta y detalle de cliente.
 *
 * Recibe los motivos con sus textos YA construidos (server-side, ver
 * `lib/mensajeria-motivos.ts`) y monta `MensajeClienteModal` en modo "directo"
 * (el destinatario es el titular, Perfil.telefono — no hace falta resolver el CRM).
 */

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { MensajeClienteModal } from "./MensajeClienteModal";
import type { MotivoOpcion } from "@/lib/mensajeria-motivos";

export function BotonEnviarWhatsApp({
  destinatario,
  motivos,
  historial,
  entidad,
  entidadId,
  subtitulo,
  label = "WhatsApp",
}: {
  destinatario: { nombre: string; telefono: string | null };
  motivos: MotivoOpcion[];
  historial: { perfilId: string; cuentaId?: string | null };
  entidad: string;
  entidadId: string;
  subtitulo?: string;
  label?: string;
}) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [elegido, setElegido] = useState<MotivoOpcion | null>(null);

  if (!destinatario.telefono || motivos.length === 0) return null;

  function activar() {
    if (motivos.length === 1) setElegido(motivos[0]);
    else setMenuAbierto((v) => !v);
  }

  const resumenHeader = (
    <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-3">
      <p className="text-sm font-semibold text-white">{destinatario.nombre}</p>
      {subtitulo && <p className="text-[11px] text-slate-500 mt-0.5">{subtitulo}</p>}
    </div>
  );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={activar}
        className="bg-green-700 hover:bg-green-600 text-white font-semibold text-sm px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 min-h-[44px]"
        title="Enviar mensaje por WhatsApp"
      >
        <MessageCircle className="w-4 h-4" aria-hidden="true" />
        {label}
      </button>

      {menuAbierto && motivos.length > 1 && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setMenuAbierto(false)} aria-hidden="true" />
          <ul className="absolute right-0 z-20 mt-1 w-56 rounded-lg border border-slate-700 bg-slate-800 shadow-xl py-1">
            {motivos.map((m) => (
              <li key={m.motivo}>
                <button
                  type="button"
                  onClick={() => {
                    setElegido(m);
                    setMenuAbierto(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 transition-colors"
                >
                  {m.label}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {elegido && (
        <MensajeClienteModal
          tituloModal={elegido.label}
          resumenHeader={resumenHeader}
          fuente={{
            modo: "directo",
            destinatarios: [
              { nombre: destinatario.nombre, telefono: destinatario.telefono, rol: "Titular", orden: 0 },
            ],
          }}
          construirMensaje={() => elegido.mensaje}
          auditPayload={{
            accion: "MENSAJE_CLIENTE_WA",
            entidad,
            entidad_id: entidadId,
            motivo: elegido.motivo,
            detalle: { label: elegido.label },
          }}
          historial={historial}
          onClose={() => setElegido(null)}
        />
      )}
    </div>
  );
}

export default BotonEnviarWhatsApp;

"use client";

/**
 * Wizard GENÉRICO de mensajería al cliente por WhatsApp (wa.me).
 *
 * Motor reutilizable: el caller arma el header (`resumenHeader`), el texto inicial
 * (`construirMensaje`) y el payload de auditoría/historial. Soporta dos modos de
 * destinatario:
 *   - "resolver": carga contactos de una cuenta vía /api/admin/contactos-cuenta
 *                 (eventos P1 / CRM, con paso de selección si hay varios).
 *   - "directo":  el caller ya tiene el contacto (pagos → Perfil.telefono). Sin fetch.
 *
 * El envío real lo confirma el operador en WhatsApp Web/Desktop: NO se usa la API.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, MessageCircle, Phone, Users } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Textarea from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { linkWhatsApp } from "@/lib/whatsapp";
import { registrarNotificacionWA } from "@/lib/actions/notificacion-wa";
import type { MotivoMensaje } from "@/lib/whatsapp-templates";
import type { ContactosCuentaResponse } from "@/app/api/admin/contactos-cuenta/route";
import type { WebContactoCuenta } from "@/lib/softguard/api";

export type FuenteDestinatarios =
  | { modo: "resolver"; ref?: string; iid?: number }
  | { modo: "directo"; destinatarios: WebContactoCuenta[] };

export interface AuditPayload {
  accion: string;
  entidad: string;
  entidad_id: string;
  motivo: MotivoMensaje;
  detalle?: Record<string, unknown>;
}

type EstadoContactos =
  | { tipo: "cargando" }
  | { tipo: "error" }
  | { tipo: "ok"; contactos: WebContactoCuenta[]; fuenteFallback: boolean };

export function MensajeClienteModal({
  tituloModal,
  resumenHeader,
  fuente,
  construirMensaje,
  auditPayload,
  historial,
  onClose,
}: {
  tituloModal: string;
  resumenHeader: React.ReactNode;
  fuente: FuenteDestinatarios;
  construirMensaje: (contacto: WebContactoCuenta) => string;
  auditPayload: AuditPayload;
  historial?: { perfilId: string; cuentaId?: string | null };
  onClose: () => void;
}) {
  const toast = useToast();

  // construirMensaje puede no ser estable entre renders → lo guardamos en un ref
  // para que `seleccionar` sea estable y el efecto de resolución corra una sola vez.
  const construirMensajeRef = useRef(construirMensaje);
  useEffect(() => {
    construirMensajeRef.current = construirMensaje;
  }, [construirMensaje]);

  // En modo directo, el destinatario único auto-selecciona desde el estado inicial.
  const directoUnico =
    fuente.modo === "directo" && fuente.destinatarios.length === 1 ? fuente.destinatarios[0] : null;

  const [contactos, setContactos] = useState<EstadoContactos>(() =>
    fuente.modo === "directo"
      ? { tipo: "ok", contactos: fuente.destinatarios, fuenteFallback: false }
      : { tipo: "cargando" },
  );
  const [paso, setPaso] = useState<"seleccion" | "preview">(directoUnico ? "preview" : "seleccion");
  const [elegido, setElegido] = useState<WebContactoCuenta | null>(directoUnico);
  const [mensaje, setMensaje] = useState(directoUnico ? construirMensaje(directoUnico) : "");
  const [registrando, setRegistrando] = useState(false);

  const seleccionar = useCallback((c: WebContactoCuenta) => {
    setElegido(c);
    setMensaje(construirMensajeRef.current(c));
    setPaso("preview");
  }, []);

  // Solo en modo "resolver": cargar contactos de la cuenta.
  const debeResolver = fuente.modo === "resolver";
  const refResolver = fuente.modo === "resolver" ? fuente.ref ?? "" : "";
  const iidResolver = fuente.modo === "resolver" ? fuente.iid ?? 0 : 0;

  useEffect(() => {
    if (!debeResolver) return;
    let cancelado = false;
    queueMicrotask(() => {
      if (cancelado) return;
      setContactos({ tipo: "cargando" });
      const params = new URLSearchParams();
      if (refResolver) params.set("ref", refResolver);
      if (iidResolver) params.set("iid", String(iidResolver));
      fetch(`/api/admin/contactos-cuenta?${params.toString()}`, { cache: "no-store" })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json() as Promise<ContactosCuentaResponse>;
        })
        .then((data) => {
          if (cancelado) return;
          setContactos({ tipo: "ok", contactos: data.contactos, fuenteFallback: data.fuente === "perfil" });
          if (data.contactos.length === 1) seleccionar(data.contactos[0]);
        })
        .catch(() => {
          if (!cancelado) setContactos({ tipo: "error" });
        });
    });
    return () => {
      cancelado = true;
    };
  }, [debeResolver, refResolver, iidResolver, seleccionar]);

  async function abrirWhatsApp() {
    if (registrando || !elegido?.telefono) return; // evita doble click / doble registro
    const url = linkWhatsApp(elegido.telefono, mensaje);
    if (!url) {
      toast({ variant: "error", title: "Teléfono inválido", description: "No se pudo armar el link de WhatsApp." });
      return;
    }
    setRegistrando(true);
    // Abrir DENTRO del gesto del usuario (evita el bloqueo de popups del navegador).
    window.open(url, "_blank");
    try {
      await registrarNotificacionWA({
        accion: auditPayload.accion,
        entidad: auditPayload.entidad,
        entidad_id: auditPayload.entidad_id,
        motivo: auditPayload.motivo,
        detalle: auditPayload.detalle,
        destino: elegido.telefono,
        cuerpoResumen: mensaje,
        historial,
      });
    } catch {
      // best-effort: la auditoría/historial nunca debe frenar la notificación
    }
    setRegistrando(false);
    toast({ variant: "success", title: "WhatsApp abierto", description: `Notificación para ${elegido.nombre}.` });
    onClose();
  }

  const variosContactos = contactos.tipo === "ok" && contactos.contactos.length > 1;

  return (
    <Modal open onClose={onClose} size="md" title={tituloModal}>
      <div className="mt-2">{resumenHeader}</div>

      {/* Paso: selección de contacto */}
      {paso === "seleccion" && (
        <div className="mt-4">
          {contactos.tipo === "cargando" && (
            <div className="space-y-2" aria-hidden="true">
              {[0, 1].map((i) => (
                <div key={i} className="h-12 rounded bg-slate-800/60 animate-pulse" />
              ))}
            </div>
          )}
          {contactos.tipo === "error" && (
            <p className="text-sm text-red-400/80 py-2">No se pudieron cargar los contactos. Cerrá y reintentá.</p>
          )}
          {contactos.tipo === "ok" && contactos.contactos.length === 0 && (
            <p className="text-sm text-slate-400 py-2">Este cliente no tiene un teléfono de contacto cargado.</p>
          )}
          {variosContactos && contactos.tipo === "ok" && (
            <>
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                <Users className="w-3 h-3" aria-hidden="true" /> Elegí a quién notificar
              </p>
              <ul className="space-y-2">
                {contactos.contactos.map((c, i) => (
                  <li key={`${c.telefono ?? "s"}-${i}`}>
                    <button
                      type="button"
                      disabled={!c.telefono}
                      onClick={() => seleccionar(c)}
                      className="w-full flex items-center gap-3 text-left rounded-lg border border-slate-700 bg-slate-900/40 hover:bg-slate-700/50 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-2.5 transition-colors"
                    >
                      <Phone className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-white truncate">{c.nombre || "Sin nombre"}</span>
                        <span className="block text-[11px] text-slate-500 truncate">
                          {c.telefono ?? "sin teléfono"}
                          {c.rol && <span className="text-slate-600"> · {c.rol}</span>}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {contactos.fuenteFallback && (
                <p className="text-[11px] text-slate-600 mt-2">Contacto del portal (la central no devolvió contactos).</p>
              )}
            </>
          )}
        </div>
      )}

      {/* Paso: preview del mensaje */}
      {paso === "preview" && elegido && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-white min-w-0">
              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
              <span className="truncate">{elegido.nombre || "Contacto"}</span>
              <span className="text-slate-500 font-normal shrink-0">· {elegido.telefono}</span>
            </p>
            {variosContactos && (
              <button
                type="button"
                onClick={() => setPaso("seleccion")}
                className="shrink-0 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-3 h-3" aria-hidden="true" /> Cambiar
              </button>
            )}
          </div>
          <Textarea value={mensaje} onChange={(e) => setMensaje(e.target.value)} rows={8} aria-label="Mensaje a enviar" />
          <Button
            onClick={abrirWhatsApp}
            isLoading={registrando}
            loadingText="Abriendo…"
            disabled={!elegido.telefono || !mensaje.trim()}
          >
            <MessageCircle className="w-4 h-4" aria-hidden="true" /> Abrir WhatsApp
          </Button>
          <p className="text-[11px] text-slate-600 text-center">
            Se abre WhatsApp con el mensaje listo. El envío lo confirmás vos en WhatsApp.
          </p>
        </div>
      )}
    </Modal>
  );
}

export default MensajeClienteModal;

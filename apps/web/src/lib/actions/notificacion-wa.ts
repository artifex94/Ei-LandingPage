"use server";

import { requireCapacidad } from "@/lib/auth/session";
import { registrarAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma/client";
import { ETIQUETA_MOTIVO, type MotivoMensaje } from "@/lib/whatsapp-templates";

// Origen del registro según el motivo. Solo COBRANZA cuenta como "contacto de cobranza"
// para el worklist/badge — confirmaciones y mensajes libres NO marcan al moroso como
// contactado, y los eventos P1 son de SOFTGUARD.
const ORIGEN_POR_MOTIVO: Record<MotivoMensaje, "SOFTGUARD" | "PORTAL" | "COBRANZA"> = {
  EVENTO_P1: "SOFTGUARD",
  EVENTO_P2: "SOFTGUARD",
  EVENTO_OTRO: "SOFTGUARD",
  RECORDATORIO_PAGO: "COBRANZA",
  VENCIMIENTO_PROXIMO: "COBRANZA",
  MORA_SUSPENSION: "COBRANZA",
  CONFIRMACION_PAGO: "PORTAL",
  CAMBIO_TARIFA: "PORTAL",
  REACTIVACION_SERVICIO: "PORTAL",
  BIENVENIDA: "PORTAL",
  VISITA_TECNICA: "PORTAL",
  PRUEBA_ALARMA: "PORTAL",
  SIN_COMUNICACION: "PORTAL",
  ACTUALIZAR_DATOS: "PORTAL",
  AVISO_GENERAL: "PORTAL",
  LIBRE: "PORTAL",
};

/**
 * Registra que un admin generó un link wa.me hacia un cliente (auditoría + historial).
 *
 * wa.me es client-side y no confirma la entrega: esto registra "se generó/abrió el
 * link de WhatsApp", NO "se envió el mensaje". Best-effort: nunca frena la notificación.
 *
 * Genérico por motivo: lo usan tanto el wizard de eventos P1 (sin historial de cliente)
 * como el hub de mensajería de pagos (con `historial` → fila en NotificacionCliente,
 * canal "WHATSAPP_WALINK" para distinguirlo del cron Twilio automático ("whatsapp")).
 */
export async function registrarNotificacionWA(input: {
  accion: string;
  entidad: string;
  entidad_id: string;
  motivo: MotivoMensaje;
  destino: string;
  cuerpoResumen: string;
  detalle?: Record<string, unknown>;
  historial?: { perfilId: string; cuentaId?: string | null };
}): Promise<void> {
  // Genérico: lo usan cobranza (puede_facturar) y avisos de eventos (puede_monitorear).
  const admin = await requireCapacidad("puede_facturar", "puede_monitorear");

  await registrarAudit({
    admin_id: admin.id,
    admin_nombre: admin.nombre,
    accion: input.accion,
    entidad: input.entidad,
    entidad_id: input.entidad_id,
    detalle: {
      motivo: input.motivo,
      contacto: input.destino,
      ...input.detalle,
      nota: "Se generó/abrió el link wa.me (no confirma envío)",
    },
  });

  // Historial de contacto con el cliente (alimenta el worklist de cobranza del hub).
  if (input.historial?.perfilId) {
    try {
      await prisma.notificacionCliente.create({
        data: {
          perfil_id: input.historial.perfilId,
          cuenta_id: input.historial.cuentaId ?? null,
          origen: ORIGEN_POR_MOTIVO[input.motivo],
          canal: "WHATSAPP_WALINK",
          destino: input.destino,
          asunto: ETIQUETA_MOTIVO[input.motivo],
          cuerpo_resumen: input.cuerpoResumen.slice(0, 200),
          estado: "ENVIADA",
          fecha_envio: new Date(),
          ref_externa: `walink-${input.historial.perfilId}-${Date.now()}`,
        },
      });
    } catch {
      // best-effort: el historial nunca debe frenar la notificación
    }
  }
}

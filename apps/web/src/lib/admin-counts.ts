import "server-only";
import { prisma } from "@/lib/prisma/client";

export interface PendientesAdmin {
  pendingSolicitudes: number;
  pendingMantenimiento: number;
  cuentasEnMora: number;
  otsPendientes: number;
  altasUsuarioPendientes: number;
  eventosSinProcesar: number;
  morososSinContactar: number;
  feedbackPendiente: number;
}

interface FilaCounts {
  pending_solicitudes: number;
  pending_mantenimiento: number;
  cuentas_en_mora: number;
  ots_pendientes: number;
  altas_pendientes: number;
  eventos_sin_procesar: number;
  morosos_sin_contactar: number;
}

/**
 * Counts de pendientes para los badges del layout admin, consolidados en un
 * solo roundtrip a la BD (subqueries escalares) en lugar de 8 queries
 * paralelas que compiten por conexiones del pool. Medido en prod: el bloque
 * paralelo daba mediana ~142ms con picos de 350ms; esta versión ~79ms estable.
 *
 * Los WHERE replican 1:1 los filtros previos de Prisma del layout. En
 * particular, "morosos sin contactar" usa el mismo criterio de mora que
 * /admin/morosidad y /admin/mensajeria (VENCIDO o PENDIENTE de un mes
 * anterior), para que el badge no subestime respecto del hub.
 */
export async function contarPendientesAdmin(): Promise<PendientesAdmin> {
  const hace3dias = new Date();
  hace3dias.setDate(hace3dias.getDate() - 3);

  const ahora = new Date();
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  const mesActual = ahora.getMonth() + 1;
  const anioActual = ahora.getFullYear();

  const [filas, feedbackPendiente] = await Promise.all([
    prisma.$queryRaw<FilaCounts[]>`
      SELECT
        (SELECT count(*) FROM solicitudes_cambio_info
          WHERE estado = 'PENDIENTE')::int AS pending_solicitudes,
        (SELECT count(*) FROM solicitudes_mantenimiento
          WHERE estado <> 'RESUELTA')::int AS pending_mantenimiento,
        (SELECT count(*) FROM cuentas c WHERE EXISTS (
          SELECT 1 FROM pagos p WHERE p.cuenta_id = c.id AND p.estado = 'VENCIDO'
        ))::int AS cuentas_en_mora,
        (SELECT count(*) FROM ordenes_trabajo
          WHERE estado NOT IN ('COMPLETADA', 'CANCELADA') AND (
            (fecha_visita < now()
              AND estado NOT IN ('COMPLETADA', 'CANCELADA', 'EN_SITIO', 'EN_RUTA'))
            OR (estado = 'SOLICITADA' AND created_at < ${hace3dias})
          ))::int AS ots_pendientes,
        (SELECT count(*) FROM altas_usuario
          WHERE estado = 'PENDIENTE')::int AS altas_pendientes,
        (SELECT count(*) FROM eventos_alarma
          WHERE estado = 'NUEVO')::int AS eventos_sin_procesar,
        (SELECT count(DISTINCT c.perfil_id) FROM cuentas c
          WHERE c.estado <> 'BAJA_DEFINITIVA'
            AND EXISTS (
              SELECT 1 FROM pagos p WHERE p.cuenta_id = c.id AND (
                p.estado = 'VENCIDO'
                OR (p.estado = 'PENDIENTE' AND (
                  p.anio < ${anioActual}
                  OR (p.anio = ${anioActual} AND p.mes < ${mesActual})
                ))
              )
            )
            AND c.perfil_id NOT IN (
              SELECT n.perfil_id FROM notificaciones_cliente n
              WHERE n.origen = 'COBRANZA'
                AND n.canal = 'WHATSAPP_WALINK'
                AND n.fecha_envio >= ${inicioMes}
            ))::int AS morosos_sin_contactar
    `,
    // `.catch(() => 0)`: pre-migración (SQL manual sin correr todavía) la
    // tabla tickets_feedback puede no existir aún.
    prisma.ticketFeedback
      .count({ where: { estado: { in: ["NUEVO", "EN_REVISION"] } } })
      .catch(() => 0),
  ]);

  const fila = filas[0];
  return {
    pendingSolicitudes: fila.pending_solicitudes,
    pendingMantenimiento: fila.pending_mantenimiento,
    cuentasEnMora: fila.cuentas_en_mora,
    otsPendientes: fila.ots_pendientes,
    altasUsuarioPendientes: fila.altas_pendientes,
    eventosSinProcesar: fila.eventos_sin_procesar,
    morososSinContactar: fila.morosos_sin_contactar,
    feedbackPendiente,
  };
}

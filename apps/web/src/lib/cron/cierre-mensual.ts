import type { PrismaClient } from "@/generated/prisma/client";
import { enviarWhatsApp, enviarWhatsAppTemplate } from "@/lib/twilio";
import { prepararBorradoresFactura } from "@/lib/facturacion/preparar-borradores";
import { TARIFA_FALLBACK_PESOS, DIAS_SUSPENSION } from "@/lib/constants/billing";
import { calcDPD } from "@/lib/billing-state";
import { decidirCandidatoSuspension } from "@/lib/candidato-suspension";
import { getParam } from "@/lib/parametros";

/**
 * Cierre mensual — fuente ÚNICA de verdad del proceso del día 1 de cada mes.
 *
 * Antes existían dos implementaciones divergentes (scripts/cron-mensual.ts y
 * app/api/cron/route.ts) que se desincronizaban. Ahora ambas son wrappers
 * delgados sobre esta función; solo cambian el adapter (CLI vs HTTP).
 *
 * Pasos:
 *   0. Revierte/limpia overrides de suspensión expirados.
 *   1. Crea pagos PENDIENTE del mes para cada cuenta ACTIVA (idempotente).
 *   2. Marca VENCIDO los PENDIENTE de meses anteriores.
 *   3. Notifica por WhatsApp a morosos (idempotente: no re-avisa este mes).
 *   4. Genera/actualiza la cola "A suspender hoy" (CandidatoSuspension); la
 *      suspensión real la decide siempre un humano desde /cobros.
 *   5. Prepara borradores de factura del período.
 *
 * Recibe el cliente Prisma por parámetro para no acoplarse al entry point.
 */

const MESES_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

type Logger = (msg: string) => void;
const noop: Logger = () => {};

export interface ResumenCierreMensual {
  mes: number;
  anio: number;
  overridesRevertidos: number;
  overridesLimpiados: number;
  pagosCreados: number;
  marcadosVencidos: number;
  notificados: number;
  yaAvisados: number;
  sinTelefono: number;
  erroresEnvio: number;
  candidatosSuspensionCreados: number;
  candidatosSuspensionActualizados: number;
  candidatosSuspensionCerradosPago: number;
  /** Mensaje si el paso 4 (cola de suspensión) falló y se omitió — best-effort, no aborta el cron. */
  candidatosSuspensionError: string | null;
  facturasBorradores: number;
  facturasOmitidas: number;
}

export async function ejecutarCierreMensual(
  prisma: PrismaClient,
  log: Logger = noop,
): Promise<ResumenCierreMensual> {
  const ahora = new Date();
  const mes = ahora.getMonth() + 1;
  const anio = ahora.getFullYear();

  log(`🗓  Cierre mensual — ${MESES_ES[mes - 1]} ${anio}`);

  // ── 0. Overrides de suspensión expirados ──────────────────────────────────
  const overridesExpirados = await prisma.cuenta.findMany({
    where: { override_activo: true, override_expira: { lt: ahora } },
    select: {
      id: true,
      estado: true,
      descripcion: true,
      pagos: {
        where: { estado: { in: ["PENDIENTE", "VENCIDO"] } },
        select: { id: true },
      },
    },
  });

  let overridesRevertidos = 0;
  let overridesLimpiados = 0;

  for (const cuenta of overridesExpirados) {
    const tieneDeuda = cuenta.pagos.length > 0;

    // Cambio de estado + auditoría atómicos: nunca queda la cuenta modificada
    // sin su registro de auditoría (ni al revés).
    await prisma.$transaction(async (tx) => {
      await tx.cuenta.update({
        where: { id: cuenta.id },
        data: {
          ...(tieneDeuda ? { estado: "SUSPENDIDA_PAGO" as const } : {}),
          override_activo: false,
          override_expira: null,
          override_justificacion: null,
        },
      });

      await tx.auditLog.create({
        data: {
          admin_id: "system",
          admin_nombre: "Cron automático",
          accion: tieneDeuda ? "OVERRIDE_EXPIRED_SUSPENDED" : "OVERRIDE_EXPIRED_CLEAN",
          entidad: "cuenta",
          entidad_id: cuenta.id,
          detalle: JSON.stringify({ descripcion: cuenta.descripcion, deuda_pagos: cuenta.pagos.length }),
          state_transition: JSON.stringify({
            prior_state: "ACTIVE_OVERRIDE",
            new_state: tieneDeuda ? "SUSPENDIDA_PAGO" : cuenta.estado,
          }),
        },
      });
    });

    if (tieneDeuda) overridesRevertidos++;
    else overridesLimpiados++;
  }
  log(`🔒 Overrides expirados: ${overridesExpirados.length} (revertidos ${overridesRevertidos}, limpiados ${overridesLimpiados})`);

  // ── 1. Crear pagos PENDIENTE del mes (idempotente vía unique) ─────────────
  const [cuentasActivas, tarifaRow] = await Promise.all([
    prisma.cuenta.findMany({ where: { estado: "ACTIVA" }, select: { id: true, costo_mensual: true } }),
    prisma.tarifaHistorico.findFirst({ orderBy: { vigente_desde: "desc" } }),
  ]);
  const tarifaEstandar = tarifaRow?.monto ?? TARIFA_FALLBACK_PESOS;

  const { count: pagosCreados } = await prisma.pago.createMany({
    data: cuentasActivas.map((cuenta) => ({
      cuenta_id: cuenta.id,
      mes,
      anio,
      importe: cuenta.costo_mensual ?? tarifaEstandar,
      estado: "PENDIENTE" as const,
    })),
    skipDuplicates: true,
  });
  log(`📋 Pagos creados: ${pagosCreados} (de ${cuentasActivas.length} cuentas activas)`);

  // ── 2. Marcar VENCIDO los PENDIENTE de meses anteriores ───────────────────
  const { count: marcadosVencidos } = await prisma.pago.updateMany({
    where: {
      estado: "PENDIENTE",
      OR: [{ anio: { lt: anio } }, { anio, mes: { lt: mes } }],
    },
    data: { estado: "VENCIDO" },
  });
  log(`⏰ Pagos marcados VENCIDO: ${marcadosVencidos}`);

  // ── 3. Notificar por WhatsApp (idempotente) ───────────────────────────────
  const perfilesConDeuda = await prisma.perfil.findMany({
    where: {
      activo: true,
      telefono: { not: null },
      cuentas: {
        some: {
          estado: { not: "BAJA_DEFINITIVA" },
          pagos: { some: { estado: { in: ["PENDIENTE", "VENCIDO"] } } },
        },
      },
    },
    select: {
      id: true,
      nombre: true,
      telefono: true,
      cuentas: {
        where: { estado: { not: "BAJA_DEFINITIVA" } },
        select: {
          descripcion: true,
          pagos: {
            where: { estado: { in: ["PENDIENTE", "VENCIDO"] } },
            select: { mes: true, anio: true, estado: true, importe: true },
            orderBy: [{ anio: "asc" }, { mes: "asc" }],
          },
        },
      },
    },
  });

  // Clientes que YA recibieron el aviso AUTOMÁTICO este mes (solo ENVIADA; los FALLIDA se
  // reintentan). Filtra por canal "whatsapp" (Twilio) para NO confundirse con los avisos
  // manuales del hub de mensajería (canal "WHATSAPP_WALINK"), que no deben suprimir el cron.
  const inicioMes = new Date(anio, mes - 1, 1);
  const yaNotificados = new Set(
    (
      await prisma.notificacionCliente.findMany({
        where: { origen: "COBRANZA", canal: "whatsapp", estado: "ENVIADA", fecha_envio: { gte: inicioMes } },
        select: { perfil_id: true },
      })
    ).map((n) => n.perfil_id),
  );

  let notificados = 0;
  let yaAvisados = 0;
  let sinTelefono = 0;
  let erroresEnvio = 0;

  const morosidadTemplateSid = process.env.TWILIO_TEMPLATE_MOROSIDAD;

  for (const perfil of perfilesConDeuda) {
    if (!perfil.telefono) { sinTelefono++; continue; }
    if (yaNotificados.has(perfil.id)) { yaAvisados++; continue; }

    const todosPagos = perfil.cuentas.flatMap((c) => c.pagos);
    if (todosPagos.length === 0) continue;

    const nombre = perfil.nombre.split(" ")[0];
    let ok: boolean;

    if (morosidadTemplateSid) {
      const totalImporte = todosPagos.reduce((sum, p) => sum + Number(p.importe ?? 0), 0);
      const meses = [...new Set(todosPagos.map((p) => `${MESES_ES[p.mes - 1]} ${p.anio}`))].join(", ");
      ok = await enviarWhatsAppTemplate(perfil.telefono, morosidadTemplateSid, {
        "1": nombre,
        "2": new Intl.NumberFormat("es-AR").format(totalImporte),
        "3": meses,
      });
    } else {
      const lineas = perfil.cuentas.flatMap((cuenta) =>
        cuenta.pagos.map(
          (pago) =>
            `• ${cuenta.descripcion}: ${MESES_ES[pago.mes - 1]} ${pago.anio}${pago.estado === "VENCIDO" ? " (VENCIDO)" : ""}`,
        ),
      );
      ok = await enviarWhatsApp(
        perfil.telefono,
        `Hola ${nombre}! Te recordamos que tenés pagos pendientes en Escobar Instalaciones:\n\n` +
          lineas.join("\n") +
          `\n\nPodés abonar desde tu portal o al WhatsApp si necesitás ayuda.`,
      );
    }

    if (ok) notificados++; else erroresEnvio++;

    // Registrar el envío: habilita la idempotencia + deja historial de notificaciones.
    await prisma.notificacionCliente.create({
      data: {
        perfil_id: perfil.id,
        origen: "COBRANZA",
        canal: "whatsapp",
        destino: perfil.telefono,
        asunto: "Recordatorio de pago",
        cuerpo_resumen: `Aviso de morosidad: ${todosPagos.length} pago(s) pendiente(s)`,
        estado: ok ? "ENVIADA" : "FALLIDA",
        fecha_envio: new Date(),
        ref_externa: `cobranza-${perfil.id}-${anio}-${mes}`,
      },
    });

    log(ok ? `   ✓ ${perfil.nombre}` : `   ✗ ${perfil.nombre} — fallo de envío`);
  }
  log(`💬 Notificados: ${notificados} | ya avisados: ${yaAvisados} | sin tel: ${sinTelefono} | errores: ${erroresEnvio}`);

  // ── 4. Cola "A suspender hoy" (CandidatoSuspension) ────────────────────────
  // Recorre cuentas ACTIVA con pagos impagos (o que ya tenían un candidato
  // abierto, por si se saldó la deuda) y delega en `decidirCandidatoSuspension`
  // (función pura) qué hacer. La suspensión real (Cuenta.estado =
  // SUSPENDIDA_PAGO) es SIEMPRE decisión humana desde /cobros — acá solo se
  // arma/actualiza la cola visible.
  let candidatosSuspensionCreados = 0;
  let candidatosSuspensionActualizados = 0;
  let candidatosSuspensionCerradosPago = 0;
  let candidatosSuspensionError: string | null = null;

  // Best-effort: si `candidatos_suspension` todavía no existe en la DB (drift
  // conocido del repo — el SQL manual de sync puede estar pendiente), este
  // paso completo se omite SIN abortar el cron. Antes crasheaba acá y nunca
  // llegaba al paso 5 (borradores de factura), aunque los pagos y avisos del
  // paso 1-3 ya se hubieran generado/enviado — mismo espíritu best-effort que
  // `conRegistroCronRun`.
  try {
    const diasSuspension = await getParam("DIAS_SUSPENSION", DIAS_SUSPENSION);

    const cuentasParaEvaluar = await prisma.cuenta.findMany({
      where: {
        estado: "ACTIVA",
        OR: [
          { pagos: { some: { estado: { in: ["PENDIENTE", "VENCIDO"] } } } },
          { candidatos_suspension: { some: { resuelto_en: null } } },
        ],
      },
      select: {
        id: true,
        pagos: {
          where: { estado: { in: ["PENDIENTE", "VENCIDO"] } },
          select: { estado: true, mes: true, anio: true, importe: true },
        },
        candidatos_suspension: {
          where: { resuelto_en: null },
          select: { id: true, dpd: true, deuda_total: true },
        },
      },
    });

    for (const cuenta of cuentasParaEvaluar) {
      const dpd = calcDPD(cuenta.pagos);
      const deudaTotal = cuenta.pagos.reduce((s, p) => s + Number(p.importe), 0);
      const [abierto] = cuenta.candidatos_suspension;
      const decision = decidirCandidatoSuspension(
        dpd,
        deudaTotal,
        diasSuspension,
        abierto ? { id: abierto.id, dpd: abierto.dpd, deuda_total: Number(abierto.deuda_total) } : null,
      );

      if (decision.tipo === "CREAR") {
        await prisma.candidatoSuspension.create({
          data: { cuenta_id: cuenta.id, dpd: decision.dpd, deuda_total: decision.deuda_total },
        });
        candidatosSuspensionCreados++;
      } else if (decision.tipo === "ACTUALIZAR") {
        await prisma.candidatoSuspension.update({
          where: { id: decision.id },
          data: { dpd: decision.dpd, deuda_total: decision.deuda_total },
        });
        candidatosSuspensionActualizados++;
      } else if (decision.tipo === "CERRAR_PAGO_RECIBIDO") {
        await prisma.candidatoSuspension.update({
          where: { id: decision.id },
          data: { resuelto_en: new Date(), accion: "PAGO_RECIBIDO" },
        });
        candidatosSuspensionCerradosPago++;
      }
    }
    log(
      `🚫 Cola de suspensión: ${candidatosSuspensionCreados} nuevos, ${candidatosSuspensionActualizados} actualizados, ${candidatosSuspensionCerradosPago} cerrados por pago`,
    );
  } catch (err) {
    candidatosSuspensionError = err instanceof Error ? err.message : String(err);
    console.warn("[cierre-mensual] paso 4 (cola de suspensión) falló, se continúa con el paso 5:", err);
    log(`⚠️  Cola de suspensión: paso omitido — ${candidatosSuspensionError}`);
  }

  // ── 5. Borradores de factura del período ──────────────────────────────────
  const periodoDesde = new Date(anio, mes - 1, 1);
  const periodoHasta = new Date(anio, mes, 0);
  const facturas = await prepararBorradoresFactura(periodoDesde, periodoHasta, "cron");
  log(`🧾 Borradores: ${facturas.creadas} creados, ${facturas.omitidas} omitidos`);

  return {
    mes,
    anio,
    overridesRevertidos,
    overridesLimpiados,
    pagosCreados,
    marcadosVencidos,
    notificados,
    yaAvisados,
    sinTelefono,
    erroresEnvio,
    candidatosSuspensionCreados,
    candidatosSuspensionActualizados,
    candidatosSuspensionCerradosPago,
    candidatosSuspensionError,
    facturasBorradores: facturas.creadas,
    facturasOmitidas: facturas.omitidas,
  };
}

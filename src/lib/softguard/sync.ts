/**
 * Jobs de sincronización SoftGuard → portal, sobre el ACL de la API web (:8080).
 *
 * syncCuentasWebApi()  — proyecta dirección + estado del panel (sg_*) en Cuenta
 * syncEventosWebApi()  — persiste la cola de eventos pendientes en EventoAlarma
 * syncEstadoOTWebApi() — cierra OTs que la central marcó como cerradas (SerTec)
 *
 * Disparado por POST /api/cron/softguard (Bearer CRON_SECRET).
 * SOLO LECTURA contra SoftGuard.
 *
 * El pipeline SQL directo (1433, vistas vw_ei_*) fue retirado el 2026-06-11:
 * el puerto está filtrado y el ACL lo reemplazó. Historia en git si se reabre.
 */

import { prisma } from "@/lib/prisma/client";
import { softguardWebApiConfigured, fetchCodigosAlarma, fetchEventosPendientes, fetchCuentasDealer, fetchOrdenesServicio } from "./api";
import {
  AUTO_PREFIX,
  derivarFalloAcDesde,
  descripcionSolicitudAuto,
  evaluarFallosSostenidos,
  umbralFalloHoras,
  type FalloDetectado,
} from "./fallo-sostenido";

// ── syncCuentasWebApi ──────────────────────────────────────────────────────────
//
// Lee la grilla del CRM de la suite web (CuentaByDealer). Además de
// dirección/localidad, proyecta el estado de comunicación del panel (test
// periódico, fallo de AC, último evento) en los campos sg_* de Cuenta.
//
// Detección → acción (Fase 3): un fallo de TST o AC sostenido más allá del
// umbral (SOFTGUARD_FALLO_SOSTENIDO_HORAS, default 24 h) genera una
// SolicitudMantenimiento automática con prefijo [AUTO], que entra al flujo
// existente: bandeja → asignación → OT → técnico. Dedupe: no se crea si la
// cuenta ya tiene una solicitud abierta o una [AUTO] reciente.

/** Ventana de silencio tras una [AUTO] (aunque la hayan resuelto) — evita spam si el fallo persiste. */
const COOLDOWN_AUTO_MS = 48 * 3_600_000;

async function crearSolicitudSiCorresponde(
  cuentaId: string,
  softguardRef: string,
  fallos: FalloDetectado[],
  ahora: Date,
  umbralHoras: number,
): Promise<boolean> {
  const bloqueante = await prisma.solicitudMantenimiento.findFirst({
    where: {
      cuenta_id: cuentaId,
      OR: [
        { estado: { not: "RESUELTA" } },
        {
          descripcion: { startsWith: AUTO_PREFIX },
          creada_en: { gte: new Date(ahora.getTime() - COOLDOWN_AUTO_MS) },
        },
      ],
    },
    select: { id: true },
  });
  if (bloqueante) return false;

  await prisma.solicitudMantenimiento.create({
    data: {
      cuenta_id: cuentaId,
      descripcion: descripcionSolicitudAuto(softguardRef, fallos, umbralHoras),
      prioridad: "ALTA",
    },
  });
  return true;
}

export async function syncCuentasWebApi(): Promise<{
  actualizadas: number;
  sinMatch: number;
  errors: number;
  solicitudesCreadas: number;
  configured: boolean;
}> {
  if (!softguardWebApiConfigured()) {
    return { actualizadas: 0, sinMatch: 0, errors: 0, solicitudesCreadas: 0, configured: false };
  }

  let cuentas;
  try {
    cuentas = await fetchCuentasDealer();
  } catch (err) {
    console.error("[syncCuentasWebApi] Error API web:", err);
    return { actualizadas: 0, sinMatch: 0, errors: 1, solicitudesCreadas: 0, configured: true };
  }

  // Estado previo del portal: para derivar el inicio del fallo de AC (la
  // central solo da el booleano actual) y para tener el id de cada cuenta.
  const previas = await prisma.cuenta.findMany({
    select: { id: true, softguard_ref: true, sg_en_fallo_ac: true, sg_fallo_ac_desde: true },
  });
  const prevPorRef = new Map(previas.map((c) => [c.softguard_ref, c]));

  let actualizadas = 0;
  let sinMatch     = 0;
  let errors       = 0;
  let solicitudesCreadas = 0;
  const ahora = new Date();
  const umbral = umbralFalloHoras();

  for (const sg of cuentas) {
    const prev = prevPorRef.get(sg.softguard_ref);
    if (!prev) {
      sinMatch++; // cuentas de la central sin espejo en el portal (ej. línea _SG)
      continue;
    }
    try {
      const fallo_ac_desde = derivarFalloAcDesde(
        sg.en_fallo_ac, prev.sg_en_fallo_ac, prev.sg_fallo_ac_desde, ahora,
      );

      await prisma.cuenta.update({
        where: { id: prev.id },
        data: {
          // Dirección: solo pisar si SoftGuard trae dato (no blanquear lo cargado a mano).
          calle:         sg.calle         ?? undefined,
          localidad:     sg.localidad     ?? undefined,
          provincia:     sg.provincia     ?? undefined,
          codigo_postal: sg.codigo_postal ?? undefined,
          // Proyección sg_*: siempre, es el espejo de la central.
          sg_situacion:        sg.situacion,
          sg_en_fallo_tst:     sg.en_fallo_tst,
          sg_fallo_tst_desde:  sg.fallo_tst_desde,
          sg_ultimo_tst:       sg.ultimo_tst,
          sg_en_fallo_ac:      sg.en_fallo_ac,
          sg_fallo_ac_desde:   fallo_ac_desde,
          sg_ultimo_evento:    sg.ultimo_evento,
          sg_ultimo_evento_at: sg.ultimo_evento_at,
          sg_synced_at:        ahora,
        },
      });
      actualizadas++;

      const fallos = evaluarFallosSostenidos({
        en_fallo_tst: sg.en_fallo_tst,
        fallo_tst_desde: sg.fallo_tst_desde,
        en_fallo_ac: sg.en_fallo_ac,
        fallo_ac_desde,
        ahora,
        umbralHoras: umbral,
      });
      if (fallos.length > 0) {
        const creada = await crearSolicitudSiCorresponde(prev.id, sg.softguard_ref, fallos, ahora, umbral);
        if (creada) solicitudesCreadas++;
      }
    } catch (err) {
      console.error("[syncCuentasWebApi] Error cuenta", sg.softguard_ref, err);
      errors++;
    }
  }

  return { actualizadas, sinMatch, errors, solicitudesCreadas, configured: true };
}

// ── syncEventosWebApi ──────────────────────────────────────────────────────────
//
// Trae la cola de eventos pendientes del multimonitor (alarmas sin atender) y
// los persiste en EventoAlarma, incluyendo la zona (zon_cdescripcion / rec_czona).

export async function syncEventosWebApi(): Promise<{
  synced: number;
  nuevos: number;
  errors: number;
  configured: boolean;
}> {
  if (!softguardWebApiConfigured()) {
    return { synced: 0, nuevos: 0, errors: 0, configured: false };
  }

  let catalogo;
  let eventos;
  try {
    catalogo = await fetchCodigosAlarma();
    eventos  = await fetchEventosPendientes(catalogo, 500);
  } catch (err) {
    console.error("[syncEventosWebApi] Error API web:", err);
    return { synced: 0, nuevos: 0, errors: 1, configured: true };
  }

  let synced = 0;
  let nuevos = 0;
  let errors = 0;

  for (const ev of eventos) {
    try {
      const cuenta = await prisma.cuenta.findFirst({
        where:  { softguard_ref: ev.softguard_ref },
        select: { id: true },
      });

      // Eventos pendientes = alarmas sin atender → estado NUEVO en el portal.
      const upserted = await prisma.eventoAlarma.upsert({
        where: {
          softguard_ref_fecha_evento_codigo: {
            softguard_ref: ev.softguard_ref,
            fecha_evento:  ev.fecha_evento,
            codigo:        ev.codigo,
          },
        },
        create: {
          cuenta_id:          cuenta?.id ?? null,
          softguard_ref:      ev.softguard_ref,
          fecha_evento:       ev.fecha_evento,
          codigo:             ev.codigo,
          descripcion:        ev.descripcion,
          zona:               ev.zona,
          prioridad:          ev.prioridad,
          operador_softguard: ev.operador_id,
          estado:             "NUEVO",
          resolucion:         ev.observacion,
          raw:                ev.id_evento,
        },
        update: {
          // No pisar el estado si el admin del portal ya lo procesó manualmente.
          descripcion:        ev.descripcion,
          zona:               ev.zona,
          operador_softguard: ev.operador_id,
          resolucion:         ev.observacion,
          synced_at:          new Date(),
        },
        select: { estado: true },
      });

      synced++;
      if (upserted.estado === "NUEVO") nuevos++;
    } catch (err) {
      console.error("[syncEventosWebApi] Error evento", ev.id_evento, err);
      errors++;
    }
  }

  return { synced, nuevos, errors, configured: true };
}

// ── syncEstadoOTWebApi ────────────────────────────────────────────────────────
//
// Lee el módulo Servicio Técnico (/Rest/search/ServTec). Criterio de cierre
// EMPÍRICO de la UI oficial: una orden está cerrada cuando su estado sale del
// set activo (1,2,5,6) Y tiene fecha de cierre — NO el "estado=2" que asumía
// el pipeline SQL retirado (nunca se pudo validar).

export async function syncEstadoOTWebApi(): Promise<{
  revisadas: number;
  completadas: number;
  configured: boolean;
}> {
  if (!softguardWebApiConfigured()) {
    return { revisadas: 0, completadas: 0, configured: false };
  }

  const otsConRef = await prisma.ordenTrabajo.findMany({
    where: {
      st_softguard_numero: { not: null },
      estado: { notIn: ["COMPLETADA", "CANCELADA"] },
    },
    select: { id: true, st_softguard_numero: true },
  });

  if (otsConRef.length === 0) return { revisadas: 0, completadas: 0, configured: true };

  let ordenes;
  try {
    ordenes = await fetchOrdenesServicio({ limit: 1000 });
  } catch (err) {
    console.error("[syncEstadoOTWebApi] Error API web:", err);
    return { revisadas: otsConRef.length, completadas: 0, configured: true };
  }

  const porNumero = new Map(ordenes.map((o) => [String(o.numero), o]));
  let completadas = 0;

  for (const ot of otsConRef) {
    const orden = porNumero.get(String(ot.st_softguard_numero));
    if (!orden?.cerrada) continue;

    await prisma.ordenTrabajo.update({
      where: { id: ot.id },
      data:  { estado: "COMPLETADA", updated_at: new Date() },
    });
    completadas++;
  }

  return { revisadas: otsConRef.length, completadas, configured: true };
}

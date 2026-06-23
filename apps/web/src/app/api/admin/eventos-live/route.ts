/**
 * GET /api/admin/eventos-live
 *
 * Feed para el panel de multimonitoreo del dashboard admin.
 *
 * Fuente primaria: ReporteHistoricoMM de la API web de SoftGuard (:8080) — la
 * misma query que la grilla del MultiMonitor Web (últimos eventos recibidos) —
 * cruzada con EventosPendientes (cola de no atendidos) para derivar el estado
 * procesado/pendiente de cada evento.
 * SOLO LECTURA: no atiende ni procesa eventos en SoftGuard (eso se hace
 * manualmente en su módulo) y no persiste nada acá: la persistencia sigue
 * siendo responsabilidad del cron (/api/cron/softguard).
 *
 * Query params: ?limit=N (default 15, clamp 5–100) — el dashboard pide 12;
 * la vista extensa de operadores podrá pedir más con el mismo endpoint.
 *
 * Fallback: si la API web no está configurada o falla, devuelve los últimos
 * eventos sincronizados en EventoAlarma (DB local) con fuente="db" para que
 * el panel pueda indicar que el dato es diferido.
 *
 * Autenticación: sesión con rol ADMIN (mismo patrón que /api/admin/export).
 */

import { NextRequest, NextResponse } from "next/server";
import { getSesion } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import {
  softguardWebApiConfigured,
  invalidateWebApiSession,
  fetchEventosHistoricoMM,
  fetchEventosPendientes,
} from "@/lib/softguard/api";

export const dynamic = "force-dynamic";

export interface EventoLive {
  id: string;
  iid_cuenta: number; // id interno de cuenta en la central (0 si proviene del fallback DB)
  softguard_ref: string;
  titular: string;
  codigo: string;
  descripcion: string;
  zona: string | null;
  zonaNumero: string | null; // número de zona crudo (rec_czona), aparte del nombre
  prioridad: number | null;
  fecha: string; // ISO
  procesado: boolean;
}

export interface EventosLiveResponse {
  fuente: "live" | "db";
  /** true cuando la API web está configurada pero la conexión falló (sesión caída/red). */
  degradado: boolean;
  at: string;
  eventos: EventoLive[];
}

// Estados del portal que equivalen a "sin procesar" (mismo criterio que el dashboard).
const ESTADOS_ABIERTOS = new Set([
  "NUEVO", "EN_PROCESO", "EN_ESPERA", "EN_PROCESO_DESDE_ESPERA", "EN_PROCESO_MULTIPLE",
]);

async function eventosDesdeDb(limit: number): Promise<EventoLive[]> {
  const rows = await prisma.eventoAlarma.findMany({
    orderBy: { fecha_evento: "desc" },
    take: limit,
    include: { cuenta: { select: { descripcion: true } } },
  });
  return rows.map((e) => ({
    id: e.id,
    iid_cuenta: 0, // EventoAlarma no guarda el iid de la central → el wizard cae a fallback por ref
    softguard_ref: e.softguard_ref,
    titular: e.cuenta?.descripcion ?? e.softguard_ref,
    codigo: e.codigo,
    descripcion: e.descripcion,
    zona: e.zona,
    zonaNumero: null, // EventoAlarma (fallback DB) no guarda el número aparte
    prioridad: e.prioridad,
    fecha: e.fecha_evento.toISOString(),
    procesado: !ESTADOS_ABIERTOS.has(e.estado),
  }));
}

export async function GET(req: NextRequest) {
  const sesion = await getSesion();
  if (!sesion || sesion.perfil.rol !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const limitRaw = Number(req.nextUrl.searchParams.get("limit") ?? 15);
  const limit = Number.isInteger(limitRaw) ? Math.min(100, Math.max(5, limitRaw)) : 15;

  const at = new Date().toISOString();

  if (softguardWebApiConfigured()) {
    // ?relogin=1 → reconexión manual: descartar la sesión cacheada y entrar de cero.
    if (req.nextUrl.searchParams.get("relogin") === "1") invalidateWebApiSession();
    try {
      const [recientes, pendientes] = await Promise.all([
        fetchEventosHistoricoMM(limit),
        fetchEventosPendientes(undefined, 200),
      ]);
      const sinAtender = new Set(pendientes.map((e) => e.id_evento));
      // El histórico (ReporteHistoricoMM) solo trae el NÚMERO de zona; la cola de
      // pendientes trae el NOMBRE (zon_cdescripcion). Para los eventos sin atender —
      // los que se notifican — tomamos el nombre cruzando por id de evento.
      const zonaPorId = new Map(pendientes.filter((p) => p.zona).map((p) => [p.id_evento, p.zona]));
      const eventos: EventoLive[] = recientes
        .sort((a, b) => b.fecha_evento.getTime() - a.fecha_evento.getTime())
        .map((e) => ({
          id: e.id_evento,
          iid_cuenta: e.iid_cuenta,
          softguard_ref: e.softguard_ref,
          titular: e.titular,
          codigo: e.codigo,
          descripcion: e.descripcion,
          zona: zonaPorId.get(e.id_evento) ?? e.zona,
          zonaNumero: e.zonaNumero,
          prioridad: e.prioridad,
          fecha: e.fecha_evento.toISOString(),
          procesado: !sinAtender.has(e.id_evento),
        }));
      return NextResponse.json({ fuente: "live", degradado: false, at, eventos } satisfies EventosLiveResponse);
    } catch (err) {
      console.error("[eventos-live] API web falló, fallback a DB:", err);
    }
  }

  const eventos = await eventosDesdeDb(limit);
  // degradado=true solo si la API está configurada y aun así caímos al fallback.
  return NextResponse.json(
    { fuente: "db", degradado: softguardWebApiConfigured(), at, eventos } satisfies EventosLiveResponse,
  );
}

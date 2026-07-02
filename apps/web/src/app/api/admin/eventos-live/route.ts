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
 * Autenticación: ADMIN o empleado con capacidad `puede_monitorear` — mismo
 * criterio que /api/admin/patron-evento. Lo consume `MonitorOperadores`, que
 * también se monta en /monitoreo/en-vivo (gateado por `puede_monitorear`)
 * para operadores no-ADMIN.
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
  // ── Identificación de la cuenta para titulares multi-cuenta ──
  cuentaDescripcion: string | null; // descripcion de la Cuenta en el portal ("Casa", "Local Centro")
  cuentaCalle: string | null;
  /** true si el perfil dueño de la cuenta tiene 2+ cuentas activas (hay que aclarar cuál sonó). */
  titularMultiCuenta: boolean;
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

/**
 * Perfiles con 2+ cuentas ACTIVAS (una query batch por request, nada de N+1).
 * Para esos titulares el mensaje/board debe aclarar de QUÉ cuenta es el evento.
 */
async function perfilesMultiCuenta(perfilIds: string[]): Promise<Set<string>> {
  if (perfilIds.length === 0) return new Set();
  const conteos = await prisma.cuenta.groupBy({
    by: ["perfil_id"],
    where: { perfil_id: { in: perfilIds }, estado: "ACTIVA" },
    _count: { _all: true },
  });
  return new Set(conteos.filter((c) => c._count._all >= 2).map((c) => c.perfil_id));
}

/** Datos de identificación de cuenta por `softguard_ref` (camino live: cruce en memoria). */
interface CuentaLiveInfo {
  descripcion: string | null;
  calle: string | null;
  multiCuenta: boolean;
}

async function cuentasPorRef(refs: string[]): Promise<Map<string, CuentaLiveInfo>> {
  if (refs.length === 0) return new Map();
  const cuentas = await prisma.cuenta.findMany({
    where: { softguard_ref: { in: refs } },
    select: { softguard_ref: true, descripcion: true, calle: true, perfil_id: true },
  });
  const multi = await perfilesMultiCuenta([...new Set(cuentas.map((c) => c.perfil_id))]);
  return new Map(
    cuentas.map((c) => [
      c.softguard_ref,
      { descripcion: c.descripcion, calle: c.calle, multiCuenta: multi.has(c.perfil_id) },
    ]),
  );
}

async function eventosDesdeDb(limit: number): Promise<EventoLive[]> {
  const rows = await prisma.eventoAlarma.findMany({
    orderBy: { fecha_evento: "desc" },
    take: limit,
    include: {
      cuenta: {
        select: {
          descripcion: true,
          calle: true,
          perfil_id: true,
          perfil: { select: { nombre: true } },
        },
      },
    },
  });
  const multi = await perfilesMultiCuenta([
    ...new Set(rows.flatMap((e) => (e.cuenta ? [e.cuenta.perfil_id] : []))),
  ]);
  return rows.map((e) => ({
    id: e.id,
    iid_cuenta: 0, // EventoAlarma no guarda el iid de la central → el wizard cae a fallback por ref
    softguard_ref: e.softguard_ref,
    titular: e.cuenta?.perfil.nombre ?? e.softguard_ref,
    codigo: e.codigo,
    descripcion: e.descripcion,
    zona: e.zona,
    zonaNumero: null, // EventoAlarma (fallback DB) no guarda el número aparte
    prioridad: e.prioridad,
    fecha: e.fecha_evento.toISOString(),
    procesado: !ESTADOS_ABIERTOS.has(e.estado),
    cuentaDescripcion: e.cuenta?.descripcion ?? null,
    cuentaCalle: e.cuenta?.calle ?? null,
    titularMultiCuenta: e.cuenta ? multi.has(e.cuenta.perfil_id) : false,
  }));
}

export async function GET(req: NextRequest) {
  const sesion = await getSesion();
  if (!sesion) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (sesion.perfil.rol !== "ADMIN") {
    const empleado = await prisma.empleado.findFirst({
      where: { perfil_id: sesion.userId },
      select: { puede_monitorear: true },
    });
    if (!empleado?.puede_monitorear) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
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
      // Los eventos de SoftGuard no traen relación con Cuenta del portal: se cruza en
      // memoria por softguard_ref con UNA query batch. Si la DB local falla, el feed
      // live sigue saliendo (sin identificación de cuenta) en vez de tirar el request.
      const infoPorRef = await cuentasPorRef([...new Set(recientes.map((e) => e.softguard_ref))]).catch(
        (err): Map<string, CuentaLiveInfo> => {
          console.error("[eventos-live] no se pudo cruzar cuentas del portal:", err);
          return new Map();
        },
      );
      const eventos: EventoLive[] = recientes
        .sort((a, b) => b.fecha_evento.getTime() - a.fecha_evento.getTime())
        .map((e) => {
          const info = infoPorRef.get(e.softguard_ref);
          return {
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
            cuentaDescripcion: info?.descripcion ?? null,
            cuentaCalle: info?.calle ?? null,
            titularMultiCuenta: info?.multiCuenta ?? false,
          };
        });
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

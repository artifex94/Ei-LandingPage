/**
 * GET /api/admin/softguard-status
 *
 * Diagnóstico de la suite web de SoftGuard (:8080) para el área Sistema:
 *   - sesión: login + validez del token (con latencia)
 *   - módulos: catálogo DesktopModules con disponibilidad por módulo
 *   - sondas: chequeos funcionales de los endpoints que el portal consume
 *
 * SOLO LECTURA. Autenticación: sesión con rol ADMIN.
 */

import { NextResponse } from "next/server";
import { getSesion } from "@/lib/auth/session";
import {
  softguardWebApiConfigured,
  pingWebApi,
  fetchModulosDesktop,
  fetchCodigosAlarma,
  fetchEventosHistoricoMM,
  fetchEventosPendientes,
  fetchCuentasCount,
  fetchOrdenesServicioCount,
  type ModuloSuite,
} from "@/lib/softguard/api";

export const dynamic = "force-dynamic";

export interface SondaResultado {
  nombre: string;
  ok: boolean;
  ms: number;
  detalle?: string;
  error?: string;
}

export interface SoftguardStatusResponse {
  configurado: boolean;
  at: string;
  sesion: SondaResultado | null;
  modulos: ModuloSuite[];
  sondas: SondaResultado[];
}

async function sondar<T>(
  nombre: string,
  fn: () => Promise<T>,
  detalle: (r: T) => string,
): Promise<{ resultado: SondaResultado; valor: T | null }> {
  const t0 = Date.now();
  try {
    const valor = await fn();
    return { resultado: { nombre, ok: true, ms: Date.now() - t0, detalle: detalle(valor) }, valor };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return { resultado: { nombre, ok: false, ms: Date.now() - t0, error }, valor: null };
  }
}

export async function GET() {
  const sesion = await getSesion();
  if (!sesion || sesion.perfil.rol !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const at = new Date().toISOString();

  if (!softguardWebApiConfigured()) {
    return NextResponse.json({
      configurado: false, at, sesion: null, modulos: [], sondas: [],
    } satisfies SoftguardStatusResponse);
  }

  // La sesión primero (hace el login si hace falta); el resto reusa la cookie.
  const ping = await sondar("Sesión (login + token)", () => pingWebApi(), (r) =>
    r.ok ? "token válido" : `token inválido (status ${r.status})`,
  );

  const [mods, cuentas, codigos, historico, pendientes, ordenes] = await Promise.all([
    sondar("Módulos del Desktop", () => fetchModulosDesktop(), (r) => {
      const activos = r.filter((m) => m.disponible).length;
      return `${activos} disponibles de ${r.length}`;
    }),
    sondar("Cuentas visibles (permisos)", () => fetchCuentasCount(), (n) =>
      n > 0 ? `${n} cuentas` : "0 cuentas — revisar permisos del usuario web",
    ),
    sondar("Catálogo de códigos de alarma", () => fetchCodigosAlarma(), (r) => `${r.size} códigos`),
    sondar("Eventos (grilla multimonitor)", () => fetchEventosHistoricoMM(1), (r) =>
      r.length > 0 ? `último: ${r[0].codigo} ${r[0].descripcion}` : "sin eventos",
    ),
    sondar("Cola de eventos pendientes", () => fetchEventosPendientes(undefined, 200), (r) =>
      `${r.length} sin atender`,
    ),
    sondar("Órdenes de servicio (SerTec)", () => fetchOrdenesServicioCount(), (n) =>
      `${n} órdenes`,
    ),
  ]);

  return NextResponse.json({
    configurado: true,
    at,
    sesion: ping.resultado,
    modulos: mods.valor ?? [],
    sondas: [
      mods.resultado, cuentas.resultado, codigos.resultado,
      historico.resultado, pendientes.resultado, ordenes.resultado,
    ],
  } satisfies SoftguardStatusResponse);
}

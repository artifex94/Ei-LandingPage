/**
 * GET /api/admin/patron-evento?ref=ESI-0175&codigo=COF&hora=14
 *
 * Patrón horario de una cuenta+código: ¿esta alarma suele dispararse a esta
 * hora? Histórico de `EventoAlarma` de los últimos 90 días para la misma
 * cuenta y código, agrupado por hora del día (AR). Lo consume el drawer del
 * board de monitoreo (`PanelContexto` en `MonitorOperadores`) para el chip
 * "Suele disparar ~HH:00 (N veces en 90 días)" — solo ruido si no hay señal
 * suficiente (ver `calcularPatronHorario`, umbral en ventana ±1h).
 *
 * Fase 10 del plan maestro (monitoreadores). Sin cambios de schema: todo
 * derivado en query-time desde `EventoAlarma`.
 *
 * Autenticación: ADMIN o empleado con capacidad `puede_monitorear` — mismo
 * criterio que el gate de /monitoreo (app/monitoreo/layout.tsx). El chip que
 * consume esto (`MonitorOperadores`) también se renderiza en /monitoreo/en-vivo
 * para operadores no-ADMIN.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSesion } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import { horaNumeroAR } from "@/lib/fecha-ar";
import { calcularPatronHorario, histogramaPorHora, type PatronHorario } from "@/lib/patron-horario";

export const dynamic = "force-dynamic";

const DIAS_HISTORICO = 90;
// Cota defensiva: cuentas con eventos muy frecuentes (p. ej. fallas técnicas
// recurrentes) no deben forzar un full scan sin límite.
const TOMA_MAXIMA = 2000;

export interface PatronEventoResponse {
  patron: PatronHorario | null;
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

  const ref = (req.nextUrl.searchParams.get("ref") ?? "").trim();
  const codigo = (req.nextUrl.searchParams.get("codigo") ?? "").trim();
  const horaActual = Number(req.nextUrl.searchParams.get("hora"));
  if (!ref || !codigo || !Number.isInteger(horaActual)) {
    return NextResponse.json({ patron: null } satisfies PatronEventoResponse);
  }

  try {
    const desde = new Date(Date.now() - DIAS_HISTORICO * 24 * 60 * 60 * 1000);
    const eventos = await prisma.eventoAlarma.findMany({
      where: { softguard_ref: ref, codigo, fecha_evento: { gte: desde } },
      select: { fecha_evento: true },
      take: TOMA_MAXIMA,
    });
    const counts = histogramaPorHora(eventos.map((e) => horaNumeroAR(e.fecha_evento)));
    const patron = calcularPatronHorario(counts, horaActual);
    return NextResponse.json({ patron } satisfies PatronEventoResponse);
  } catch (err) {
    console.error("[patron-evento] no se pudo calcular el patrón:", err);
    return NextResponse.json({ patron: null } satisfies PatronEventoResponse);
  }
}

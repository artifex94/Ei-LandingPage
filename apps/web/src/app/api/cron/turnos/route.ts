/**
 * POST /api/cron/turnos — auto-asignación de cobertura de las próximas 72 h.
 *
 * Corre cada 4 horas. Reparte automáticamente las franjas sin cubrir entre los
 * monitores activos (mismo algoritmo que el botón manual del panel) y notifica
 * a Ramiro qué se asignó. Si queda algún hueco insalvable (sin monitores
 * disponibles ese día por ausencias), lo reporta aparte.
 *
 * Authorization: Bearer <CRON_SECRET>
 */

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { enviarWhatsApp } from "@/lib/twilio";
import { getParam } from "@/lib/parametros";
import { conRegistroCronRun } from "@/lib/cron-run";
import {
  planificarSemana,
  generarFechasUTC,
  FRANJAS,
  type FranjaTurno,
} from "@/lib/scheduling/auto-asignar";

const COBERTURA_DIAS_DEFAULT = 3;

const FRANJA_LABEL: Record<string, string> = {
  MANANA: "Mañana (06–14 hs)",
  TARDE:  "Tarde (14–22 hs)",
  NOCHE:  "Noche (22–06 hs)",
};

function diaKey(d: Date): string {
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
}

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const auth = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${cronSecret}`;
  const authBuf = Buffer.from(auth, "utf8");
  const expBuf = Buffer.from(expected, "utf8");
  const valido =
    authBuf.length === expBuf.length && crypto.timingSafeEqual(authBuf, expBuf);
  if (!valido) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const resultado = await conRegistroCronRun("turnos-auto", () => ejecutarAutoAsignacion());
  return NextResponse.json(resultado);
}

async function ejecutarAutoAsignacion() {
  const COBERTURA_DIAS = await getParam("COBERTURA_DIAS_TURNOS", COBERTURA_DIAS_DEFAULT);

  // Ventana de cobertura: hoy + próximos días, en UTC (el host corre en UTC).
  const hoyUtc = new Date();
  const desde = new Date(Date.UTC(hoyUtc.getUTCFullYear(), hoyUtc.getUTCMonth(), hoyUtc.getUTCDate()));
  const fechas = generarFechasUTC(desde, COBERTURA_DIAS);
  const hasta = fechas[fechas.length - 1];

  const [monitores, turnosExistentes, ausencias] = await Promise.all([
    prisma.empleado.findMany({
      where: { activo: true, puede_monitorear: true },
      include: { perfil: { select: { nombre: true } } },
      orderBy: { created_at: "asc" },
    }),
    prisma.turno.findMany({
      where: {
        fecha: { gte: desde, lte: hasta },
        estado: { in: ["PROGRAMADO", "EN_CURSO", "COMPLETADO"] },
      },
      select: { empleado_id: true, fecha: true, franja: true },
    }),
    prisma.ausencia.findMany({
      where: { desde: { lte: hasta }, hasta: { gte: desde } },
      select: { empleado_id: true, desde: true, hasta: true },
    }),
  ]);

  const ramiroTel = process.env.RAMIRO_TELEFONO;

  if (monitores.length === 0) {
    if (ramiroTel) {
      await enviarWhatsApp(
        ramiroTel,
        "⚠️ *Cobertura de turnos*\n\nNo hay monitores activos habilitados. No se pudo auto-asignar."
      );
    }
    console.warn("[cron/turnos] sin monitores activos");
    return { ok: true, creados: 0, monitores: 0 };
  }

  const propuestas = planificarSemana({
    monitores: monitores.map((e) => ({ id: e.id, nombre: e.perfil.nombre })),
    ausencias,
    turnosExistentes: turnosExistentes.map((t) => ({
      empleado_id: t.empleado_id,
      fecha: t.fecha,
      franja: t.franja as FranjaTurno,
    })),
    fechas,
  });

  let creados = 0;
  if (propuestas.length > 0) {
    const res = await prisma.turno.createMany({
      data: propuestas.map((p) => ({
        empleado_id: p.empleado_id,
        fecha: p.fecha,
        franja: p.franja,
        estado: "PROGRAMADO" as const,
      })),
      skipDuplicates: true,
    });
    creados = res.count;
  }

  // Huecos insalvables: franjas que siguen sin cobertura tras el reparto
  // (porque no había ningún monitor disponible ese día).
  const cubierto = new Set<string>();
  for (const t of turnosExistentes) cubierto.add(`${diaKey(t.fecha)}|${t.franja}`);
  for (const p of propuestas) cubierto.add(`${diaKey(p.fecha)}|${p.franja}`);

  const insalvables: { fecha: Date; franja: string }[] = [];
  for (const fecha of fechas) {
    for (const franja of FRANJAS) {
      if (!cubierto.has(`${diaKey(fecha)}|${franja}`)) {
        insalvables.push({ fecha, franja });
      }
    }
  }

  // Notificar a Ramiro: qué se asignó + qué quedó sin resolver.
  if (ramiroTel && (creados > 0 || insalvables.length > 0)) {
    const partes: string[] = [];
    if (creados > 0) {
      partes.push(`✅ *${creados} turno${creados !== 1 ? "s" : ""} asignado${creados !== 1 ? "s" : ""} automáticamente* (próximas ${COBERTURA_DIAS * 24} h)`);
    }
    if (insalvables.length > 0) {
      const lineas = insalvables
        .map((h) => `• ${h.fecha.toLocaleDateString("es-AR", { timeZone: "UTC" })} — ${FRANJA_LABEL[h.franja]}`)
        .join("\n");
      partes.push(`⚠️ *Sin monitores disponibles* (revisá ausencias):\n${lineas}`);
    }
    partes.push("Ver en /admin/turnos");
    await enviarWhatsApp(ramiroTel, partes.join("\n\n"));
  }

  console.log(`[cron/turnos] creados=${creados} insalvables=${insalvables.length}`);
  return { ok: true, creados, insalvables: insalvables.length };
}

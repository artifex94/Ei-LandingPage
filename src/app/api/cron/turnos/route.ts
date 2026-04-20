/**
 * POST /api/cron/turnos — verificar cobertura de turnos próximas 72h.
 * Llama cada 4 horas. Authorization: Bearer <CRON_SECRET>
 */

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { enviarWhatsApp } from "@/lib/twilio";

const FRANJAS = ["MANANA", "TARDE", "NOCHE"] as const;
const FRANJA_LABEL: Record<string, string> = {
  MANANA: "Mañana (06–14 hs)",
  TARDE:  "Tarde (14–22 hs)",
  NOCHE:  "Noche (22–06 hs)",
};

function addDays(d: Date, n: number) {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const auth = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${cronSecret}`;
  const authBuf = Buffer.from(auth); const expBuf = Buffer.from(expected);
  const valido = authBuf.length === expBuf.length && crypto.timingSafeEqual(authBuf, expBuf);
  if (!valido) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ahora = new Date(); ahora.setHours(0, 0, 0, 0);
  const hasta = addDays(ahora, 3);

  const turnos = await prisma.turno.findMany({
    where: {
      fecha: { gte: ahora, lte: hasta },
      estado: { in: ["PROGRAMADO", "EN_CURSO"] },
    },
    select: { fecha: true, franja: true },
  });

  const huecos: { fecha: Date; franja: string }[] = [];
  for (let i = 0; i < 3; i++) {
    const dia = addDays(ahora, i);
    for (const franja of FRANJAS) {
      const cubre = turnos.some(
        (t) => t.fecha.toDateString() === dia.toDateString() && t.franja === franja
      );
      if (!cubre) huecos.push({ fecha: dia, franja });
    }
  }

  if (huecos.length > 0) {
    const ramiroTel = process.env.RAMIRO_TELEFONO ?? "3436575372";
    const lineas = huecos
      .map((h) => `• ${h.fecha.toLocaleDateString("es-AR")} — ${FRANJA_LABEL[h.franja]}`)
      .join("\n");

    await enviarWhatsApp(
      ramiroTel,
      `⚠️ *Huecos de cobertura (72h)*\n\n${lineas}\n\nAsigná reemplazos en /admin/turnos`
    );
  }

  console.log(`[cron/turnos] huecos=${huecos.length}`);
  return NextResponse.json({ ok: true, huecos: huecos.length });
}

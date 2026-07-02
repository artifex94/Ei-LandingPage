/**
 * Cron endpoint — entry point HTTP. Llamar el 1° de cada mes:
 *   POST /api/cron
 *   Authorization: Bearer <CRON_SECRET>
 *
 * La lógica vive en src/lib/cron/cierre-mensual.ts (fuente ÚNICA, compartida
 * con scripts/cron-mensual.ts). Este handler solo autentica y delega.
 *
 * Configurar en Vercel Cron (vercel.json) o cron-job.org.
 */

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { ejecutarCierreMensual } from "@/lib/cron/cierre-mensual";

export async function POST(req: NextRequest) {
  // ── Autenticación — comparación timing-safe para evitar timing oracle ──────
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const auth = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${cronSecret}`;
  const authBuf = Buffer.from(auth, "utf8");
  const expBuf = Buffer.from(expected, "utf8");
  const valido =
    authBuf.length === expBuf.length && crypto.timingSafeEqual(authBuf, expBuf);
  if (!valido) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const r = await ejecutarCierreMensual(prisma);

  console.log(
    `[cron] mes=${r.mes}/${r.anio} pagosCreados=${r.pagosCreados} vencidos=${r.marcadosVencidos} ` +
      `notificados=${r.notificados} yaAvisados=${r.yaAvisados} errores=${r.erroresEnvio} ` +
      `candidatosSuspension=${r.candidatosSuspensionCreados}/${r.candidatosSuspensionActualizados}/${r.candidatosSuspensionCerradosPago} ` +
      `facturasBorradores=${r.facturasBorradores} facturasOmitidas=${r.facturasOmitidas}`,
  );

  return NextResponse.json({ ok: true, periodo: `${r.mes}/${r.anio}` });
}

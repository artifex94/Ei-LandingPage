/**
 * POST /api/cron/softguard
 *
 * Ejecuta los tres jobs de sincronización SoftGuard → portal en secuencia,
 * todos por el ACL de la API web (:8080):
 *   1. syncCuentasWebApi  — dirección + proyección sg_* del panel en Cuenta
 *   2. syncEventosWebApi  — importa eventos de alarma nuevos
 *   3. syncEstadoOTWebApi — cierra OTs que la central marcó como cerradas
 *
 * Autenticación: Bearer <CRON_SECRET>
 *
 * Frecuencia recomendada (configurar en cron-job.org o Vercel Cron): cada 5 min.
 * Es seguro: los jobs corren en secuencia para no martillar la suite web.
 */

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { syncCuentasWebApi, syncEventosWebApi, syncEstadoOTWebApi } from "@/lib/softguard/sync";
import { softguardWebApiConfigured } from "@/lib/softguard/api";

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const auth     = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${cronSecret}`;
  const authBuf  = Buffer.from(auth,     "utf8");
  const expBuf   = Buffer.from(expected, "utf8");
  const valido   =
    authBuf.length === expBuf.length &&
    crypto.timingSafeEqual(authBuf, expBuf);

  if (!valido) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const t0 = Date.now();

  if (!softguardWebApiConfigured()) {
    return NextResponse.json(
      { ok: false, error: "SoftGuard API web sin configurar (SOFTGUARD_API_*)" },
      { status: 503 },
    );
  }

  // En secuencia para no martillar la suite web con requests concurrentes.
  const cuentas = await syncCuentasWebApi();
  const eventos = await syncEventosWebApi();
  const ots     = await syncEstadoOTWebApi();

  const duracion_ms = Date.now() - t0;

  console.log(
    `[cron/softguard] fuente=webapi ` +
    `cuentas.actualizadas=${cuentas.actualizadas} cuentas.sinMatch=${cuentas.sinMatch} ` +
    `eventos.synced=${eventos.synced} eventos.nuevos=${eventos.nuevos} ` +
    `ots.revisadas=${ots.revisadas} ots.completadas=${ots.completadas} ` +
    `duracion=${duracion_ms}ms`
  );

  return NextResponse.json({
    ok:         true,
    duracion_ms,
    fuente:     "webapi",
    cuentas,
    eventos,
    ots,
  });
}

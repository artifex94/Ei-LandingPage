/**
 * POST /api/cron/softguard
 *
 * Ejecuta los tres jobs de sincronización SoftGuard → portal en secuencia:
 *   1. syncCuentas  — enriquece localidad/provincia en Cuenta
 *   2. syncEventos  — importa eventos de alarma nuevos
 *   3. syncEstadoOT — cierra OTs que SoftGuard marcó como cerradas
 *
 * Autenticación: Bearer <CRON_SECRET>
 *
 * Frecuencia recomendada (configurar en cron-job.org o Vercel Cron):
 *   syncEventos  → cada 5 min
 *   syncEstadoOT → cada 30 min
 *   syncCuentas  → cada 6 h
 *
 * Este endpoint ejecuta los tres en cada llamada. Llamarlo cada 5 min
 * es seguro porque syncCuentas y syncEstadoOT son operaciones livianas.
 */

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { syncCuentas, syncCuentasWebApi, syncEventos, syncEventosWebApi, syncEstadoOT, syncEstadoOTWebApi } from "@/lib/softguard/sync";
import { isMockMode } from "@/lib/softguard/client";
import { softguardWebApiConfigured } from "@/lib/softguard/web-api";

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

  // Fuente de eventos: si el SQL directo está en mock (firewall) pero la API web
  // está configurada, leer eventos de la API REST de la suite web (:8080).
  const usarWebApi = isMockMode() && softguardWebApiConfigured();

  // Ejecutar en secuencia para no saturar el pool de SQL Server (max: 5 conex.)
  const cuentas = usarWebApi ? await syncCuentasWebApi() : await syncCuentas();
  const eventos = usarWebApi ? await syncEventosWebApi() : await syncEventos();
  const ots     = usarWebApi ? await syncEstadoOTWebApi() : await syncEstadoOT();

  const duracion_ms = Date.now() - t0;

  console.log(
    `[cron/softguard] fuente=${usarWebApi ? "webapi" : isMockMode() ? "mock" : "sql"} ` +
    `cuentas.actualizadas=${cuentas.actualizadas} cuentas.sinMatch=${cuentas.sinMatch} ` +
    `eventos.synced=${eventos.synced} eventos.nuevos=${eventos.nuevos} ` +
    `ots.revisadas=${ots.revisadas} ots.completadas=${ots.completadas} ` +
    `duracion=${duracion_ms}ms`
  );

  return NextResponse.json({
    ok:         true,
    duracion_ms,
    fuente:     usarWebApi ? "webapi" : isMockMode() ? "mock" : "sql",
    cuentas,
    eventos,
    ots,
  });
}

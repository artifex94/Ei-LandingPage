/**
 * Cron endpoint — llamar el 1° de cada mes:
 *   POST /api/cron
 *   Authorization: Bearer <CRON_SECRET>
 *
 * Hace 3 cosas:
 *   1. Crea registros Pago PENDIENTE para el mes actual en todas las cuentas ACTIVA.
 *   2. Marca como VENCIDO cualquier pago PENDIENTE de meses anteriores.
 *   3. Envía WhatsApp a clientes con pagos PENDIENTE o VENCIDO.
 *
 * Configurar en Vercel Cron (vercel.json) o cron-job.org para ejecutar el día 1 de cada mes.
 */

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { enviarWhatsApp } from "@/lib/twilio";
import { prepararBorradoresFactura } from "@/lib/facturacion/preparar-borradores";

const MESES_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export async function POST(req: NextRequest) {
  // ── Autenticación — comparación timing-safe para evitar timing oracle ──────
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const auth = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${cronSecret}`;
  const authBuf = Buffer.from(auth, "utf8");
  const expBuf  = Buffer.from(expected, "utf8");
  const valido  =
    authBuf.length === expBuf.length &&
    crypto.timingSafeEqual(authBuf, expBuf);
  if (!valido) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ahora = new Date();
  const mes = ahora.getMonth() + 1;
  const anio = ahora.getFullYear();

  // ── 1. Generar pagos PENDIENTE para el mes actual ─────────────────────────
  const [cuentasActivas, tarifaRow] = await Promise.all([
    prisma.cuenta.findMany({ where: { estado: "ACTIVA" }, select: { id: true, costo_mensual: true } }),
    prisma.tarifaHistorico.findFirst({ orderBy: { vigente_desde: "desc" } }),
  ]);
  const tarifaEstandar = tarifaRow?.monto ?? 15000;

  const { count: pagosCreados } = await prisma.pago.createMany({
    data: cuentasActivas.map((cuenta) => ({
      cuenta_id: cuenta.id,
      mes,
      anio,
      importe: cuenta.costo_mensual ?? tarifaEstandar,
      estado: "PENDIENTE" as const,
    })),
    skipDuplicates: true,
  });

  // ── 2. Marcar como VENCIDO los PENDIENTE de meses anteriores ─────────────
  // Considera vencido cualquier pago PENDIENTE cuyo mes/año ya pasó
  const { count: marcadosVencidos } = await prisma.pago.updateMany({
    where: {
      estado: "PENDIENTE",
      OR: [
        { anio: { lt: anio } },
        { anio, mes: { lt: mes } },
      ],
    },
    data: { estado: "VENCIDO" },
  });

  // ── 3. Notificar por WhatsApp a clientes con deuda ────────────────────────
  const perfilesConDeuda = await prisma.perfil.findMany({
    where: {
      activo: true,
      telefono: { not: null },
      cuentas: {
        some: {
          estado: { not: "BAJA_DEFINITIVA" },
          pagos: {
            some: { estado: { in: ["PENDIENTE", "VENCIDO"] } },
          },
        },
      },
    },
    select: {
      nombre: true,
      telefono: true,
      cuentas: {
        where: { estado: { not: "BAJA_DEFINITIVA" } },
        select: {
          descripcion: true,
          pagos: {
            where: { estado: { in: ["PENDIENTE", "VENCIDO"] } },
            select: { mes: true, anio: true, estado: true, importe: true },
            orderBy: [{ anio: "asc" }, { mes: "asc" }],
          },
        },
      },
    },
  });

  let notificados = 0;
  let erroresEnvio = 0;

  for (const perfil of perfilesConDeuda) {
    if (!perfil.telefono) continue;

    // Armar lista de deudas
    const lineasDeuda: string[] = [];
    for (const cuenta of perfil.cuentas) {
      for (const pago of cuenta.pagos) {
        const mesLabel = MESES_ES[pago.mes - 1];
        const esVencido = pago.estado === "VENCIDO";
        lineasDeuda.push(
          `• ${cuenta.descripcion}: ${mesLabel} ${pago.anio}${esVencido ? " _(VENCIDO)_" : ""}`
        );
      }
    }

    if (lineasDeuda.length === 0) continue;

    const nombre = perfil.nombre.split(" ")[0];
    const tieneVencidos = perfil.cuentas.some((c) =>
      c.pagos.some((pg) => pg.estado === "VENCIDO")
    );

    const mensaje =
      `Hola ${nombre}! 👋 Te recordamos que tenés pagos pendientes en Escobar Instalaciones:\n\n` +
      lineasDeuda.join("\n") +
      `\n\nPodés abonar desde tu portal o comunicarte con nosotros al WhatsApp si necesitás ayuda.` +
      (tieneVencidos ? "\n\n⚠️ Algunos pagos están vencidos — regularizalos a la brevedad." : "");

    const ok = await enviarWhatsApp(perfil.telefono, mensaje);
    if (ok) notificados++; else erroresEnvio++;
  }

  // ── 4. Preparar borradores de factura para el mes actual ─────────────────
  const periodoDesde = new Date(anio, mes - 1, 1);
  const periodoHasta = new Date(anio, mes, 0); // último día del mes
  const resultFacturas = await prepararBorradoresFactura(periodoDesde, periodoHasta, "cron");

  console.log(`[cron] mes=${mes}/${anio} pagosCreados=${pagosCreados} vencidos=${marcadosVencidos} notificados=${notificados} errores=${erroresEnvio} facturasBorradores=${resultFacturas.creadas} facturasOmitidas=${resultFacturas.omitidas}`);

  return NextResponse.json({
    ok: true,
    mes: `${mes}/${anio}`,
    pagosCreados,
    marcadosVencidos,
    notificados,
    erroresEnvio,
    facturasBorradores: resultFacturas.creadas,
    facturasOmitidas: resultFacturas.omitidas,
  });
}

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

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { enviarWhatsApp } from "@/lib/twilio";

const MESES_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export async function POST(req: NextRequest) {
  // ── Autenticación ─────────────────────────────────────────────────────────
  const auth = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ahora = new Date();
  const mes = ahora.getMonth() + 1;
  const anio = ahora.getFullYear();

  // ── 1. Generar pagos PENDIENTE para el mes actual ─────────────────────────
  const cuentasActivas = await prisma.cuenta.findMany({
    where: { estado: "ACTIVA" },
    select: { id: true, costo_mensual: true },
  });

  let pagosCreados = 0;
  for (const cuenta of cuentasActivas) {
    try {
      const existing = await prisma.pago.findUnique({
        where: { cuenta_id_mes_anio: { cuenta_id: cuenta.id, mes, anio } },
        select: { id: true },
      });
      if (!existing) {
        await prisma.pago.create({
          data: { cuenta_id: cuenta.id, mes, anio, importe: cuenta.costo_mensual, estado: "PENDIENTE" },
        });
        pagosCreados++;
      }
    } catch (e) {
      console.error("Error creando pago:", e);
    }
  }

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
    const tieneVencidos = perfilesConDeuda.some((p) =>
      p.cuentas.some((c) => c.pagos.some((pg) => pg.estado === "VENCIDO"))
    );

    const mensaje =
      `Hola ${nombre}! 👋 Te recordamos que tenés pagos pendientes en Escobar Instalaciones:\n\n` +
      lineasDeuda.join("\n") +
      `\n\nPodés abonar desde tu portal o comunicarte con nosotros al WhatsApp si necesitás ayuda.` +
      (tieneVencidos ? "\n\n⚠️ Algunos pagos están vencidos — regularizalos a la brevedad." : "");

    const ok = await enviarWhatsApp(perfil.telefono, mensaje);
    if (ok) notificados++; else erroresEnvio++;
  }

  console.log(`[cron] mes=${mes}/${anio} pagosCreados=${pagosCreados} vencidos=${marcadosVencidos} notificados=${notificados} errores=${erroresEnvio}`);

  return NextResponse.json({
    ok: true,
    mes: `${mes}/${anio}`,
    pagosCreados,
    marcadosVencidos,
    notificados,
    erroresEnvio,
  });
}

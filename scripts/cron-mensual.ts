/**
 * Cron mensual — ejecutar el 1° de cada mes.
 *
 * Hace tres cosas:
 *   1. Crea registros Pago PENDIENTE para el mes actual en todas las cuentas ACTIVA.
 *   2. Marca como VENCIDO los pagos PENDIENTE de meses anteriores.
 *   3. Envía WhatsApp vía Twilio a los clientes con deuda pendiente.
 *
 * No requiere Next.js corriendo ni Vercel. Conecta directo a Supabase + Twilio.
 *
 * Ejecutar manualmente (prueba):
 *   cd frontend/Ei-LandingPage
 *   set -a && source .env.local && set +a && npx tsx scripts/cron-mensual.ts
 *
 * OpenClaw lo llama automáticamente el 1° de cada mes.
 */

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// ─── Setup ────────────────────────────────────────────────────────────────────

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const MESES_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

// ─── WhatsApp via Twilio ───────────────────────────────────────────────────────

async function enviarWhatsApp(to10Digits: string, body: string): Promise<boolean> {
  const sid   = process.env.TWILIO_ACCOUNT_SID!;
  const token = process.env.TWILIO_AUTH_TOKEN!;
  const from  = `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`;
  const to    = `whatsapp:+549${to10Digits}`;

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ From: from, To: to, Body: body }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error(`  ✗ Twilio error → ${to}:`, (err as { message?: string }).message ?? res.status);
  }
  return res.ok;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const ahora = new Date();
  const mes   = ahora.getMonth() + 1;
  const anio  = ahora.getFullYear();

  console.log(`\n🗓  Cron mensual — ${MESES_ES[mes - 1]} ${anio}`);
  console.log("─".repeat(50));

  // ── 1. Crear pagos PENDIENTE para el mes actual ──────────────────────────

  const cuentasActivas = await prisma.cuenta.findMany({
    where: { estado: "ACTIVA" },
    select: { id: true, costo_mensual: true, softguard_ref: true },
  });

  console.log(`\n📋 Paso 1 — Generar pagos para ${MESES_ES[mes - 1]} ${anio}`);
  console.log(`   ${cuentasActivas.length} cuentas activas`);

  let pagosCreados = 0;
  let pagosYaExistian = 0;

  for (const cuenta of cuentasActivas) {
    const existe = await prisma.pago.findUnique({
      where: { cuenta_id_mes_anio: { cuenta_id: cuenta.id, mes, anio } },
      select: { id: true },
    });

    if (!existe) {
      await prisma.pago.create({
        data: {
          cuenta_id: cuenta.id,
          mes,
          anio,
          importe:  cuenta.costo_mensual,
          estado:   "PENDIENTE",
        },
      });
      pagosCreados++;
    } else {
      pagosYaExistian++;
    }
  }

  console.log(`   ✓ Creados: ${pagosCreados}  |  Ya existían: ${pagosYaExistian}`);

  // ── 2. Marcar como VENCIDO los PENDIENTE de meses anteriores ────────────

  console.log(`\n⏰ Paso 2 — Marcar vencidos`);

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

  console.log(`   ✓ Pagos marcados como VENCIDO: ${marcadosVencidos}`);

  // ── 3. Notificar por WhatsApp ────────────────────────────────────────────

  console.log(`\n💬 Paso 3 — Notificaciones WhatsApp`);

  if (!process.env.TWILIO_ACCOUNT_SID) {
    console.log("   ⚠ TWILIO_ACCOUNT_SID no configurado — omitiendo envíos");
    await prisma.$disconnect();
    return;
  }

  const perfilesConDeuda = await prisma.perfil.findMany({
    where: {
      activo: true,
      telefono: { not: null },
      cuentas: {
        some: {
          estado: { not: "BAJA_DEFINITIVA" },
          pagos: { some: { estado: { in: ["PENDIENTE", "VENCIDO"] } } },
        },
      },
    },
    select: {
      nombre:   true,
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

  console.log(`   ${perfilesConDeuda.length} clientes con deuda`);

  let notificados  = 0;
  let sinTelefono  = 0;
  let erroresEnvio = 0;

  for (const perfil of perfilesConDeuda) {
    if (!perfil.telefono) { sinTelefono++; continue; }

    // Armar lista de deudas
    const lineas: string[] = [];
    for (const cuenta of perfil.cuentas) {
      for (const pago of cuenta.pagos) {
        const mesLabel  = MESES_ES[pago.mes - 1];
        const esVencido = pago.estado === "VENCIDO";
        lineas.push(
          `• ${cuenta.descripcion}: ${mesLabel} ${pago.anio}${esVencido ? " ⚠️" : ""}`
        );
      }
    }

    if (lineas.length === 0) continue;

    const nombre    = perfil.nombre.split(" ")[0];
    const hayVenc   = lineas.some((l) => l.includes("⚠️"));
    const aviso     = hayVenc
      ? "\n\n⚠️ Algunos pagos están vencidos. Regularizalos a la brevedad para evitar la suspensión del servicio."
      : "";

    const mensaje =
      `Hola ${nombre}! 👋 Te recordamos que tenés pagos pendientes en *Escobar Instalaciones*:\n\n` +
      lineas.join("\n") +
      aviso +
      `\n\nPodés abonar desde tu portal o consultarnos por este WhatsApp. 🙌`;

    const ok = await enviarWhatsApp(perfil.telefono, mensaje);

    if (ok) {
      notificados++;
      console.log(`   ✓ ${perfil.nombre} (${perfil.telefono})`);
    } else {
      erroresEnvio++;
      console.log(`   ✗ ${perfil.nombre} (${perfil.telefono}) — fallo de envío`);
    }

    // Pausa mínima para no saturar la API de Twilio
    await new Promise((r) => setTimeout(r, 300));
  }

  // ── Resumen ──────────────────────────────────────────────────────────────

  console.log(`\n${"─".repeat(50)}`);
  console.log(`📊 Resumen final:`);
  console.log(`   Pagos creados:       ${pagosCreados}`);
  console.log(`   Pagos vencidos:      ${marcadosVencidos}`);
  console.log(`   Notificados:         ${notificados}`);
  console.log(`   Sin teléfono:        ${sinTelefono}`);
  console.log(`   Errores de envío:    ${erroresEnvio}`);
  console.log(`${"─".repeat(50)}\n`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Error fatal:", e);
  prisma.$disconnect();
  process.exit(1);
});

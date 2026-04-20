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

  // ── 0. Evaluar overrides de suspensión expirados ─────────────────────────

  console.log(`\n🔒 Paso 0 — Evaluar overrides expirados`);

  const overridesExpirados = await prisma.cuenta.findMany({
    where: {
      override_activo: true,
      override_expira: { lt: ahora },
    },
    select: {
      id: true,
      estado: true,
      descripcion: true,
      pagos: {
        where: { estado: { in: ["PENDIENTE", "VENCIDO"] } },
        select: { id: true },
      },
    },
  });

  console.log(`   ${overridesExpirados.length} override(s) expirado(s)`);

  for (const cuenta of overridesExpirados) {
    const tieneDeuda = cuenta.pagos.length > 0;

    if (tieneDeuda) {
      // Aún tiene deuda → revertir a SUSPENDIDA_PAGO
      await prisma.cuenta.update({
        where: { id: cuenta.id },
        data: {
          estado:                 "SUSPENDIDA_PAGO",
          override_activo:        false,
          override_expira:        null,
          override_justificacion: null,
        },
      });
      console.log(`   ↩ ${cuenta.descripcion} → SUSPENDIDA_PAGO (deuda pendiente)`);
    } else {
      // Pagó → solo limpiar el override, dejar ACTIVA
      await prisma.cuenta.update({
        where: { id: cuenta.id },
        data: {
          override_activo:        false,
          override_expira:        null,
          override_justificacion: null,
        },
      });
      console.log(`   ✓ ${cuenta.descripcion} → override limpiado (sin deuda)`);
    }

    // AuditLog manual (sin admin_id porque es el sistema)
    await prisma.auditLog.create({
      data: {
        admin_id:         "system",
        admin_nombre:     "Cron automático",
        accion:           tieneDeuda ? "OVERRIDE_EXPIRED_SUSPENDED" : "OVERRIDE_EXPIRED_CLEAN",
        entidad:          "cuenta",
        entidad_id:       cuenta.id,
        detalle:          JSON.stringify({ descripcion: cuenta.descripcion, deuda_pagos: cuenta.pagos.length }),
        state_transition: JSON.stringify({
          prior_state: tieneDeuda ? "ACTIVE_OVERRIDE" : "ACTIVE_OVERRIDE",
          new_state:   tieneDeuda ? "SUSPENDIDA_PAGO" : cuenta.estado,
        }),
      },
    });
  }

  // ── 1. Crear pagos PENDIENTE para el mes actual ──────────────────────────

  const [cuentasActivas, tarifaRow] = await Promise.all([
    prisma.cuenta.findMany({
      where: { estado: "ACTIVA" },
      select: { id: true, costo_mensual: true, softguard_ref: true },
    }),
    prisma.tarifaHistorico.findFirst({ orderBy: { vigente_desde: "desc" } }),
  ]);

  const tarifaEstandar = tarifaRow?.monto ?? 15000;

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
          importe:  cuenta.costo_mensual ?? tarifaEstandar,
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

  // ── 4. Preparar borradores de factura para el mes actual ────────────────

  console.log(`\n🧾 Paso 4 — Borradores de factura (${MESES_ES[mes - 1]} ${anio})`);

  const periodoDesde = new Date(anio, mes - 1, 1);
  const periodoHasta = new Date(anio, mes, 0);

  const tarifaRowFact = await prisma.tarifaHistorico.findFirst({ orderBy: { vigente_desde: "desc" } });
  const tarifaBase = tarifaRowFact?.monto ?? 15000;

  const perfilesFact = await prisma.perfil.findMany({
    where: {
      activo: true,
      requiere_factura: true,
      cuentas: { some: { estado: "ACTIVA" } },
    },
    include: {
      cuentas: {
        where: { estado: "ACTIVA" },
        select: { id: true, descripcion: true, costo_mensual: true },
      },
    },
  });

  let borradoresCreados = 0;
  let borradoresOmitidos = 0;

  for (const perfil of perfilesFact) {
    const existente = await prisma.factura.findFirst({
      where: { perfil_id: perfil.id, periodo_desde: periodoDesde, estado: { in: ["BORRADOR", "EMITIDA_MANUAL", "EMITIDA_WSFE"] } },
    });
    if (existente) { borradoresOmitidos++; continue; }

    const items = perfil.cuentas.map((c) => {
      const precio = c.costo_mensual ?? tarifaBase;
      return { cuenta_id: c.id, descripcion: "mantenimiento y servicio de alarma", cantidad: 1, precio_unit: precio, subtotal: precio };
    });
    const subtotal = items.reduce((s, it) => s + Number(it.subtotal), 0);
    const fechaVto = new Date(anio, mes - 1, 10);

    await prisma.factura.create({
      data: {
        perfil_id: perfil.id, tipo: "FACTURA_C",
        cuit_emisor: "20385573503", razon_social_emisor: "ESCOBAR RAMIRO ANIBAL",
        cuit_receptor: perfil.cuit ?? null, razon_social_receptor: perfil.razon_social ?? perfil.nombre,
        condicion_iva_receptor: perfil.condicion_iva ?? "RESPONSABLE_INSCRIPTO",
        periodo_desde: periodoDesde, periodo_hasta: periodoHasta,
        fecha_vto_pago: fechaVto, subtotal, iva: 0, total: subtotal,
        estado: "BORRADOR", generada_por: "system",
        items: { create: items },
      },
    });
    borradoresCreados++;
  }

  console.log(`   ✓ Creados: ${borradoresCreados}  |  Omitidos: ${borradoresOmitidos}`);

  // ── Resumen ──────────────────────────────────────────────────────────────

  console.log(`\n${"─".repeat(50)}`);
  console.log(`📊 Resumen final:`);
  console.log(`   Overrides expirados: ${overridesExpirados.length}`);
  console.log(`   Pagos creados:       ${pagosCreados}`);
  console.log(`   Pagos vencidos:      ${marcadosVencidos}`);
  console.log(`   Notificados:         ${notificados}`);
  console.log(`   Sin teléfono:        ${sinTelefono}`);
  console.log(`   Errores de envío:    ${erroresEnvio}`);
  console.log(`   Borradores fact.:    ${borradoresCreados}`);
  console.log(`${"─".repeat(50)}\n`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Error fatal:", e);
  prisma.$disconnect();
  process.exit(1);
});

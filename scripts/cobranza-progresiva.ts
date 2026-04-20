/**
 * Cobranza progresiva — ejecutar diariamente a las 09:00 ART.
 *
 * Escalada por días de mora:
 *   +5  → WhatsApp recordatorio cordial
 *   +10 → WhatsApp + notas en AuditLog
 *   +15 → WhatsApp + flag visible en portal (banner)
 *   +20 → WhatsApp a Ramiro para llamada manual
 *   +30 → Suspender cuenta automáticamente
 *
 * Ejecutar:
 *   cd frontend/Ei-LandingPage
 *   set -a && source .env.local && set +a && npx tsx scripts/cobranza-progresiva.ts
 */

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const RAMIRO_TELEFONO = process.env.RAMIRO_TELEFONO ?? "3436575372";

async function enviarWhatsApp(to10: string, body: string): Promise<boolean> {
  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from  = `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`;
  if (!sid || !token) return false;

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ From: from, To: `whatsapp:+549${to10}`, Body: body }),
  });
  return res.ok;
}

function diasDeMora(mes: number, anio: number): number {
  const vencimiento = new Date(anio, mes - 1, 1); // vence el 1 del mes siguiente
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const diffMs = hoy.getTime() - vencimiento.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

async function main() {
  const ahora = new Date();
  console.log(`\n💳 Cobranza progresiva — ${ahora.toLocaleDateString("es-AR")}`);
  console.log("─".repeat(50));

  const pagosVencidos = await prisma.pago.findMany({
    where: {
      estado: { in: ["PENDIENTE", "VENCIDO"] },
      cuenta: { estado: { not: "BAJA_DEFINITIVA" } },
    },
    include: {
      cuenta: {
        select: {
          id: true,
          descripcion: true,
          estado: true,
          override_activo: true,
          perfil: { select: { id: true, nombre: true, telefono: true } },
        },
      },
    },
  });

  // Agrupar por perfil (titular puede tener múltiples cuentas/pagos)
  const porPerfil = new Map<string, typeof pagosVencidos>();
  for (const pago of pagosVencidos) {
    const pid = pago.cuenta.perfil.id;
    if (!porPerfil.has(pid)) porPerfil.set(pid, []);
    porPerfil.get(pid)!.push(pago);
  }

  let suspendidos = 0;
  let notificados = 0;
  let alertadosAdmin = 0;

  for (const [, pagos] of porPerfil) {
    const perfil = pagos[0].cuenta.perfil;
    const maxMora = Math.max(...pagos.map((p) => diasDeMora(p.mes, p.anio)));
    const telefono = perfil.telefono;
    const nombre = perfil.nombre.split(" ")[0];

    if (maxMora < 5) continue; // sin acción

    const totalDeuda = pagos.reduce((s, p) => s + Number(p.importe), 0);

    // +30 → suspender
    if (maxMora >= 30) {
      const cuentasSinOverride = pagos
        .map((p) => p.cuenta)
        .filter((c, i, arr) => arr.findIndex((x) => x.id === c.id) === i)
        .filter((c) => c.estado === "ACTIVA" && !c.override_activo);

      for (const cuenta of cuentasSinOverride) {
        await prisma.cuenta.update({
          where: { id: cuenta.id },
          data: { estado: "SUSPENDIDA_PAGO" },
        });
        await prisma.auditLog.create({
          data: {
            admin_id: "system", admin_nombre: "Cron cobranza-progresiva",
            accion: "SUSPENSION_AUTOMATICA", entidad: "cuenta", entidad_id: cuenta.id,
            detalle: JSON.stringify({ dias_mora: maxMora, deuda: totalDeuda }),
            state_transition: JSON.stringify({ prior_state: "ACTIVA", new_state: "SUSPENDIDA_PAGO" }),
          },
        });
        suspendidos++;
        console.log(`   ⛔ Suspendido: ${perfil.nombre} — ${cuenta.descripcion} (+${maxMora}d mora)`);
      }
    }

    // +20 → alerta a Ramiro para llamada
    if (maxMora >= 20 && maxMora < 30 && RAMIRO_TELEFONO) {
      const msg =
        `📞 *Acción requerida — cliente moroso* (+${maxMora}d)\n\n` +
        `Cliente: ${perfil.nombre}\n` +
        `Deuda: $${totalDeuda.toLocaleString("es-AR")}\n` +
        `Llamar para regularizar manualmente.`;
      await enviarWhatsApp(RAMIRO_TELEFONO, msg);
      alertadosAdmin++;
      console.log(`   📞 Alerta admin — ${perfil.nombre} (+${maxMora}d)`);
    }

    // +5 → notificar al cliente
    if (maxMora >= 5 && telefono) {
      const escala =
        maxMora >= 15
          ? "⚠️ *Tu servicio será suspendido* si no regularizás antes de 15 días."
          : maxMora >= 10
          ? "Tu mora se acumula. Te pedimos que regularices cuanto antes."
          : "Recordatorio amigable de pago pendiente.";

      const msg =
        `Hola ${nombre}! Tenés un saldo pendiente de *$${totalDeuda.toLocaleString("es-AR")}* ` +
        `en Escobar Instalaciones.\n\n${escala}\n\n` +
        `Aboná fácil desde tu portal o respondé este mensaje. 🙌`;

      const ok = await enviarWhatsApp(telefono, msg);
      if (ok) {
        notificados++;
        console.log(`   ✉ Notificado: ${perfil.nombre} (+${maxMora}d mora) [$${totalDeuda.toLocaleString("es-AR")}]`);
      }

      await new Promise((r) => setTimeout(r, 300));
    }
  }

  console.log(`\n${"─".repeat(50)}`);
  console.log(`📊 Resumen:`);
  console.log(`   Clientes procesados: ${porPerfil.size}`);
  console.log(`   Notificados:         ${notificados}`);
  console.log(`   Alertas a admin:     ${alertadosAdmin}`);
  console.log(`   Cuentas suspendidas: ${suspendidos}`);
  console.log(`${"─".repeat(50)}\n`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Error fatal:", e);
  prisma.$disconnect();
  process.exit(1);
});

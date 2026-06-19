/**
 * Verifica cobertura de turnos para las próximas 72 horas.
 * Si hay franja sin monitor activo → envía WhatsApp a Ramiro.
 *
 * Ejecutar cada 4 horas desde el cron del servidor (o AGENTS.md):
 *   cd frontend/Ei-LandingPage
 *   set -a && source .env.local && set +a && npx tsx scripts/verificar-cobertura-turnos.ts
 */

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const FRANJAS = ["MANANA", "TARDE", "NOCHE"] as const;
const FRANJA_LABEL: Record<string, string> = {
  MANANA: "Mañana (06–14)",
  TARDE:  "Tarde (14–22)",
  NOCHE:  "Noche (22–06)",
};
const RAMIRO_TELEFONO = process.env.RAMIRO_TELEFONO ?? "3436575372";

async function enviarWhatsApp(to: string, body: string) {
  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from  = `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`;
  if (!sid || !token) { console.log("   ⚠ Twilio no configurado"); return; }

  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ From: from, To: `whatsapp:+549${to}`, Body: body }),
  });
}

function addDays(d: Date, n: number) {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}

async function main() {
  const ahora = new Date();
  ahora.setHours(0, 0, 0, 0);
  const hasta = addDays(ahora, 3);

  console.log(`\n🔍 Verificando cobertura de turnos (${ahora.toLocaleDateString("es-AR")} → +72h)`);
  console.log("─".repeat(50));

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

  if (huecos.length === 0) {
    console.log("   ✓ Cobertura completa — sin huecos");
    await prisma.$disconnect();
    return;
  }

  console.log(`   ⚠ ${huecos.length} hueco(s) detectado(s):`);
  huecos.forEach((h) =>
    console.log(`     ${h.fecha.toLocaleDateString("es-AR")} — ${FRANJA_LABEL[h.franja]}`)
  );

  const lineas = huecos.map(
    (h) => `• ${h.fecha.toLocaleDateString("es-AR")} — ${FRANJA_LABEL[h.franja]}`
  ).join("\n");

  const mensaje =
    `⚠️ *Alerta de cobertura de turnos*\n\n` +
    `Hay franjas sin monitor en las próximas 72 h:\n\n${lineas}\n\n` +
    `Asigná un reemplazo desde el panel: /admin/turnos`;

  await enviarWhatsApp(RAMIRO_TELEFONO, mensaje);
  console.log(`   ✓ Notificación enviada a Ramiro (${RAMIRO_TELEFONO})`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Error fatal:", e);
  prisma.$disconnect();
  process.exit(1);
});

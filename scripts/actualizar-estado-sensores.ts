/**
 * Actualiza el estado de cada sensor a partir de los eventos de alarma registrados:
 *
 *   ultima_activacion  ← fecha del evento más reciente para esa zona/cuenta
 *   bateria            ← derivado del evento E/R 30x más reciente:
 *                          E302 → ADVERTENCIA   (batería baja)
 *                          E309 → CRITICA        (falla de batería)
 *                          E301 → ADVERTENCIA   (pérdida de CA)
 *                          R30x → OPTIMA        (restaurado)
 *   alerta_mant        ← true si el evento E3xx más reciente es posterior
 *                        al R3xx correspondiente (avería sin resolver)
 *
 * Ejecutar:
 *   cd frontend/Ei-LandingPage
 *   npx dotenv -e .env.local -- npx tsx scripts/actualizar-estado-sensores.ts
 *
 * Dry-run (sin escribir):
 *   DRY_RUN=1 npx dotenv -e .env.local -- npx tsx scripts/actualizar-estado-sensores.ts
 */

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const DRY_RUN = process.env.DRY_RUN === "1";

type EstadoBateria = "OPTIMA" | "ADVERTENCIA" | "CRITICA";

// ── Clasificación Contact ID para eventos técnicos ──────────────────────────

function esTecnico(codigo: string): boolean {
  return /^[ER]3[0-9]{2}/.test(codigo.trim().toUpperCase());
}

function esRestauracion(codigo: string): boolean {
  return codigo.trim().toUpperCase().startsWith("R");
}

/** Batería a partir del código Contact ID de un evento técnico.
 *  Sólo aplica para E/R 30x. Retorna null si el código no es de batería/CA. */
function bateriaDesde(codigo: string): EstadoBateria | null {
  const c = codigo.trim().toUpperCase();
  if (/^R3/.test(c))   return "OPTIMA";
  if (/^E309/.test(c)) return "CRITICA";
  if (/^E30[12]/.test(c)) return "ADVERTENCIA";
  return null;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  if (DRY_RUN) console.log("⚠  DRY RUN — no se escribirá nada\n");

  // Carga todos los sensores activos
  const sensores = await prisma.sensor.findMany({
    where: { activa: true },
    select: { id: true, cuenta_id: true, codigo_zona: true, etiqueta: true },
  });
  console.log(`📡 ${sensores.length} sensores activos`);

  // Agrupa sensores por cuenta para hacer una sola query de eventos por cuenta
  const cuentasUnicas = [...new Set(sensores.map((s) => s.cuenta_id))];
  console.log(`🏠 ${cuentasUnicas.length} cuentas a procesar\n`);

  // Carga todos los eventos (todos los años) de las cuentas relevantes,
  // ordenados del más reciente al más antiguo.
  const eventos = await prisma.eventoAlarma.findMany({
    where: {
      cuenta_id: { in: cuentasUnicas },
      zona: { not: null },
    },
    select: { cuenta_id: true, zona: true, fecha_evento: true, codigo: true },
    orderBy: { fecha_evento: "desc" },
  });
  console.log(`📋 ${eventos.length} eventos cargados`);

  // Construye mapa: "cuentaId|zona" → eventos (ya en orden DESC)
  const mapaEventos = new Map<string, typeof eventos>();
  for (const ev of eventos) {
    if (!ev.cuenta_id || !ev.zona) continue;
    const key = `${ev.cuenta_id}|${ev.zona}`;
    const lista = mapaEventos.get(key);
    if (lista) lista.push(ev);
    else mapaEventos.set(key, [ev]);
  }

  let actualizados = 0;
  let sinEventos   = 0;
  let errores      = 0;

  for (const sensor of sensores) {
    const key    = `${sensor.cuenta_id}|${sensor.codigo_zona}`;
    const evs    = mapaEventos.get(key) ?? [];

    if (evs.length === 0) {
      sinEventos++;
      continue;
    }

    // ultima_activacion = evento más reciente (lista ya está en orden DESC)
    const ultimaActivacion = evs[0].fecha_evento;

    // Buscar el evento técnico más reciente para batería y alerta_mant
    const ultimoTecnico = evs.find((e) => esTecnico(e.codigo));

    let bateria: EstadoBateria | null = null;
    let alertaMant = false;

    if (ultimoTecnico) {
      bateria    = bateriaDesde(ultimoTecnico.codigo);
      alertaMant = !esRestauracion(ultimoTecnico.codigo);
    }

    if (DRY_RUN) {
      console.log(
        `  [DRY] ${sensor.etiqueta.padEnd(30)} | última: ${ultimaActivacion.toISOString().slice(0, 16)}` +
        `${bateria ? ` | bat: ${bateria}` : ""}${alertaMant ? " | ⚠ mant" : ""}`
      );
      actualizados++;
      continue;
    }

    try {
      await prisma.sensor.update({
        where: { id: sensor.id },
        data: {
          ultima_activacion: ultimaActivacion,
          ...(bateria !== null ? { bateria } : {}),
          alerta_mant: alertaMant,
        },
      });
      actualizados++;
    } catch (err) {
      console.error(`  ✗ ${sensor.etiqueta}: ${(err as Error).message.split("\n")[0]}`);
      errores++;
    }
  }

  console.log(`\n${"─".repeat(60)}`);
  console.log(`📊 Resumen:`);
  console.log(`   Sensores actualizados : ${actualizados}`);
  console.log(`   Sin eventos asociados : ${sinEventos}`);
  console.log(`   Errores               : ${errores}`);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });

/**
 * Marca todos los pagos como PAGADO desde enero hasta abril 2026.
 * Idempotente: usa upsert — si el pago ya existe lo actualiza a PAGADO.
 *
 * Ejecutar:
 *   cd frontend/Ei-LandingPage
 *   npx dotenv -e .env.local -- npx tsx scripts/marcar-pagos-hasta-abril.ts
 */

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const MESES = [1, 2, 3, 4]; // enero → abril 2026
const ANIO = 2026;
const METODO = "EFECTIVO" as const;
const REGISTRADO_POR = "Ariel Escobar (carga inicial)";

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  const tarifaRow = await prisma.tarifaHistorico.findFirst({ orderBy: { vigente_desde: "desc" } });
  const tarifaEstandar = tarifaRow?.monto ?? 15000;

  // Traer todas las cuentas activas
  const cuentas = await prisma.cuenta.findMany({
    where: { estado: { not: "BAJA_DEFINITIVA" } },
    select: { id: true, softguard_ref: true, descripcion: true, costo_mensual: true, perfil: { select: { nombre: true } } },
  });

  console.log(`✓ ${cuentas.length} cuentas activas encontradas`);

  let creados = 0;
  let actualizados = 0;
  let errores = 0;

  for (const cuenta of cuentas) {
    for (const mes of MESES) {
      try {
        const result = await prisma.pago.upsert({
          where: { cuenta_id_mes_anio: { cuenta_id: cuenta.id, mes, anio: ANIO } },
          create: {
            cuenta_id: cuenta.id,
            mes,
            anio: ANIO,
            importe: cuenta.costo_mensual ?? tarifaEstandar,
            estado: "PAGADO",
            metodo: METODO,
            acreditado_en: new Date(`${ANIO}-${String(mes).padStart(2, "0")}-01`),
            registrado_por: REGISTRADO_POR,
          },
          update: {
            estado: "PAGADO",
            metodo: METODO,
            acreditado_en: new Date(`${ANIO}-${String(mes).padStart(2, "0")}-01`),
            registrado_por: REGISTRADO_POR,
          },
        });
        // Simple heuristic: if created_at === updated_at it's new
        const isNew = result.created_at.getTime() === result.updated_at.getTime();
        if (isNew) creados++; else actualizados++;
      } catch (err) {
        console.error(`  ✗ ${cuenta.softguard_ref} mes ${mes}: ${(err as Error).message.split("\n")[0]}`);
        errores++;
      }
    }
  }

  console.log(`\n📊 Resumen:`);
  console.log(`   Pagos creados:     ${creados}`);
  console.log(`   Pagos actualizados: ${actualizados}`);
  console.log(`   Errores:            ${errores}`);
  console.log(`   Total esperado:     ${cuentas.length * MESES.length}`);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });

/**
 * Backfill: crea la fila Empleado para perfiles rol TECNICO que no la tienen.
 *
 * Contexto: el alta vieja de /admin/tecnicos/nuevo creaba solo el Perfil,
 * por lo que esos técnicos no aparecen en /admin/trabajadores (que parte
 * de prisma.empleado). Idempotente: re-ejecutar no duplica.
 *
 * Ejecutar una vez antes de eliminar /admin/tecnicos:
 *   cd apps/web
 *   set -a && source .env.local && set +a && npx tsx scripts/backfill-empleados-tecnicos.ts
 */

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const huerfanos = await prisma.perfil.findMany({
    where: { rol: "TECNICO", empleado: null },
    select: { id: true, nombre: true, email: true },
  });

  if (huerfanos.length === 0) {
    console.log("No hay perfiles TECNICO sin fila Empleado. Nada que hacer.");
    return;
  }

  for (const perfil of huerfanos) {
    const empleado = await prisma.empleado.create({
      data: {
        perfil_id: perfil.id,
        rol_empleado: "TECNICO",
        puede_instalar: true,
      },
    });
    console.log(`✔ Empleado ${empleado.id} creado para ${perfil.nombre} (${perfil.email})`);
  }

  console.log(`Backfill completo: ${huerfanos.length} empleado(s) creado(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

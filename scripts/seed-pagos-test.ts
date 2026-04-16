// scripts/seed-pagos-test.ts
// Crea pagos VENCIDO y PENDIENTE para los clientes de prueba.
// Uso: npx tsx scripts/seed-pagos-test.ts

import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const DB_URL =
  'postgresql://postgres.zwpcimwljiirlcgxnjqc:Artifex.1894@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true';

const adapter = new PrismaPg({ connectionString: DB_URL });
const prisma = new PrismaClient({ adapter });

const MESES = [
  '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

async function main() {
  const emails = ['cliente@ejemplo.com', 'cliente@ejemplo2.com'];

  const perfiles = await prisma.perfil.findMany({
    where: { email: { in: emails } },
    include: {
      cuentas: {
        where: { estado: { not: 'BAJA_DEFINITIVA' } },
        select: { id: true, descripcion: true, costo_mensual: true },
      },
    },
  });

  if (perfiles.length === 0) {
    console.error('❌ No se encontraron perfiles. ¿Están creados los clientes de prueba?');
    return;
  }

  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mesActual = hoy.getMonth() + 1;
  const mesAnterior = mesActual === 1 ? 12 : mesActual - 1;
  const anioAnterior = mesActual === 1 ? anio - 1 : anio;

  for (const perfil of perfiles) {
    console.log(`\n→ ${perfil.email} — ${perfil.nombre}`);

    if (perfil.cuentas.length === 0) {
      console.log('  Sin cuentas activas.');
      continue;
    }

    for (const cuenta of perfil.cuentas) {
      const importe = Number(cuenta.costo_mensual);
      console.log(`  Cuenta: "${cuenta.descripcion}"`);

      const pagosACrear = [
        { mes: mesAnterior, anio: anioAnterior, estado: 'VENCIDO' as const },
        { mes: mesActual,   anio,               estado: 'PENDIENTE' as const },
      ];

      for (const p of pagosACrear) {
        await prisma.pago.upsert({
          where: {
            cuenta_id_mes_anio: { cuenta_id: cuenta.id, mes: p.mes, anio: p.anio },
          },
          update: { estado: p.estado, importe },
          create: { cuenta_id: cuenta.id, mes: p.mes, anio: p.anio, importe, estado: p.estado },
        });
        console.log(`    ✓ ${MESES[p.mes]} ${p.anio} → ${p.estado} ($${importe.toLocaleString('es-AR')})`);
      }
    }
  }

  console.log('\n✅ Listo.');
}

main()
  .catch((e: Error) => { console.error(e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());

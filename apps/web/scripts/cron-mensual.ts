/**
 * Cron mensual — entry point CLI (ejecutar el 1° de cada mes).
 *
 * Toda la lógica vive en src/lib/cron/cierre-mensual.ts (fuente ÚNICA,
 * compartida con el endpoint HTTP /api/cron). Este archivo solo ejecuta el
 * cierre e imprime el resumen.
 *
 * Ejecutar:
 *   cd frontend/Ei-LandingPage
 *   set -a && source .env.local && set +a && npx tsx scripts/cron-mensual.ts
 *
 * OpenClaw lo llama automáticamente el 1° de cada mes.
 */

import { prisma } from "@/lib/prisma/client";
import { ejecutarCierreMensual } from "@/lib/cron/cierre-mensual";

async function main() {
  const r = await ejecutarCierreMensual(prisma, (msg) => console.log(msg));

  console.log(`\n${"─".repeat(50)}`);
  console.log("📊 Resumen final:");
  console.log(`   Overrides revertidos: ${r.overridesRevertidos}`);
  console.log(`   Overrides limpiados:  ${r.overridesLimpiados}`);
  console.log(`   Pagos creados:        ${r.pagosCreados}`);
  console.log(`   Pagos vencidos:       ${r.marcadosVencidos}`);
  console.log(`   Notificados:          ${r.notificados}`);
  console.log(`   Ya avisados (skip):   ${r.yaAvisados}`);
  console.log(`   Sin teléfono:         ${r.sinTelefono}`);
  console.log(`   Errores de envío:     ${r.erroresEnvio}`);
  console.log(`   Borradores factura:   ${r.facturasBorradores} (omitidos ${r.facturasOmitidas})`);
  console.log(`${"─".repeat(50)}\n`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Error fatal:", e);
  prisma.$disconnect();
  process.exit(1);
});

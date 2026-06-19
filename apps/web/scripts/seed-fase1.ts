/**
 * Seed de Fase 1 — Vehículo y Empleados
 * Uso: npx tsx scripts/seed-fase1.ts
 *
 * - Crea el vehículo de la empresa si no existe.
 * - Para cada empleado: busca su Perfil por email y crea el registro Empleado.
 *   Si el perfil no existe en la BD, lo omite e informa.
 */

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ── Vehículo ──────────────────────────────────────────────────────────────────

const VEHICULO = {
  patente:              "AF628CN",
  marca:                "Renault",
  modelo:               "Kangoo",
  anio:                 2018,
  km_actual:            80000,
  proximo_service_km:   85000,  // próximo service a los 85.000 km — ajustá si sabés el real
  observaciones:        "Vehículo de campo de Ariel. Usar reservas para coordinar con OT.",
};

// ── Empleados — completar emails cuando los perfiles existan en el portal ─────
// Si el perfil todavía no existe, la fila se omite y se informa por consola.

const EMPLEADOS: {
  email: string;
  nombre_display: string;
  rol_empleado: "ADMIN_GENERAL" | "MONITOR" | "TECNICO" | "ADMINISTRATIVO";
  puede_monitorear: boolean;
  puede_instalar: boolean;
  puede_facturar: boolean;
  color_calendario: string;
}[] = [
  {
    email:            "admin@instalacionescob.ar",
    nombre_display:   "Ramiro Escobar",
    rol_empleado:     "ADMIN_GENERAL",
    puede_monitorear: true,
    puede_instalar:   false,
    puede_facturar:   true,
    color_calendario: "#6366f1",
  },
  {
    email:            "COMPLETAR_EMAIL_CANDELA",
    nombre_display:   "Candela Belen Bejariel",
    rol_empleado:     "MONITOR",
    puede_monitorear: true,
    puede_instalar:   false,
    puede_facturar:   false,
    color_calendario: "#ec4899",
  },
  {
    email:            "COMPLETAR_EMAIL_CARINA",
    nombre_display:   "Carina Carneiro",
    rol_empleado:     "MONITOR",
    puede_monitorear: true,
    puede_instalar:   false,
    puede_facturar:   false,
    color_calendario: "#22c55e",
  },
  {
    email:            "COMPLETAR_EMAIL_PAULA",
    nombre_display:   "Paula",
    rol_empleado:     "MONITOR",
    puede_monitorear: true,
    puede_instalar:   false,
    puede_facturar:   false,
    color_calendario: "#f59e0b",
  },
  {
    email:            "arielescobar3110@gmail.com",
    nombre_display:   "Ariel Escobar",
    rol_empleado:     "TECNICO",
    puede_monitorear: true,   // puede cubrir turno de monitor en emergencia
    puede_instalar:   true,
    puede_facturar:   false,
    color_calendario: "#ef4444",
  },
];

// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log("── Seed Fase 1 ──────────────────────────────────────────────");

  // 1. Vehículo
  const vehiculoExistente = await prisma.vehiculo.findUnique({
    where: { patente: VEHICULO.patente },
  });

  if (vehiculoExistente) {
    console.log(`✓ Vehículo ${VEHICULO.patente} ya existe — omitiendo.`);
  } else {
    await prisma.vehiculo.create({ data: VEHICULO });
    console.log(`✓ Vehículo ${VEHICULO.marca} ${VEHICULO.modelo} (${VEHICULO.patente}) creado.`);
  }

  // 2. Empleados
  console.log("\n── Empleados ─────────────────────────────────────────────────");

  for (const emp of EMPLEADOS) {
    if (emp.email.startsWith("COMPLETAR_")) {
      console.log(`⏭  ${emp.nombre_display} — email sin completar, omitido.`);
      continue;
    }

    const perfil = await prisma.perfil.findUnique({ where: { email: emp.email } });

    if (!perfil) {
      console.log(`✗  ${emp.nombre_display} — no se encontró perfil con email ${emp.email}`);
      continue;
    }

    // Asegurarse que el perfil tenga rol ADMIN (requisito para acceder al panel)
    if (perfil.rol !== "ADMIN") {
      await prisma.perfil.update({ where: { id: perfil.id }, data: { rol: "ADMIN" } });
      console.log(`  → Perfil de ${emp.nombre_display} actualizado a rol ADMIN.`);
    }

    const empleadoExistente = await prisma.empleado.findUnique({
      where: { perfil_id: perfil.id },
    });

    if (empleadoExistente) {
      console.log(`✓  ${emp.nombre_display} — empleado ya existe, omitiendo.`);
      continue;
    }

    await prisma.empleado.create({
      data: {
        perfil_id:        perfil.id,
        rol_empleado:     emp.rol_empleado,
        puede_monitorear: emp.puede_monitorear,
        puede_instalar:   emp.puede_instalar,
        puede_facturar:   emp.puede_facturar,
        color_calendario: emp.color_calendario,
      },
    });

    console.log(`✓  ${emp.nombre_display} (${emp.rol_empleado}) creado.`);
  }

  console.log("\n── Listo ─────────────────────────────────────────────────────");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

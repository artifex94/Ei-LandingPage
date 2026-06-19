/**
 * Crea cuentas Supabase + Perfil + Empleado para Candela, Carina y Paula.
 * Uso: npx tsx --env-file=.env.local scripts/crear-empleadas.ts
 */

import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const NUEVAS_EMPLEADAS: {
  email: string;
  password: string;
  nombre: string;
  telefono?: string;
  rol_empleado: "MONITOR" | "ADMINISTRATIVO";
  puede_monitorear: boolean;
  puede_instalar: boolean;
  puede_facturar: boolean;
  color_calendario: string;
}[] = [
  {
    email:            "candela@interno.escobarinstalaciones.ar",
    password:         "Candela.EI2024!",
    nombre:           "Candela Belen Bejariel",
    rol_empleado:     "MONITOR",
    puede_monitorear: true,
    puede_instalar:   false,
    puede_facturar:   false,
    color_calendario: "#ec4899",
  },
  {
    email:            "carina@interno.escobarinstalaciones.ar",
    password:         "Carina.EI2024!",
    nombre:           "Carina Carneiro",
    rol_empleado:     "MONITOR",
    puede_monitorear: true,
    puede_instalar:   false,
    puede_facturar:   false,
    color_calendario: "#22c55e",
  },
  {
    email:            "paula@interno.escobarinstalaciones.ar",
    password:         "Paula.EI2024!",
    nombre:           "Paula",
    rol_empleado:     "MONITOR",
    puede_monitorear: true,
    puede_instalar:   false,
    puede_facturar:   false,
    color_calendario: "#f59e0b",
  },
];

async function main() {
  console.log("── Crear empleadas ──────────────────────────────────────────\n");

  for (const emp of NUEVAS_EMPLEADAS) {
    console.log(`Procesando: ${emp.nombre}`);

    // 1. Crear usuario en Supabase Auth
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email:          emp.email,
        password:       emp.password,
        email_confirm:  true,
      });

    let userId: string;

    if (authError) {
      if (authError.message.includes("already been registered")) {
        console.log(`  ⚠  Auth ya existe para ${emp.email}`);
        const { data: list } = await supabaseAdmin.auth.admin.listUsers();
        const existing = list?.users?.find((u) => u.email === emp.email);
        if (!existing) { console.log(`  ✗  No se pudo recuperar el usuario.`); continue; }
        userId = existing.id;
      } else {
        console.log(`  ✗  Error Auth: ${authError.message}`);
        continue;
      }
    } else {
      userId = authData.user.id;
    }

    console.log(`  ✓ Auth creada (id: ${userId})`);

    // 2. Crear Perfil si no existe
    const perfilExistente = await prisma.perfil.findUnique({ where: { id: userId } });

    if (!perfilExistente) {
      await prisma.perfil.create({
        data: {
          id:     userId,
          nombre: emp.nombre,
          email:  emp.email,
          rol:    "ADMIN",
          activo: true,
        },
      });
      console.log(`  ✓ Perfil creado`);
    } else {
      // Asegurar rol ADMIN
      if (perfilExistente.rol !== "ADMIN") {
        await prisma.perfil.update({ where: { id: userId }, data: { rol: "ADMIN" } });
      }
      console.log(`  ✓ Perfil ya existía`);
    }

    // 3. Crear Empleado si no existe
    const empExistente = await prisma.empleado.findUnique({ where: { perfil_id: userId } });

    if (!empExistente) {
      await prisma.empleado.create({
        data: {
          perfil_id:        userId,
          rol_empleado:     emp.rol_empleado,
          puede_monitorear: emp.puede_monitorear,
          puede_instalar:   emp.puede_instalar,
          puede_facturar:   emp.puede_facturar,
          color_calendario: emp.color_calendario,
        },
      });
      console.log(`  ✓ Empleado creado (${emp.rol_empleado})`);
    } else {
      console.log(`  ✓ Empleado ya existía`);
    }

    console.log();
  }

  console.log("── Credenciales temporales ──────────────────────────────────");
  for (const emp of NUEVAS_EMPLEADAS) {
    console.log(`  ${emp.nombre.padEnd(28)} ${emp.email}  /  ${emp.password}`);
  }
  console.log("\n  ⚠  Compartir estas credenciales de forma segura (no por chat).");
  console.log("  Cada empleada puede cambiar su contraseña desde /portal/perfil.\n");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

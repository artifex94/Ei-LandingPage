/**
 * Crea usuarios de EJEMPLO (auth + Perfil + Empleado) para probar las áreas
 * operativas aisladas: Monitoreo, Cobros y Servicio Técnico.
 *
 * Modelo de auth (ver memoria "areas-agente-capacidad"):
 *   - Rol = TECNICO  → empleado interno, NO ve /admin ni /portal.
 *   - El flag puede_* desbloquea su área y define el aterrizaje post-login:
 *       puede_monitorear → /monitoreo
 *       puede_facturar   → /cobros
 *       puede_instalar   → /tecnico/mi-dia
 *
 * Idempotente: re-ejecutar no duplica (reutiliza el usuario de Auth existente).
 *
 * Uso (desde apps/web, con tus credenciales reales de Supabase):
 *   npx tsx --env-file=.env.local scripts/crear-agentes-demo.ts
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

type AgenteDemo = {
  email: string;
  password: string;
  nombre: string;
  area: string;
  rol_empleado: "MONITOR" | "ADMINISTRATIVO" | "TECNICO";
  puede_monitorear: boolean;
  puede_facturar: boolean;
  puede_instalar: boolean;
  color_calendario: string;
};

const AGENTES: AgenteDemo[] = [
  {
    email: "demo.monitoreo@escobarinstalaciones.ar",
    password: "Monitoreo.Demo2026!",
    nombre: "Demo Monitoreo",
    area: "/monitoreo",
    rol_empleado: "MONITOR",
    puede_monitorear: true,
    puede_facturar: false,
    puede_instalar: false,
    color_calendario: "#38bdf8",
  },
  {
    email: "demo.cobros@escobarinstalaciones.ar",
    password: "Cobros.Demo2026!",
    nombre: "Demo Cobros",
    area: "/cobros",
    rol_empleado: "ADMINISTRATIVO",
    puede_monitorear: false,
    puede_facturar: true,
    puede_instalar: false,
    color_calendario: "#f59e0b",
  },
  {
    email: "demo.tecnico@escobarinstalaciones.ar",
    password: "Tecnico.Demo2026!",
    nombre: "Demo Servicio Técnico",
    area: "/tecnico/mi-dia",
    rol_empleado: "TECNICO",
    puede_monitorear: false,
    puede_facturar: false,
    puede_instalar: true,
    color_calendario: "#22c55e",
  },
];

async function main() {
  console.log("── Crear agentes de ejemplo ─────────────────────────────────\n");

  for (const a of AGENTES) {
    console.log(`Procesando: ${a.nombre} (${a.area})`);

    // 1. Usuario en Supabase Auth
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: a.email,
        password: a.password,
        email_confirm: true,
      });

    let userId: string;
    if (authError) {
      if (authError.message.includes("already been registered")) {
        const { data: list } = await supabaseAdmin.auth.admin.listUsers();
        const existing = list?.users?.find((u) => u.email === a.email);
        if (!existing) {
          console.log(`  ✗ No se pudo recuperar el usuario existente.`);
          continue;
        }
        userId = existing.id;
        // Asegurar la contraseña conocida si el usuario ya existía.
        await supabaseAdmin.auth.admin.updateUserById(userId, { password: a.password });
        console.log(`  ⚠ Auth ya existía (id: ${userId}) — contraseña reseteada`);
      } else {
        console.log(`  ✗ Error Auth: ${authError.message}`);
        continue;
      }
    } else {
      userId = authData.user.id;
      console.log(`  ✓ Auth creada (id: ${userId})`);
    }

    // 2. Perfil (rol TECNICO = empleado interno, NO admin)
    await prisma.perfil.upsert({
      where: { id: userId },
      create: {
        id: userId,
        nombre: a.nombre,
        email: a.email,
        rol: "TECNICO",
        activo: true,
      },
      update: { rol: "TECNICO", activo: true },
    });
    console.log(`  ✓ Perfil (rol TECNICO)`);

    // 3. Empleado con el flag de capacidad de su área
    await prisma.empleado.upsert({
      where: { perfil_id: userId },
      create: {
        perfil_id: userId,
        rol_empleado: a.rol_empleado,
        puede_monitorear: a.puede_monitorear,
        puede_facturar: a.puede_facturar,
        puede_instalar: a.puede_instalar,
        activo: true,
        color_calendario: a.color_calendario,
      },
      update: {
        rol_empleado: a.rol_empleado,
        puede_monitorear: a.puede_monitorear,
        puede_facturar: a.puede_facturar,
        puede_instalar: a.puede_instalar,
        activo: true,
      },
    });
    console.log(`  ✓ Empleado (${a.rol_empleado})\n`);
  }

  console.log("── Credenciales de los usuarios de ejemplo ──────────────────");
  console.log("  Ingresar en /login con email + contraseña.\n");
  for (const a of AGENTES) {
    console.log(`  ${a.area.padEnd(16)} ${a.email}  /  ${a.password}`);
  }
  console.log("\n  ⚠ Son cuentas de PRUEBA. Borralas o cambiá las contraseñas antes de producción.\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

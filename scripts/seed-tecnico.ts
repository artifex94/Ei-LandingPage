/**
 * Crea un perfil de técnico en Supabase Auth + Prisma.
 * Uso: set -a && source .env.local && set +a && npx tsx scripts/seed-tecnico.ts
 */

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createClient } from "@supabase/supabase-js";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const NOMBRE   = "Técnico Demo";
const EMAIL    = "tecnico@ejemplo.com";
const TELEFONO = undefined;
const PASSWORD = "Tecnico.1234";

async function main() {
  console.log(`\n👤 Creando técnico: ${EMAIL}`);

  // Verificar si ya existe en Prisma
  const existente = await prisma.perfil.findFirst({
    where: { email: { equals: EMAIL, mode: "insensitive" } },
  });
  if (existente) {
    console.log("   ⚠ Ya existe un perfil con ese email — abortando.");
    await prisma.$disconnect();
    return;
  }

  // Crear en Supabase Auth
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    user_metadata: { nombre: NOMBRE },
    email_confirm: true,
  });

  if (error) {
    console.error("   ✗ Error Supabase Auth:", error.message);
    await prisma.$disconnect();
    process.exit(1);
  }

  const userId = data.user.id;

  // Crear Perfil en la BD
  await prisma.perfil.create({
    data: {
      id: userId,
      nombre: NOMBRE,
      email: EMAIL,
      ...(TELEFONO ? { telefono: TELEFONO } : {}),
      rol: "TECNICO",
      activo: true,
    },
  });

  console.log(`   ✓ Usuario creado — id: ${userId}`);
  console.log(`   ✓ Perfil Prisma creado con rol TECNICO`);
  console.log(`\n   Email:      ${EMAIL}`);
  console.log(`   Contraseña: ${PASSWORD}`);
  console.log(`   Portal:     /tecnico\n`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Error fatal:", e);
  prisma.$disconnect();
  process.exit(1);
});

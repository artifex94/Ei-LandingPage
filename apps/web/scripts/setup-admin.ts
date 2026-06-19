import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  const email = "arielescobar3110@gmail.com";
  const { data: users } = await supabaseAdmin.auth.admin.listUsers();
  const user = users?.users?.find(u => u.email === email);

  if (!user) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email, email_confirm: true, user_metadata: { nombre: "Ariel Escobar" },
    });
    if (error || !data.user) throw error;
    await prisma.perfil.create({
      data: { id: data.user.id, nombre: "Ariel Escobar", email, rol: "ADMIN", activo: true },
    });
    console.log("✓ Admin creado:", data.user.id);
  } else {
    await prisma.perfil.upsert({
      where: { id: user.id },
      update: { rol: "ADMIN", nombre: "Ariel Escobar", email },
      create: { id: user.id, nombre: "Ariel Escobar", email, rol: "ADMIN", activo: true },
    });
    console.log("✓ Admin configurado:", user.id, "→ rol=ADMIN");
  }
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });

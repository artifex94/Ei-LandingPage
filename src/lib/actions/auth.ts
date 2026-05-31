"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const perfil = await prisma.perfil.findUnique({ where: { id: user.id } });
  if (perfil?.rol !== "ADMIN") return null;
  return perfil;
}

export async function requireAdminWithName() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const perfil = await prisma.perfil.findUnique({
    where: { id: user.id },
    select: { rol: true, nombre: true },
  });
  if (perfil?.rol !== "ADMIN") return null;
  return { id: user.id, nombre: perfil.nombre };
}

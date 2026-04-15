"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma/client";

const nuevoClienteSchema = z.object({
  nombre: z.string().min(2, "El nombre es obligatorio"),
  dni: z.string().optional().transform((v) => v || undefined),
  telefono: z.string().optional().transform((v) => v || undefined),
  email: z.string().email("Email inválido"),
});

export interface ClienteActionResult {
  errores?: string[];
}

export async function crearCliente(
  prevState: ClienteActionResult,
  formData: FormData
): Promise<ClienteActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const perfil = await prisma.perfil.findUnique({ where: { id: user.id } });
  if (perfil?.rol !== "ADMIN") {
    return { errores: ["Sin permisos de administrador."] };
  }

  const parsed = nuevoClienteSchema.safeParse({
    nombre: formData.get("nombre"),
    dni: formData.get("dni"),
    telefono: formData.get("telefono"),
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { errores: parsed.error.issues.map((i) => i.message) };
  }

  const { nombre, dni, telefono, email } = parsed.data;

  // Verificar DNI duplicado
  if (dni) {
    const existente = await prisma.perfil.findUnique({ where: { dni } });
    if (existente) {
      return { errores: [`Ya existe un cliente con el DNI ${dni}.`] };
    }
  }

  const adminAuth = createAdminClient();
  const { data: authData, error: authError } =
    await adminAuth.auth.admin.createUser({
      email,
      user_metadata: { nombre, ...(dni && { dni }) },
      email_confirm: true,
    });

  if (authError) {
    return { errores: [`Error al crear usuario: ${authError.message}`] };
  }

  await prisma.perfil.create({
    data: {
      id: authData.user.id,
      nombre,
      ...(dni && { dni }),
      ...(telefono && { telefono }),
      email,
      rol: "CLIENTE",
    },
  });

  redirect("/admin/clientes");
}

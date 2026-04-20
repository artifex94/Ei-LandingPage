"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma/client";
import { registrarAudit } from "@/lib/audit";

export interface TecnicoActionResult {
  ok?: boolean;
  errores?: string[];
}

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const perfil = await prisma.perfil.findUnique({ where: { id: user.id } });
  if (perfil?.rol !== "ADMIN") return null;
  return perfil;
}

const nuevoTecnicoSchema = z.object({
  nombre: z.string().min(2, "El nombre es obligatorio"),
  email: z.string().email("Email inválido"),
  telefono: z.string().optional().transform((v) => v || undefined),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

export async function crearTecnico(
  prevState: TecnicoActionResult,
  formData: FormData
): Promise<TecnicoActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { errores: ["Sin permisos de administrador."] };

  const parsed = nuevoTecnicoSchema.safeParse({
    nombre: formData.get("nombre"),
    email: formData.get("email"),
    telefono: formData.get("telefono"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { errores: parsed.error.issues.map((i) => i.message) };
  }

  const { nombre, email, telefono, password } = parsed.data;

  const existente = await prisma.perfil.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });
  if (existente) {
    return { errores: [`Ya existe un usuario con el email ${email}.`] };
  }

  const adminAuth = createAdminClient();
  const { data: authData, error: authError } = await adminAuth.auth.admin.createUser({
    email,
    password,
    user_metadata: { nombre },
    email_confirm: true,
  });

  if (authError) {
    return { errores: [`Error al crear usuario: ${authError.message}`] };
  }

  await prisma.perfil.create({
    data: {
      id: authData.user.id,
      nombre,
      email,
      ...(telefono && { telefono }),
      rol: "TECNICO",
    },
  });

  await registrarAudit({
    admin_id: admin.id,
    admin_nombre: admin.nombre,
    accion: "TECNICO_CREADO",
    entidad: "perfil",
    entidad_id: authData.user.id,
    detalle: { nombre, email },
  });

  redirect("/admin/tecnicos");
}

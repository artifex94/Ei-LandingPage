"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma/client";
import { registrarAudit } from "@/lib/audit";
import type { Rol } from "@/generated/prisma/client";

export interface EmpleadoActionResult {
  ok?: boolean;
  errores?: string[];
}

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const perfil = await prisma.perfil.findUnique({ where: { id: user.id } });
  if (perfil?.rol !== "ADMIN") return null;
  return perfil;
}

function rolPerfilDesdeEmpleado(rolEmpleado: string): Rol {
  return rolEmpleado === "ADMIN_GENERAL" ? "ADMIN" : "TECNICO";
}

// ── Crear empleado ─────────────────────────────────────────────────────────────

const nuevoEmpleadoSchema = z.object({
  nombre:           z.string().min(2, "El nombre es obligatorio"),
  email:            z.string().email("Email inválido"),
  dni:              z.string().optional().transform((v) => v || undefined),
  telefono:         z.string().optional().transform((v) => v || undefined),
  rol_empleado:     z.enum(["ADMIN_GENERAL", "MONITOR", "TECNICO", "ADMINISTRATIVO"], {
    error: "El rol de empleado es obligatorio",
  }),
  puede_monitorear: z.string().optional().transform((v) => v === "on"),
  puede_instalar:   z.string().optional().transform((v) => v === "on"),
  puede_facturar:   z.string().optional().transform((v) => v === "on"),
  color_calendario: z.string().optional().transform((v) => v || undefined),
});

export async function crearEmpleado(
  prevState: EmpleadoActionResult,
  formData: FormData
): Promise<EmpleadoActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { errores: ["Sin permisos de administrador."] };

  const parsed = nuevoEmpleadoSchema.safeParse({
    nombre:           formData.get("nombre"),
    email:            formData.get("email"),
    dni:              formData.get("dni"),
    telefono:         formData.get("telefono"),
    rol_empleado:     formData.get("rol_empleado"),
    puede_monitorear: formData.get("puede_monitorear"),
    puede_instalar:   formData.get("puede_instalar"),
    puede_facturar:   formData.get("puede_facturar"),
    color_calendario: formData.get("color_calendario"),
  });

  if (!parsed.success) {
    return { errores: parsed.error.issues.map((i) => i.message) };
  }

  const {
    nombre, email, dni, telefono,
    rol_empleado, puede_monitorear, puede_instalar, puede_facturar, color_calendario,
  } = parsed.data;

  if (dni) {
    const existente = await prisma.perfil.findUnique({ where: { dni } });
    if (existente) return { errores: [`Ya existe un perfil con el DNI ${dni}.`] };
  }
  if (telefono) {
    const existente = await prisma.perfil.findUnique({ where: { telefono } });
    if (existente) return { errores: [`Ya existe un perfil con el teléfono ${telefono}.`] };
  }

  const adminAuth = createAdminClient();
  const { data: authData, error: authError } = await adminAuth.auth.admin.createUser({
    email,
    user_metadata: { nombre },
    email_confirm: true,
  });

  if (authError) {
    return { errores: [`Error al crear usuario en Auth: ${authError.message}`] };
  }

  const rolPerfil = rolPerfilDesdeEmpleado(rol_empleado);

  await prisma.$transaction([
    prisma.perfil.create({
      data: {
        id:       authData.user.id,
        nombre,
        email,
        rol:      rolPerfil,
        ...(dni      && { dni }),
        ...(telefono && { telefono }),
      },
    }),
    prisma.empleado.create({
      data: {
        perfil_id:        authData.user.id,
        rol_empleado,
        puede_monitorear,
        puede_instalar,
        puede_facturar,
        ...(color_calendario && { color_calendario }),
      },
    }),
  ]);

  await registrarAudit({
    admin_id:     admin.id,
    admin_nombre: admin.nombre,
    accion:       "EMPLEADO_CREADO",
    entidad:      "empleado",
    entidad_id:   authData.user.id,
    detalle:      { nombre, email, rol_empleado, puede_monitorear, puede_instalar, puede_facturar },
  });

  redirect("/admin/empleados");
}

// ── Actualizar empleado ────────────────────────────────────────────────────────

const actualizarEmpleadoSchema = z.object({
  id:               z.string().min(1),
  nombre:           z.string().min(2, "El nombre es obligatorio"),
  dni:              z.string().optional().transform((v) => v || undefined),
  telefono:         z.string().optional().transform((v) => v || undefined),
  rol_empleado:     z.enum(["ADMIN_GENERAL", "MONITOR", "TECNICO", "ADMINISTRATIVO"]),
  puede_monitorear: z.string().optional().transform((v) => v === "on"),
  puede_instalar:   z.string().optional().transform((v) => v === "on"),
  puede_facturar:   z.string().optional().transform((v) => v === "on"),
  color_calendario: z.string().optional().transform((v) => v || undefined),
  activo:           z.enum(["true", "false"]).transform((v) => v === "true"),
});

export async function actualizarEmpleado(
  prevState: EmpleadoActionResult,
  formData: FormData
): Promise<EmpleadoActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { errores: ["Sin permisos de administrador."] };

  const parsed = actualizarEmpleadoSchema.safeParse({
    id:               formData.get("id"),
    nombre:           formData.get("nombre"),
    dni:              formData.get("dni"),
    telefono:         formData.get("telefono"),
    rol_empleado:     formData.get("rol_empleado"),
    puede_monitorear: formData.get("puede_monitorear"),
    puede_instalar:   formData.get("puede_instalar"),
    puede_facturar:   formData.get("puede_facturar"),
    color_calendario: formData.get("color_calendario"),
    activo:           formData.get("activo"),
  });

  if (!parsed.success) {
    return { errores: parsed.error.issues.map((i) => i.message) };
  }

  const {
    id, nombre, dni, telefono, activo,
    rol_empleado, puede_monitorear, puede_instalar, puede_facturar, color_calendario,
  } = parsed.data;

  if (dni) {
    const colision = await prisma.perfil.findFirst({ where: { dni, NOT: { id } } });
    if (colision) return { errores: [`El DNI ${dni} ya pertenece a otro perfil.`] };
  }
  if (telefono) {
    const colision = await prisma.perfil.findFirst({ where: { telefono, NOT: { id } } });
    if (colision) return { errores: [`El teléfono ${telefono} ya pertenece a otro perfil.`] };
  }

  const rolPerfil = rolPerfilDesdeEmpleado(rol_empleado);

  await prisma.$transaction([
    prisma.perfil.update({
      where: { id },
      data: {
        nombre, activo, rol: rolPerfil,
        ...(dni       !== undefined ? { dni }       : {}),
        ...(telefono  !== undefined ? { telefono }  : {}),
      },
    }),
    prisma.empleado.update({
      where: { perfil_id: id },
      data: {
        rol_empleado,
        puede_monitorear,
        puede_instalar,
        puede_facturar,
        activo,
        ...(color_calendario !== undefined ? { color_calendario } : {}),
      },
    }),
  ]);

  await registrarAudit({
    admin_id:     admin.id,
    admin_nombre: admin.nombre,
    accion:       "EMPLEADO_EDITADO",
    entidad:      "empleado",
    entidad_id:   id,
    detalle:      { nombre, rol_empleado, puede_monitorear, puede_instalar, puede_facturar, activo },
  });

  revalidatePath(`/admin/empleados/${id}`);
  revalidatePath("/admin/empleados");
  return { ok: true };
}

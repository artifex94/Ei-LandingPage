"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma/client";
import { registrarAudit } from "@/lib/audit";

export interface ClienteActionResult {
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

const nuevoClienteSchema = z.object({
  nombre: z.string().min(2, "El nombre es obligatorio"),
  dni: z.string().optional().transform((v) => v || undefined),
  telefono: z.string().optional().transform((v) => v || undefined),
  email: z.string().email("Email inválido"),
});

export async function crearCliente(
  prevState: ClienteActionResult,
  formData: FormData
): Promise<ClienteActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { errores: ["Sin permisos de administrador."] };

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

// ── Actualizar datos del cliente directamente ─────────────────────────────────

const actualizarClienteSchema = z.object({
  id: z.string().min(1),
  nombre: z.string().min(2, "El nombre es obligatorio"),
  dni: z.string().optional().transform((v) => v || undefined),
  telefono: z.string().optional().transform((v) => v || undefined),
  tipo_titular: z
    .enum(["RESIDENCIAL", "COMERCIAL", "OFICINAS", "VEHICULO"])
    .optional()
    .nullable()
    .transform((v) => v || null),
  activo: z
    .enum(["true", "false"])
    .transform((v) => v === "true"),
});

export async function actualizarCliente(
  prevState: ClienteActionResult,
  formData: FormData
): Promise<ClienteActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { errores: ["Sin permisos de administrador."] };

  const parsed = actualizarClienteSchema.safeParse({
    id: formData.get("id"),
    nombre: formData.get("nombre"),
    dni: formData.get("dni"),
    telefono: formData.get("telefono"),
    tipo_titular: formData.get("tipo_titular") || null,
    activo: formData.get("activo"),
  });

  if (!parsed.success) {
    return { errores: parsed.error.issues.map((i) => i.message) };
  }

  const { id, dni, telefono, ...rest } = parsed.data;

  // Verificar unicidad de DNI y teléfono (excluyendo el perfil actual)
  if (dni) {
    const colision = await prisma.perfil.findFirst({ where: { dni, NOT: { id } } });
    if (colision) return { errores: [`El DNI ${dni} ya pertenece a otro cliente.`] };
  }
  if (telefono) {
    const colision = await prisma.perfil.findFirst({ where: { telefono, NOT: { id } } });
    if (colision) return { errores: [`El teléfono ${telefono} ya pertenece a otro cliente.`] };
  }

  const perfilAntes = await prisma.perfil.findUnique({
    where: { id },
    select: { nombre: true, dni: true, telefono: true, activo: true },
  });

  await prisma.perfil.update({
    where: { id },
    data: { ...rest, ...(dni !== undefined ? { dni } : {}), ...(telefono !== undefined ? { telefono } : {}) },
  });

  await registrarAudit({
    admin_id: admin.id,
    admin_nombre: admin.nombre,
    accion: "CLIENTE_EDITADO",
    entidad: "cliente",
    entidad_id: id,
    detalle: {
      antes: { nombre: perfilAntes?.nombre, dni: perfilAntes?.dni, activo: perfilAntes?.activo },
      despues: { nombre: rest.nombre, dni, activo: rest.activo },
    },
  });

  revalidatePath(`/admin/clientes/${id}`);
  revalidatePath("/admin/clientes");
  return { ok: true };
}

// ── Eliminar cliente ───────────────────────────────────────────────────────────

export async function eliminarCliente(
  prevState: ClienteActionResult,
  formData: FormData
): Promise<ClienteActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { errores: ["Sin permisos de administrador."] };

  const id = (formData.get("id") as string ?? "").trim();
  if (!id) return { errores: ["ID inválido."] };

  const perfil = await prisma.perfil.findUnique({
    where: { id },
    select: {
      nombre: true,
      _count: { select: { cuentas: true, solicitudes_cambio: true } },
    },
  });

  if (!perfil) return { errores: ["Cliente no encontrado."] };

  if (perfil._count.cuentas > 0) {
    return {
      errores: [
        `Este cliente tiene ${perfil._count.cuentas} cuenta(s) registrada(s). Dalo de baja en cada cuenta antes de eliminar el perfil, o desactivá el perfil en su lugar.`,
      ],
    };
  }

  await prisma.$transaction([
    prisma.solicitudCambioInfo.deleteMany({ where: { perfil_id: id } }),
    prisma.perfil.delete({ where: { id } }),
  ]);

  const adminAuth = createAdminClient();
  await adminAuth.auth.admin.deleteUser(id);

  await registrarAudit({
    admin_id:     admin.id,
    admin_nombre: admin.nombre,
    accion:       "CLIENTE_ELIMINADO",
    entidad:      "cliente",
    entidad_id:   id,
    detalle:      { nombre: perfil.nombre },
  });

  redirect("/admin/clientes");
}

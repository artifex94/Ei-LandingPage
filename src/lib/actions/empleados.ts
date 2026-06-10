"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import { registrarAudit } from "@/lib/audit";
import type { RolEmpleado } from "@/generated/prisma/client";
import { UUID_RE } from "@/lib/constants/validation";

const HEX_COLOR_RE = /^#[0-9a-f]{6}$/i;

export async function crearEmpleado(data: {
  perfil_id: string;
  rol_empleado: RolEmpleado;
  puede_monitorear: boolean;
  puede_instalar: boolean;
  puede_facturar: boolean;
  color_calendario?: string;
}) {
  if (!UUID_RE.test(data.perfil_id)) throw new Error("perfil_id inválido.");
  if (data.color_calendario && !HEX_COLOR_RE.test(data.color_calendario)) {
    throw new Error("El color de calendario debe ser un valor hexadecimal válido (#rrggbb).");
  }
  const admin = await requireAdmin();

  const empleado = await prisma.empleado.create({ data });

  await registrarAudit({
    admin_id: admin.id,
    admin_nombre: admin.nombre ?? "Admin",
    accion: "EMPLEADO_CREAR",
    entidad: "empleado",
    entidad_id: empleado.id,
    detalle: { rol: data.rol_empleado, perfil_id: data.perfil_id },
  });

  revalidatePath("/admin/empleados");
  revalidatePath("/admin/trabajadores");
  return empleado;
}

export async function toggleEmpleadoActivo(empleado_id: string, activo: boolean) {
  if (!UUID_RE.test(empleado_id)) throw new Error("ID de empleado inválido.");
  const admin = await requireAdmin();

  const empleado = await prisma.empleado.update({
    where: { id: empleado_id },
    data: { activo },
  });

  await registrarAudit({
    admin_id: admin.id,
    admin_nombre: admin.nombre ?? "Admin",
    accion: activo ? "EMPLEADO_ACTIVAR" : "EMPLEADO_DESACTIVAR",
    entidad: "empleado",
    entidad_id: empleado_id,
    detalle: {},
  });

  revalidatePath("/admin/empleados");
  revalidatePath("/admin/trabajadores");
  return empleado;
}

export async function actualizarEmpleado(
  empleado_id: string,
  data: Partial<{
    rol_empleado: RolEmpleado;
    puede_monitorear: boolean;
    puede_instalar: boolean;
    puede_facturar: boolean;
    color_calendario: string;
  }>
) {
  if (!UUID_RE.test(empleado_id)) throw new Error("ID de empleado inválido.");
  if (data.color_calendario && !HEX_COLOR_RE.test(data.color_calendario)) {
    throw new Error("El color de calendario debe ser un valor hexadecimal válido (#rrggbb).");
  }
  const admin = await requireAdmin();

  const empleado = await prisma.empleado.update({
    where: { id: empleado_id },
    data,
  });

  await registrarAudit({
    admin_id: admin.id,
    admin_nombre: admin.nombre ?? "Admin",
    accion: "EMPLEADO_ACTUALIZAR",
    entidad: "empleado",
    entidad_id: empleado_id,
    detalle: data,
  });

  revalidatePath("/admin/empleados");
  revalidatePath("/admin/trabajadores");
  return empleado;
}

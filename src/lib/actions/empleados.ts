"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma/client";
import { registrarAudit } from "@/lib/audit";
import { createClient } from "@/lib/supabase/server";
import type { RolEmpleado } from "@/generated/prisma/client";

async function getAdminActual() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const perfil = await prisma.perfil.findUnique({ where: { id: user.id } });
  return perfil?.rol === "ADMIN" ? perfil : null;
}

export async function crearEmpleado(data: {
  perfil_id: string;
  rol_empleado: RolEmpleado;
  puede_monitorear: boolean;
  puede_instalar: boolean;
  puede_facturar: boolean;
  color_calendario?: string;
}) {
  const admin = await getAdminActual();
  if (!admin) throw new Error("No autorizado");

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
  return empleado;
}

export async function toggleEmpleadoActivo(empleado_id: string, activo: boolean) {
  const admin = await getAdminActual();
  if (!admin) throw new Error("No autorizado");

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
  const admin = await getAdminActual();
  if (!admin) throw new Error("No autorizado");

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
  return empleado;
}

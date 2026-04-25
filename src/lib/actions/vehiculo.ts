"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma/client";
import { registrarAudit } from "@/lib/audit";
import { createClient } from "@/lib/supabase/server";
import type { EstadoReserva } from "@/generated/prisma/client";

async function getAdminActual() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const perfil = await prisma.perfil.findUnique({ where: { id: user.id } });
  return perfil?.rol === "ADMIN" ? perfil : null;
}

export async function crearReservaVehiculo(data: {
  vehiculo_id: string;
  empleado_id: string;
  desde: Date;
  hasta: Date;
  km_inicial?: number;
  notas?: string;
  ot_id?: string;
}) {
  const admin = await getAdminActual();
  if (!admin) throw new Error("No autorizado");

  // Verificar que no haya solapamiento
  const conflicto = await prisma.reservaVehiculo.findFirst({
    where: {
      vehiculo_id: data.vehiculo_id,
      estado: { in: ["RESERVADA", "EN_USO"] },
      desde: { lt: data.hasta },
      hasta: { gt: data.desde },
    },
  });

  if (conflicto) {
    throw new Error("El vehículo ya tiene una reserva en ese horario");
  }

  const reserva = await prisma.reservaVehiculo.create({ data });

  await registrarAudit({
    admin_id: admin.id,
    admin_nombre: admin.nombre ?? "Admin",
    accion: "VEHICULO_RESERVAR",
    entidad: "reserva_vehiculo",
    entidad_id: reserva.id,
    detalle: { empleado_id: data.empleado_id, desde: data.desde, hasta: data.hasta },
  });

  revalidatePath("/admin/vehiculo");
  return reserva;
}

const editarVehiculoSchema = z.object({
  id: z.string().min(1),
  marca: z.string().min(1, "La marca es obligatoria"),
  modelo: z.string().min(1, "El modelo es obligatorio"),
  anio: z.coerce.number().min(1990).max(2100),
  patente: z.string().min(1, "La patente es obligatoria").transform((v) => v.trim().toUpperCase()),
  km_actual: z.coerce.number().min(0),
  proximo_service_km: z.coerce.number().min(0).optional().nullable(),
  proximo_service_fecha: z.string().optional().nullable().transform((v) => v ? new Date(v) : null),
  observaciones: z.string().optional().nullable().transform((v) => v?.trim() || null),
});

export interface EditarVehiculoResult {
  ok?: boolean;
  errores?: string[];
}

export async function editarVehiculo(
  prevState: EditarVehiculoResult,
  formData: FormData
): Promise<EditarVehiculoResult> {
  const admin = await getAdminActual();
  if (!admin) return { errores: ["Sin permisos de administrador."] };

  const parsed = editarVehiculoSchema.safeParse({
    id: formData.get("id"),
    marca: formData.get("marca"),
    modelo: formData.get("modelo"),
    anio: formData.get("anio"),
    patente: formData.get("patente"),
    km_actual: formData.get("km_actual"),
    proximo_service_km: formData.get("proximo_service_km") || null,
    proximo_service_fecha: formData.get("proximo_service_fecha") || null,
    observaciones: formData.get("observaciones"),
  });

  if (!parsed.success) return { errores: parsed.error.issues.map((i) => i.message) };

  const { id, ...data } = parsed.data;

  await prisma.vehiculo.update({ where: { id }, data });

  await registrarAudit({
    admin_id: admin.id,
    admin_nombre: admin.nombre ?? "Admin",
    accion: "VEHICULO_EDITADO",
    entidad: "vehiculo",
    entidad_id: id,
    detalle: { patente: data.patente, km_actual: data.km_actual },
  });

  revalidatePath("/admin/vehiculo");
  return { ok: true };
}

export async function actualizarKmVehiculo(vehiculo_id: string, km_actual: number) {
  const admin = await getAdminActual();
  if (!admin) throw new Error("No autorizado");

  const vehiculo = await prisma.vehiculo.update({
    where: { id: vehiculo_id },
    data: { km_actual },
  });

  await registrarAudit({
    admin_id: admin.id,
    admin_nombre: admin.nombre ?? "Admin",
    accion: "VEHICULO_KM_ACTUALIZAR",
    entidad: "vehiculo",
    entidad_id: vehiculo_id,
    detalle: { km_actual },
  });

  revalidatePath("/admin/vehiculo");
  return vehiculo;
}

export async function cambiarEstadoReserva(
  reserva_id: string,
  estado: EstadoReserva,
  km_final?: number
) {
  const admin = await getAdminActual();
  if (!admin) throw new Error("No autorizado");

  const reserva = await prisma.reservaVehiculo.update({
    where: { id: reserva_id },
    data: {
      estado,
      ...(km_final !== undefined ? { km_final } : {}),
    },
  });

  if (km_final !== undefined) {
    await prisma.vehiculo.update({
      where: { id: reserva.vehiculo_id },
      data: { km_actual: km_final },
    });
  }

  await registrarAudit({
    admin_id: admin.id,
    admin_nombre: admin.nombre ?? "Admin",
    accion: "RESERVA_ESTADO",
    entidad: "reserva_vehiculo",
    entidad_id: reserva_id,
    detalle: { estado, km_final },
    state_transition: { prior_state: null, new_state: estado },
  });

  revalidatePath("/admin/vehiculo");
  return reserva;
}

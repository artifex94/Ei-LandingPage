"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

async function getEmpleadoId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const emp = await prisma.empleado.findFirst({
    where: { perfil_id: user.id },
    select: { id: true },
  });
  return emp?.id ?? null;
}

export async function reservarVehiculo(vehiculoId: string): Promise<{ ok: boolean; error?: string }> {
  const empleadoId = await getEmpleadoId();
  if (!empleadoId) return { ok: false, error: "Sin registro de empleado." };

  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const fin = new Date(); fin.setHours(23, 59, 59, 999);

  // Verificar que no haya otra reserva activa del mismo empleado hoy
  const yaReservado = await prisma.reservaVehiculo.findFirst({
    where: {
      empleado_id: empleadoId,
      desde: { lte: fin },
      hasta: { gte: hoy },
      estado: { in: ["RESERVADA", "EN_USO"] },
    },
  });
  if (yaReservado) return { ok: false, error: "Ya tenés un vehículo asignado hoy." };

  await prisma.reservaVehiculo.create({
    data: {
      vehiculo_id: vehiculoId,
      empleado_id: empleadoId,
      desde:       hoy,
      hasta:       fin,
      estado:      "RESERVADA",
    },
  });

  revalidatePath("/tecnico/dashboard");
  return { ok: true };
}

export async function liberarVehiculo(reservaId: string): Promise<{ ok: boolean }> {
  const empleadoId = await getEmpleadoId();
  if (!empleadoId) return { ok: false };

  await prisma.reservaVehiculo.updateMany({
    where: { id: reservaId, empleado_id: empleadoId },
    data:  { estado: "COMPLETADA" },
  });

  revalidatePath("/tecnico/dashboard");
  return { ok: true };
}

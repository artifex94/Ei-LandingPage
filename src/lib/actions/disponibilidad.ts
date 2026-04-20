"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import type { Rango } from "@/lib/disponibilidad-utils";

export async function guardarDisponibilidad(
  fechaISO: string,
  rangos: Rango[]
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const perfil = await prisma.perfil.findUnique({
    where: { id: user.id },
    select: { rol: true },
  });
  if (perfil?.rol !== "TECNICO" && perfil?.rol !== "ADMIN") {
    return { ok: false, error: "Sin permisos." };
  }

  const fecha = new Date(fechaISO);
  fecha.setHours(0, 0, 0, 0);

  await prisma.$transaction([
    prisma.disponibilidadTecnico.deleteMany({
      where: { tecnico_id: user.id, fecha },
    }),
    ...rangos.map((r) =>
      prisma.disponibilidadTecnico.create({
        data: { tecnico_id: user.id, fecha, desde: r.desde, hasta: r.hasta },
      })
    ),
  ]);

  return { ok: true };
}

"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { normalizarRangos, type Rango } from "@/lib/disponibilidad-utils";

export async function guardarDisponibilidad(
  fechaISO: string,
  rangos: Rango[]
): Promise<{ ok: boolean; error?: string }> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaISO)) return { ok: false, error: "Fecha inválida." };
  const HORA_RE = /^\d{2}:\d{2}$/;
  if (
    !Array.isArray(rangos) ||
    rangos.length > 20 ||
    rangos.some(
      (r) =>
        typeof r !== "object" ||
        r === null ||
        !HORA_RE.test(r.desde) ||
        !HORA_RE.test(r.hasta) ||
        r.desde >= r.hasta
    )
  ) {
    return { ok: false, error: "Rangos de disponibilidad inválidos." };
  }

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

  // La coherencia del dominio (06-22, sin solapes) no puede depender solo
  // del cliente: se canoniza también acá antes de persistir.
  const rangosCanonicos = normalizarRangos(rangos);

  await prisma.$transaction([
    prisma.disponibilidadTecnico.deleteMany({
      where: { tecnico_id: user.id, fecha },
    }),
    ...rangosCanonicos.map((r) =>
      prisma.disponibilidadTecnico.create({
        data: { tecnico_id: user.id, fecha, desde: r.desde, hasta: r.hasta },
      })
    ),
  ]);

  return { ok: true };
}

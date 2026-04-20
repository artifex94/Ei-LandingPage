import { redirect } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { disponibilidadDefault } from "@/lib/disponibilidad-utils";
import { MiDiaClient } from "./MiDiaClient";

export const metadata = { title: "Mi día — Panel Técnico" };

export default async function MiDiaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const manana = new Date(hoy);
  manana.setDate(manana.getDate() + 1);

  const [tareas, disponibilidadHoy] = await Promise.all([
    prisma.tareaAgendada.findMany({
      where: {
        tecnico_id: user.id,
        fecha: { gte: hoy, lt: manana },
        estado: { not: "CANCELADA" },
      },
      include: { cuenta: { select: { calle: true, localidad: true } } },
      orderBy: [{ hora_inicio: "asc" }],
    }),
    prisma.disponibilidadTecnico.findMany({
      where: { tecnico_id: user.id, fecha: hoy },
      orderBy: { desde: "asc" },
    }),
  ]);

  const rangos = disponibilidadHoy.length > 0
    ? disponibilidadHoy.map((d) => ({ desde: d.desde, hasta: d.hasta }))
    : disponibilidadDefault();

  const fechaLabel = format(hoy, "EEEE d 'de' MMMM", { locale: es });

  return (
    <MiDiaClient
      fechaISO={hoy.toISOString()}
      fechaLabel={fechaLabel}
      tareas={tareas.map((t) => ({
        id:               t.id,
        titulo:           t.titulo,
        hora_inicio:      t.hora_inicio,
        hora_fin:         t.hora_fin,
        prioridad:        t.prioridad,
        estado:           t.estado,
        cuenta_calle:     t.cuenta?.calle ?? null,
        cuenta_localidad: t.cuenta?.localidad ?? null,
      }))}
      rangosIniciales={rangos}
    />
  );
}

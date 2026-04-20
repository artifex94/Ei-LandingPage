import { redirect } from "next/navigation";
import { startOfWeek, endOfWeek, addDays, addWeeks, format, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { disponibilidadDefault, rangosASlots } from "@/lib/disponibilidad-utils";
import { MiSemanaClient } from "./MiSemanaClient";

export const metadata = { title: "Mi semana — Panel Técnico" };

export default async function MiSemanaPage({
  searchParams,
}: {
  searchParams: Promise<{ semana?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { semana } = await searchParams;
  const offset = Math.max(-4, Math.min(4, parseInt(semana ?? "0") || 0));

  const hoy = new Date();
  const lunes = addWeeks(startOfWeek(hoy, { weekStartsOn: 1 }), offset);
  const domingo = endOfWeek(lunes, { weekStartsOn: 1 });

  const [tareasSemana, disponibilidadSemana] = await Promise.all([
    prisma.tareaAgendada.findMany({
      where: {
        tecnico_id: user.id,
        fecha: { gte: lunes, lte: domingo },
        estado: { not: "CANCELADA" },
      },
      include: { cuenta: { select: { calle: true, localidad: true } } },
      orderBy: [{ fecha: "asc" }, { hora_inicio: "asc" }],
    }),
    prisma.disponibilidadTecnico.findMany({
      where: {
        tecnico_id: user.id,
        fecha: { gte: lunes, lte: domingo },
      },
    }),
  ]);

  const dias = Array.from({ length: 7 }, (_, i) => {
    const fecha = addDays(lunes, i);
    const fechaStr = fecha.toISOString();

    const tareasDia = tareasSemana
      .filter((t) => isSameDay(new Date(t.fecha), fecha))
      .map((t) => ({
        id:          t.id,
        titulo:      t.titulo,
        hora_inicio: t.hora_inicio,
        hora_fin:    t.hora_fin,
        prioridad:   t.prioridad,
        estado:      t.estado,
        cuenta_calle: t.cuenta?.calle ?? null,
      }));

    const dispDia = disponibilidadSemana.filter((d) => isSameDay(new Date(d.fecha), fecha));
    const rangos = dispDia.length > 0
      ? dispDia.map((d) => ({ desde: d.desde, hasta: d.hasta }))
      : disponibilidadDefault();
    const slotsActivos = rangosASlots(rangos).filter(Boolean).length;
    const horasDisp = slotsActivos / 2;

    return {
      fecha:      fechaStr,
      label:      format(fecha, "EEE d", { locale: es }),
      labelLargo: format(fecha, "EEEE d 'de' MMMM", { locale: es }),
      esHoy:      isSameDay(fecha, hoy),
      tareas:     tareasDia,
      horasDisp,
    };
  });

  const semanaLabel = `${format(lunes, "d MMM", { locale: es })} – ${format(domingo, "d MMM yyyy", { locale: es })}`;

  return <MiSemanaClient dias={dias} semanaLabel={semanaLabel} offset={offset} />;
}

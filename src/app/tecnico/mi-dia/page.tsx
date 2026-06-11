import { addDays, format } from "date-fns";
import { es } from "date-fns/locale";
import { requireSesion } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import type { Rango } from "@/lib/disponibilidad-utils";
import { PortalSection } from "@/components/portal/PortalSection";
import { fusionarParadas, seleccionarHero, type OTDia, type TareaDia } from "./paradas";
import { ParadaHero } from "./ParadaHero";
import { ParadaCard } from "./ParadaCard";
import { DisponibilidadEditor, type DiaStrip } from "./DisponibilidadEditor";

export const metadata = { title: "Mi día" };

const DIAS_EDITABLES = 14;

export default async function MiDiaPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>;
}) {
  const { userId } = await requireSesion();
  const sp = await searchParams;

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const manana = new Date(hoy);
  manana.setDate(manana.getDate() + 1);
  const finVentana = addDays(hoy, DIAS_EDITABLES);

  const [empleado, tareasRaw, disponibilidadHoy] = await Promise.all([
    prisma.empleado.findFirst({
      where: { perfil_id: userId },
      select: { id: true },
    }),
    prisma.tareaAgendada.findMany({
      where: {
        tecnico_id: userId,
        fecha: { gte: hoy, lt: manana },
        estado: { not: "CANCELADA" },
      },
      include: {
        cuenta: {
          select: {
            calle: true,
            localidad: true,
            perfil: { select: { nombre: true, telefono: true } },
          },
        },
      },
      orderBy: [{ hora_inicio: "asc" }],
    }),
    prisma.disponibilidadTecnico.findMany({
      where: { tecnico_id: userId, fecha: { gte: hoy, lt: finVentana } },
      orderBy: [{ fecha: "asc" }, { desde: "asc" }],
    }),
  ]);

  // Las OTs cuelgan de Empleado.id (no de Perfil.id) — sin registro de
  // empleado, el técnico solo ve sus tareas agendadas.
  // Se incluyen las cerradas del día: la tarea vinculada hereda el estado
  // real de la OT (nada actualiza TareaAgendada al completar una OT).
  const otsRaw = empleado
    ? await prisma.ordenTrabajo.findMany({
        where: {
          tecnico_id: empleado.id,
          fecha_visita: { gte: hoy, lt: manana },
          estado: { in: ["ASIGNADA", "EN_RUTA", "EN_SITIO", "COMPLETADA", "CANCELADA"] },
        },
        include: {
          cuenta: {
            select: {
              calle: true,
              localidad: true,
              perfil: { select: { nombre: true, telefono: true } },
            },
          },
          perfil: { select: { nombre: true, telefono: true } },
        },
        orderBy: { fecha_visita: "asc" },
      })
    : [];

  const tareas: TareaDia[] = tareasRaw.map((t) => ({
    id: t.id,
    titulo: t.titulo,
    hora_inicio: t.hora_inicio,
    hora_fin: t.hora_fin,
    prioridad: t.prioridad,
    estado: t.estado,
    ot_id: t.ot_id,
    direccion: t.cuenta?.calle
      ? [t.cuenta.calle, t.cuenta.localidad].filter(Boolean).join(", ")
      : null,
    clienteTelefono: t.cuenta?.perfil.telefono ?? null,
  }));

  const ots: OTDia[] = otsRaw.map((ot) => {
    // fecha_visita a las 00:00 = visita agendada sin hora concreta
    const sinHora =
      !ot.fecha_visita ||
      (ot.fecha_visita.getHours() === 0 && ot.fecha_visita.getMinutes() === 0);
    return {
      id: ot.id,
      numero: ot.numero,
      tipo: ot.tipo,
      descripcion: ot.descripcion,
      prioridad: ot.prioridad,
      estado: ot.estado,
      hora: sinHora ? null : format(ot.fecha_visita!, "HH:mm"),
      direccion: ot.cuenta?.calle
        ? [ot.cuenta.calle, ot.cuenta.localidad].filter(Boolean).join(", ")
        : null,
      clienteTelefono: ot.cuenta?.perfil.telefono ?? ot.perfil?.telefono ?? null,
    };
  });

  const paradas = fusionarParadas(tareas, ots);
  const hero = seleccionarHero(paradas);

  const completadas = paradas.filter((p) => p.completada).length;
  const total = paradas.length;
  const pct = total > 0 ? Math.round((completadas / total) * 100) : 0;

  // Disponibilidad agrupada por día; los días sin registro NO entran en el
  // map (el editor les aplica el default 06-22 al leerlos).
  // La key se deriva en UTC: Prisma devuelve @db.Date como medianoche UTC y
  // format() local la correría al día anterior en TZ negativas (dev local).
  const dispPorFecha: Record<string, Rango[]> = {};
  for (const d of disponibilidadHoy) {
    const iso = d.fecha.toISOString().slice(0, 10);
    (dispPorFecha[iso] ??= []).push({ desde: d.desde, hasta: d.hasta });
  }

  const dias: DiaStrip[] = Array.from({ length: DIAS_EDITABLES }, (_, i) => {
    const fecha = addDays(hoy, i);
    return {
      iso: format(fecha, "yyyy-MM-dd"),
      dia: format(fecha, "EEE", { locale: es }).replace(".", ""),
      num: format(fecha, "d"),
      esHoy: i === 0,
    };
  });

  const fechaInicial =
    sp.fecha && /^\d{4}-\d{2}-\d{2}$/.test(sp.fecha) ? sp.fecha : undefined;

  const fechaLabel = format(hoy, "EEEE d 'de' MMMM", { locale: es });

  return (
    <div className="space-y-6">
      {/* ── Header de jornada ─────────────────────────────────────────────── */}
      <div>
        <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 mb-1">
          Mi jornada
        </p>
        <h1 className="text-2xl font-display font-bold tracking-tight text-white capitalize">
          {fechaLabel}
        </h1>
        {total > 0 && (
          <p className="text-sm text-slate-400 mt-1">
            {completadas} de {total} parada{total !== 1 ? "s" : ""} completada
            {completadas !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* Barra de progreso de la jornada */}
      {total > 0 && (
        <div
          className="h-1 bg-industrial-800 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progreso de la jornada"
        >
          <div
            className="h-full bg-emerald-500 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      {/* ── Hero: Ahora / Siguiente ───────────────────────────────────────── */}
      <ParadaHero parada={hero.parada} esAhora={hero.esAhora} totalParadas={total} />

      {/* ── Cronología ────────────────────────────────────────────────────── */}
      {total > 0 && (
        <PortalSection
          title="Cronología"
          titleId="cronologia-heading"
          meta={`${completadas}/${total}`}
        >
          <div className="space-y-2">
            {paradas.map((p) => (
              <ParadaCard key={`${p.origen}-${p.id}`} parada={p} />
            ))}
          </div>
        </PortalSection>
      )}

      {/* ── Disponibilidad (colapsada) ────────────────────────────────────── */}
      <DisponibilidadEditor
        dias={dias}
        dispPorFecha={dispPorFecha}
        fechaInicial={fechaInicial}
      />
    </div>
  );
}

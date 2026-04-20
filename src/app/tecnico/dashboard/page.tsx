import { redirect } from "next/navigation";
import Link from "next/link";
import { addDays, format, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { fetchWeatherForecast } from "@/lib/weather";
import { VehiculoSection } from "./VehiculoSection";
import { DayCard } from "./DayCard";

export const metadata = { title: "Dashboard — Panel Técnico" };

const PRIORIDAD_BORDER: Record<string, string> = {
  ALTA: "border-l-red-500", MEDIA: "border-l-amber-500", BAJA: "border-l-slate-600",
};
const PRIORIDAD_LABEL: Record<string, { label: string; cls: string }> = {
  ALTA:  { label: "⚡ Urgente", cls: "bg-red-500/20 text-red-300" },
  MEDIA: { label: "Media",     cls: "bg-amber-500/20 text-amber-300" },
  BAJA:  { label: "Baja",      cls: "bg-slate-700 text-slate-400" },
};
const ESTADO_DOT: Record<string, string> = {
  PENDIENTE: "bg-slate-400", EN_CURSO: "bg-sky-400", COMPLETADA: "bg-emerald-400",
};
const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE: "Pendiente", EN_CURSO: "En curso", COMPLETADA: "Completada",
};

export default async function TecnicoDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const hoyFin = new Date(); hoyFin.setHours(23, 59, 59, 999);
  const finVentana = addDays(hoy, 6);

  const empleado = await prisma.empleado.findFirst({
    where: { perfil_id: user.id },
    select: { id: true },
  });

  const [tareas, vehiculosActivos, vehiculosOcupados, reservaHoy, pronostico] = await Promise.all([
    prisma.tareaAgendada.findMany({
      where: {
        tecnico_id: user.id,
        fecha:  { gte: hoy, lte: finVentana },
        estado: { not: "CANCELADA" },
      },
      include: { cuenta: { select: { calle: true, localidad: true, descripcion: true } } },
      orderBy: [{ fecha: "asc" }, { hora_inicio: "asc" }],
    }),
    prisma.vehiculo.findMany({ where: { activo: true }, orderBy: { marca: "asc" } }),
    prisma.reservaVehiculo.findMany({
      where: {
        desde: { lte: hoyFin },
        hasta: { gte: hoy },
        estado: { in: ["RESERVADA", "EN_USO"] },
      },
      select: { vehiculo_id: true },
    }),
    empleado
      ? prisma.reservaVehiculo.findFirst({
          where: {
            empleado_id: empleado.id,
            desde: { lte: hoyFin },
            hasta: { gte: hoy },
            estado: { in: ["RESERVADA", "EN_USO"] },
          },
          include: { vehiculo: true },
        })
      : null,
    fetchWeatherForecast(),
  ]);

  const dias = Array.from({ length: 7 }, (_, i) => {
    const fecha      = addDays(hoy, i);
    const tareasDia  = tareas.filter((t) => isSameDay(new Date(t.fecha), fecha));
    const esHoy      = i === 0;
    const completadas = tareasDia.filter((t) => t.estado === "COMPLETADA").length;
    const fechaISO   = format(fecha, "yyyy-MM-dd");
    const weather    = pronostico?.find((d) => d.date === fechaISO) ?? null;
    const dayLabel   = format(fecha, "EEE", { locale: es });
    const dayNumber  = format(fecha, "d");
    const monthLabel = format(fecha, "MMM", { locale: es });
    return { fecha, tareasDia, esHoy, completadas, weather, dayLabel, dayNumber, monthLabel };
  });

  const tareasHoy        = dias[0].tareasDia;
  const totalTareas      = tareas.length;
  const totalCompletadas = tareas.filter((t) => t.estado === "COMPLETADA").length;
  const ventanaLabel     = `${format(hoy, "d MMM", { locale: es })} – ${format(finVentana, "d MMM", { locale: es })}`;

  const idsOcupados = new Set(vehiculosOcupados.map((r) => r.vehiculo_id));
  const vehiculosDisponibles = vehiculosActivos.filter((v) => !idsOcupados.has(v.id));

  return (
    <div className="space-y-8">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Próximos 7 días</h1>
          <p className="text-sm text-slate-400 mt-0.5 capitalize">{ventanaLabel}</p>
        </div>
        {totalTareas > 0 && (
          <div className="text-right">
            <p className="text-2xl font-bold text-white">{totalCompletadas}/{totalTareas}</p>
            <p className="text-xs text-slate-500">completadas</p>
          </div>
        )}
      </div>

      {totalTareas > 0 && (
        <div className="h-1 bg-slate-800 rounded-full overflow-hidden -mt-4">
          <div className="h-full bg-emerald-500 rounded-full transition-all"
            style={{ width: `${(totalCompletadas / totalTareas) * 100}%` }} />
        </div>
      )}

      {/* ── 7 tarjetas unificadas clima + tareas ──────────────────────────── */}

      {/* Desktop: grid 7 columnas */}
      <div className="hidden lg:grid lg:grid-cols-7 lg:gap-2 lg:items-start">
        {dias.map(({ fecha, tareasDia, esHoy, completadas, weather, dayLabel, dayNumber, monthLabel }) => (
          <DayCard
            key={fecha.toISOString()}
            dayLabel={dayLabel}
            dayNumber={dayNumber}
            monthLabel={monthLabel}
            esHoy={esHoy}
            tareas={tareasDia}
            completadas={completadas}
            weather={weather}
          />
        ))}
      </div>

      {/* Mobile: scroll horizontal de tarjetas */}
      <div className="lg:hidden flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-700">
        {dias.map(({ fecha, tareasDia, esHoy, completadas, weather, dayLabel, dayNumber, monthLabel }) => (
          <div key={fecha.toISOString()} className="flex-shrink-0" style={{ width: "140px" }}>
            <DayCard
              dayLabel={dayLabel}
              dayNumber={dayNumber}
              monthLabel={monthLabel}
              esHoy={esHoy}
              tareas={tareasDia}
              completadas={completadas}
              weather={weather}
            />
          </div>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          HOY EN DETALLE
          ══════════════════════════════════════════════════════════════════ */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-800" />
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-widest">
            Hoy en detalle — {format(hoy, "EEEE d 'de' MMMM", { locale: es })}
          </h2>
          <div className="h-px flex-1 bg-slate-800" />
        </div>

        {/* Vehículo */}
        <VehiculoSection
          reservaActual={reservaHoy ? {
            id:       reservaHoy.id,
            vehiculo: {
              id:        reservaHoy.vehiculo.id,
              patente:   reservaHoy.vehiculo.patente,
              marca:     reservaHoy.vehiculo.marca,
              modelo:    reservaHoy.vehiculo.modelo,
              anio:      reservaHoy.vehiculo.anio,
              km_actual: reservaHoy.vehiculo.km_actual,
            },
          } : null}
          vehiculosDisponibles={vehiculosDisponibles.map((v) => ({
            id: v.id, patente: v.patente, marca: v.marca,
            modelo: v.modelo, anio: v.anio, km_actual: v.km_actual,
          }))}
          tieneEmpleado={!!empleado}
        />

        {/* Tareas del día — desglose completo */}
        {tareasHoy.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center">
            <p className="text-slate-500 text-sm">No hay tareas asignadas para hoy.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tareasHoy.map((t, idx) => {
              const pr = PRIORIDAD_LABEL[t.prioridad] ?? { label: t.prioridad, cls: "bg-slate-700 text-slate-400" };
              const direccion = [t.cuenta?.calle, t.cuenta?.localidad].filter(Boolean).join(", ");
              return (
                <div key={t.id}
                  className={`rounded-xl border border-slate-700 overflow-hidden border-l-4 ${PRIORIDAD_BORDER[t.prioridad] ?? "border-l-slate-600"}`}>
                  <div className="bg-slate-800 px-4 py-3 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="text-slate-500 font-mono text-sm font-bold w-5 text-center flex-shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {t.hora_inicio && (
                            <span className="text-xs font-bold text-white bg-slate-700 px-2 py-0.5 rounded">
                              {t.hora_inicio}{t.hora_fin ? ` – ${t.hora_fin}` : ""}
                            </span>
                          )}
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${pr.cls}`}>{pr.label}</span>
                        </div>
                        <p className="font-bold text-white mt-1">{t.titulo}</p>
                        {direccion && <p className="text-xs text-slate-400 mt-0.5">{direccion}</p>}
                        {t.cuenta?.descripcion && <p className="text-xs text-slate-500 mt-0.5">{t.cuenta.descripcion}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className={`w-2 h-2 rounded-full ${ESTADO_DOT[t.estado] ?? "bg-slate-500"}`} />
                      <span className="text-xs text-slate-400">{ESTADO_LABEL[t.estado] ?? t.estado}</span>
                    </div>
                  </div>

                  {t.descripcion && (
                    <div className="px-4 py-3 bg-slate-900/60 border-t border-slate-700/50">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Detalles / Materiales
                      </p>
                      <p className="text-sm text-slate-300 leading-relaxed">{t.descripcion}</p>
                    </div>
                  )}

                  {t.notas_tecnico && (
                    <div className="px-4 py-2.5 bg-amber-950/20 border-t border-amber-800/30">
                      <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1">Mis notas</p>
                      <p className="text-xs text-amber-200">{t.notas_tecnico}</p>
                    </div>
                  )}

                  <div className="px-4 py-2 bg-slate-900/40 border-t border-slate-700/30 flex justify-end">
                    <Link href={`/tecnico/tareas/${t.id}`}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                      Ver tarea completa →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

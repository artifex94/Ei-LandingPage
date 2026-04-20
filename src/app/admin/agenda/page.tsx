import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { prisma } from "@/lib/prisma/client";

export const metadata = { title: "Agenda — Admin EI" };

const ESTADO_BADGE: Record<string, string> = {
  PENDIENTE:  "bg-slate-700 text-slate-300",
  EN_CURSO:   "bg-blue-500/20 text-blue-300",
  COMPLETADA: "bg-emerald-500/20 text-emerald-300",
  CANCELADA:  "bg-red-500/20 text-red-400",
};
const PRIORIDAD_DOT: Record<string, string> = {
  ALTA: "bg-red-500", MEDIA: "bg-amber-500", BAJA: "bg-slate-600",
};

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ tecnico?: string; estado?: string; semana?: string }>;
}) {
  const { tecnico: tecnicoFilter, estado: estadoFilter } = await searchParams;

  const tecnicos = await prisma.perfil.findMany({
    where: { rol: "TECNICO" },
    select: { id: true, nombre: true },
    orderBy: { nombre: "asc" },
  });

  const tareas = await prisma.tareaAgendada.findMany({
    where: {
      ...(tecnicoFilter && { tecnico_id: tecnicoFilter }),
      ...(estadoFilter && { estado: estadoFilter as "PENDIENTE" | "EN_CURSO" | "COMPLETADA" | "CANCELADA" }),
    },
    include: {
      tecnico: { select: { nombre: true } },
      cuenta: { select: { descripcion: true, calle: true, localidad: true } },
    },
    orderBy: [{ fecha: "desc" }, { hora_inicio: "asc" }],
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white">Agenda</h1>
        <Link
          href="/admin/agenda/nueva"
          className="text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition-colors"
        >
          + Nueva tarea
        </Link>
      </div>

      {/* Filtros */}
      <form method="GET" className="flex flex-wrap gap-3">
        <select
          name="tecnico"
          defaultValue={tecnicoFilter ?? ""}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Todos los técnicos</option>
          {tecnicos.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nombre}
            </option>
          ))}
        </select>

        <select
          name="estado"
          defaultValue={estadoFilter ?? ""}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Todos los estados</option>
          <option value="PENDIENTE">Pendiente</option>
          <option value="EN_CURSO">En curso</option>
          <option value="COMPLETADA">Completada</option>
          <option value="CANCELADA">Cancelada</option>
        </select>

        <button
          type="submit"
          className="text-sm bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-lg transition-colors"
        >
          Filtrar
        </button>
        {(tecnicoFilter || estadoFilter) && (
          <Link
            href="/admin/agenda"
            className="text-sm text-slate-400 hover:text-white px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            Limpiar
          </Link>
        )}
      </form>

      {tareas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center">
          <p className="text-slate-500 text-sm">No hay tareas con esos filtros.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tareas.map((tarea) => (
            <Link
              key={tarea.id}
              href={`/admin/agenda/${tarea.id}`}
              className="flex items-start gap-3 rounded-xl border border-slate-700 bg-slate-800 p-4 hover:bg-slate-700/60 transition-colors"
            >
              <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${PRIORIDAD_DOT[tarea.prioridad]}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-white leading-snug">{tarea.titulo}</p>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${ESTADO_BADGE[tarea.estado]}`}>
                    {tarea.estado.replace("_", " ")}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {format(new Date(tarea.fecha), "EEE d MMM", { locale: es })}
                  {tarea.hora_inicio && ` · ${tarea.hora_inicio}`}
                  {" · "}
                  <span className="text-indigo-400">{tarea.tecnico.nombre}</span>
                </p>
                {tarea.cuenta && (
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    {tarea.cuenta.descripcion}
                    {tarea.cuenta.localidad && ` · ${tarea.cuenta.localidad}`}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

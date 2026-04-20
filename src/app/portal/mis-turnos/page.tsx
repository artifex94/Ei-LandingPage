import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

export const metadata = { title: "Mis turnos — Portal EI" };

const FRANJA_LABEL: Record<string, string> = {
  MANANA: "Mañana (06–14)",
  TARDE:  "Tarde (14–22)",
  NOCHE:  "Noche (22–06)",
};

const ESTADO_COLOR: Record<string, string> = {
  PROGRAMADO:  "bg-slate-700 text-slate-300",
  EN_CURSO:    "bg-blue-500/20 text-blue-300",
  COMPLETADO:  "bg-emerald-500/20 text-emerald-300",
  AUSENTE:     "bg-red-500/20 text-red-400",
  REEMPLAZADO: "bg-amber-500/20 text-amber-300",
};

const ESTADO_LABEL: Record<string, string> = {
  PROGRAMADO:  "Programado",
  EN_CURSO:    "En curso",
  COMPLETADO:  "Completado",
  AUSENTE:     "Ausente",
  REEMPLAZADO: "Reemplazado",
};

function addDays(d: Date, n: number) {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}

export default async function MisTurnosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const empleado = await prisma.empleado.findUnique({
    where: { perfil_id: user.id },
    select: { id: true },
  });
  if (!empleado) redirect("/portal/dashboard");

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const en30 = addDays(hoy, 30);

  const turnos = await prisma.turno.findMany({
    where: {
      empleado_id: empleado.id,
      fecha: { gte: hoy, lte: en30 },
    },
    orderBy: [{ fecha: "asc" }, { franja: "asc" }],
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">Mis turnos</h1>
        <p className="text-sm text-slate-400 mt-0.5">Próximos 30 días</p>
      </div>

      {turnos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 p-10 text-center">
          <p className="text-slate-500">No tenés turnos asignados en los próximos 30 días.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {turnos.map((t) => (
            <div
              key={t.id}
              className="rounded-xl border border-slate-700 bg-slate-800 p-4 flex items-center justify-between gap-3"
            >
              <div>
                <p className="text-sm font-semibold text-white capitalize">
                  {new Date(t.fecha).toLocaleDateString("es-AR", {
                    weekday: "long", day: "numeric", month: "long",
                  })}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">{FRANJA_LABEL[t.franja] ?? t.franja}</p>
                {t.notas && (
                  <p className="text-xs text-slate-500 mt-1">{t.notas}</p>
                )}
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${ESTADO_COLOR[t.estado] ?? "bg-slate-700 text-slate-400"}`}>
                {ESTADO_LABEL[t.estado] ?? t.estado}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

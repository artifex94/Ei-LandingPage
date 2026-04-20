import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

export const metadata: Metadata = { title: "Mis eventos — Portal EI" };

const ESTADO_LABEL: Record<string, string> = {
  NUEVO:                   "Nuevo",
  EN_PROCESO:              "En atención",
  EN_ESPERA:               "En espera",
  EN_PROCESO_DESDE_ESPERA: "Retomado",
  EN_PROCESO_MULTIPLE:     "Múltiple",
  PROCESADO:               "Atendido",
  PROCESADO_NO_ALERTA:     "Sin novedad",
  PROCESADO_MODO_PRUEBA:   "Prueba",
  PROCESADO_MODO_OFF:      "Armado off",
};

const ESTADO_COLOR: Record<string, string> = {
  NUEVO:                   "text-red-300",
  EN_PROCESO:              "text-blue-300",
  EN_ESPERA:               "text-amber-300",
  EN_PROCESO_DESDE_ESPERA: "text-blue-300",
  EN_PROCESO_MULTIPLE:     "text-indigo-300",
  PROCESADO:               "text-emerald-400",
  PROCESADO_NO_ALERTA:     "text-slate-500",
  PROCESADO_MODO_PRUEBA:   "text-slate-500",
  PROCESADO_MODO_OFF:      "text-slate-500",
};

export default async function EventosPortalPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cuentaIds = await prisma.cuenta.findMany({
    where: { perfil_id: user.id, estado: { not: "BAJA_DEFINITIVA" } },
    select: { id: true },
  });

  const ids = cuentaIds.map((c) => c.id);

  const eventos = await prisma.eventoAlarma.findMany({
    where: { cuenta_id: { in: ids } },
    include: {
      cuenta: { select: { descripcion: true } },
    },
    orderBy: { fecha_evento: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">Mis eventos</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Alarmas y eventos recientes de tus cuentas
        </p>
      </div>

      {eventos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 p-10 text-center">
          <p className="text-slate-400">No hay eventos registrados todavía.</p>
          <p className="text-xs text-slate-600 mt-1">
            Los eventos de alarma aparecen aquí una vez que el sistema esté sincronizado.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {eventos.map((ev) => {
            const esAlerta = ev.estado === "NUEVO" || ev.estado === "EN_PROCESO" || ev.estado === "EN_ESPERA";
            return (
              <div
                key={ev.id}
                className={`rounded-xl border bg-slate-800 p-4 ${
                  esAlerta ? "border-red-500/40" : "border-slate-700"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white leading-snug">{ev.descripcion}</p>
                    {ev.cuenta && (
                      <p className="text-xs text-slate-500 mt-0.5">{ev.cuenta.descripcion}</p>
                    )}
                    {ev.zona && (
                      <p className="text-xs text-slate-500 mt-0.5">Zona: {ev.zona}</p>
                    )}
                  </div>
                  <span className={`text-xs font-medium flex-shrink-0 ${ESTADO_COLOR[ev.estado] ?? "text-slate-400"}`}>
                    {ESTADO_LABEL[ev.estado] ?? ev.estado}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-2">
                  {new Date(ev.fecha_evento).toLocaleString("es-AR", {
                    day: "2-digit", month: "2-digit", year: "2-digit",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { SolicitarOTButton } from "@/components/portal/SolicitarOTButton";

export const metadata: Metadata = { title: "Mis Órdenes de Trabajo — Portal" };

const ESTADO_BADGE: Record<string, string> = {
  SOLICITADA:  "bg-amber-500/20 text-amber-300",
  ASIGNADA:    "bg-blue-500/20 text-blue-300",
  EN_RUTA:     "bg-indigo-500/20 text-indigo-300",
  EN_SITIO:    "bg-emerald-500/20 text-emerald-300",
  COMPLETADA:  "bg-slate-700 text-slate-400",
  CANCELADA:   "bg-red-500/20 text-red-300",
};
const ESTADO_LABEL: Record<string, string> = {
  SOLICITADA: "Solicitada", ASIGNADA: "Asignada", EN_RUTA: "Técnico en ruta",
  EN_SITIO: "Técnico en sitio", COMPLETADA: "Completada", CANCELADA: "Cancelada",
};
const TIPO_LABEL: Record<string, string> = {
  INSTALACION: "Instalación", CORRECTIVO: "Correctivo",
  PREVENTIVO: "Preventivo",   RETIRO: "Retiro",
};

export default async function PortalOTPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cuentas = await prisma.cuenta.findMany({
    where: { perfil_id: user.id, estado: { not: "BAJA_DEFINITIVA" } },
    select: { id: true, descripcion: true },
  });

  const ots = await prisma.ordenTrabajo.findMany({
    where: { perfil_id: user.id },
    orderBy: { created_at: "desc" },
  });

  const otsPorCuenta = await prisma.ordenTrabajo.findMany({
    where: { cuenta: { perfil_id: user.id } },
    orderBy: { created_at: "desc" },
  });

  const todasOTs = [...ots, ...otsPorCuenta]
    .filter((o, i, arr) => arr.findIndex((x) => x.id === o.id) === i)
    .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Mis órdenes de servicio</h1>
          <p className="text-sm text-slate-400 mt-1">
            Solicitudes de instalación, mantenimiento o reparación.
          </p>
        </div>
        <SolicitarOTButton cuentas={cuentas} perfil_id={user.id} />
      </div>

      {todasOTs.length === 0 ? (
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-12 text-center">
          <p className="text-slate-400">No hay órdenes de trabajo registradas.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {todasOTs.map((ot) => (
            <div key={ot.id} className="rounded-lg border border-slate-700 bg-slate-800 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-slate-500">
                      #{String(ot.numero).padStart(4, "0")}
                    </span>
                    <span className="text-xs text-slate-400 bg-slate-700 px-1.5 py-0.5 rounded">
                      {TIPO_LABEL[ot.tipo]}
                    </span>
                  </div>
                  <p className="text-sm text-white">{ot.descripcion}</p>
                  {ot.fecha_visita && (
                    <p className="text-xs text-slate-400 mt-1">
                      Visita: {new Date(ot.fecha_visita).toLocaleString("es-AR", {
                        day: "2-digit", month: "2-digit", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  )}
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${ESTADO_BADGE[ot.estado] ?? ""}`}>
                  {ESTADO_LABEL[ot.estado] ?? ot.estado}
                </span>
              </div>
              {ot.estado === "COMPLETADA" && ot.conformidad_firmada && (
                <p className="text-xs text-emerald-500 mt-2">✓ Conformidad firmada</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

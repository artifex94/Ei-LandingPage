import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma/client";
import { NuevaOTButton } from "@/components/admin/ot/NuevaOTButton";

export const metadata: Metadata = { title: "Órdenes de Trabajo — Admin" };

const ESTADO_BADGE: Record<string, string> = {
  SOLICITADA:  "bg-amber-500/20 text-amber-300 border-amber-500/30",
  ASIGNADA:    "bg-blue-500/20 text-blue-300 border-blue-500/30",
  EN_RUTA:     "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
  EN_SITIO:    "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  COMPLETADA:  "bg-slate-700 text-slate-400 border-slate-600",
  CANCELADA:   "bg-red-500/20 text-red-300 border-red-500/30",
};

const ESTADO_LABEL: Record<string, string> = {
  SOLICITADA: "Solicitada",
  ASIGNADA:   "Asignada",
  EN_RUTA:    "En ruta",
  EN_SITIO:   "En sitio",
  COMPLETADA: "Completada",
  CANCELADA:  "Cancelada",
};

const TIPO_LABEL: Record<string, string> = {
  INSTALACION: "Instalación",
  CORRECTIVO:  "Correctivo",
  PREVENTIVO:  "Preventivo",
  RETIRO:      "Retiro",
};

const PRIORIDAD_COLOR: Record<string, string> = {
  BAJA:  "text-slate-400",
  MEDIA: "text-amber-400",
  ALTA:  "text-red-400",
};

export default async function OTListPage() {
  const [ots, empleados] = await Promise.all([
    prisma.ordenTrabajo.findMany({
      where: { estado: { not: "CANCELADA" } },
      include: {
        tecnico: { include: { perfil: { select: { nombre: true } } } },
        cuenta:  { select: { descripcion: true, perfil: { select: { nombre: true } } } },
        perfil:  { select: { nombre: true } },
      },
      orderBy: [{ estado: "asc" }, { fecha_visita: "asc" }, { created_at: "desc" }],
    }),
    prisma.empleado.findMany({
      where: { activo: true, puede_instalar: true },
      include: { perfil: { select: { nombre: true } } },
    }),
  ]);

  const ahora = new Date();
  const hace3dias = new Date(); hace3dias.setDate(ahora.getDate() - 3);

  const activas    = ots.filter((o) => !["COMPLETADA", "CANCELADA"].includes(o.estado));
  const completadas = await prisma.ordenTrabajo.findMany({
    where: { estado: "COMPLETADA" },
    include: {
      tecnico: { include: { perfil: { select: { nombre: true } } } },
      cuenta:  { select: { descripcion: true, perfil: { select: { nombre: true } } } },
      perfil:  { select: { nombre: true } },
    },
    orderBy: { hora_fin: "desc" },
    take: 20,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Órdenes de Trabajo</h1>
          <p className="text-sm text-slate-400 mt-1">
            {activas.length} activa{activas.length !== 1 ? "s" : ""}
          </p>
        </div>
        <NuevaOTButton empleados={empleados} />
      </div>

      {/* Banner alertas */}
      {(() => {
        const vencidas   = activas.filter((o) => o.fecha_visita && new Date(o.fecha_visita) < ahora && !["EN_RUTA","EN_SITIO"].includes(o.estado));
        const sinAsignar = activas.filter((o) => o.estado === "SOLICITADA" && new Date(o.created_at) < hace3dias);
        if (vencidas.length === 0 && sinAsignar.length === 0) return null;
        return (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 space-y-1">
            <p className="text-sm font-semibold text-amber-300">Requieren atención</p>
            {vencidas.length > 0 && (
              <p className="text-xs text-amber-400">
                · {vencidas.length} OT{vencidas.length !== 1 ? "s" : ""} con fecha de visita vencida sin completar
              </p>
            )}
            {sinAsignar.length > 0 && (
              <p className="text-xs text-amber-400">
                · {sinAsignar.length} OT{sinAsignar.length !== 1 ? "s" : ""} sin asignar hace más de 3 días
              </p>
            )}
          </div>
        );
      })()}

      {/* Activas */}
      <OTTable ots={activas} titulo="Activas" ahora={ahora} />

      {/* Últimas completadas */}
      {completadas.length > 0 && (
        <OTTable ots={completadas} titulo="Últimas completadas" muted />
      )}
    </div>
  );
}

type OTRow = Awaited<ReturnType<typeof prisma.ordenTrabajo.findMany>>[number] & {
  tecnico: ({ perfil: { nombre: string } } & object) | null;
  cuenta: ({ descripcion: string; perfil: { nombre: string } } & object) | null;
  perfil: { nombre: string } | null;
};

function OTTable({ ots, titulo, muted = false, ahora }: { ots: OTRow[]; titulo: string; muted?: boolean; ahora?: Date }) {
  if (ots.length === 0) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-10 text-center">
        <p className="text-slate-400">No hay OTs {titulo.toLowerCase()}.</p>
      </div>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className={`text-sm font-semibold uppercase tracking-wider ${muted ? "text-slate-500" : "text-slate-300"}`}>
        {titulo}
      </h2>
      <div className="rounded-lg border border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-800 border-b border-slate-700">
            <tr>
              <th className="text-left px-4 py-3 text-slate-400 font-medium">Nº</th>
              <th className="text-left px-4 py-3 text-slate-400 font-medium">Tipo / Cliente</th>
              <th className="text-left px-4 py-3 text-slate-400 font-medium">Técnico</th>
              <th className="text-left px-4 py-3 text-slate-400 font-medium">Fecha</th>
              <th className="text-left px-4 py-3 text-slate-400 font-medium">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {ots.map((ot) => {
              const clienteNombre = ot.cuenta?.perfil.nombre ?? ot.perfil?.nombre ?? "—";
              const vencida = ahora && ot.fecha_visita &&
                new Date(ot.fecha_visita) < ahora &&
                !["EN_RUTA", "EN_SITIO", "COMPLETADA", "CANCELADA"].includes(ot.estado);
              return (
                <tr key={ot.id} className={`transition-colors ${vencida ? "bg-red-950/30 hover:bg-red-900/20" : "bg-slate-900 hover:bg-slate-800/50"}`}>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">
                    #{String(ot.numero).padStart(4, "0")}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{TIPO_LABEL[ot.tipo] ?? ot.tipo}</p>
                    <p className="text-xs text-slate-400">{clienteNombre}</p>
                    {ot.cuenta && (
                      <p className="text-xs text-slate-500">{ot.cuenta.descripcion}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-300 text-xs">
                    {ot.tecnico?.perfil.nombre ?? <span className="text-slate-500">Sin asignar</span>}
                  </td>
                  <td className={`px-4 py-3 text-xs ${vencida ? "text-red-400 font-medium" : "text-slate-400"}`}>
                    {ot.fecha_visita
                      ? new Date(ot.fecha_visita).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" })
                      : <span className="text-slate-500">—</span>}
                    {vencida && <span className="block text-red-500 text-xs">vencida</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${ESTADO_BADGE[ot.estado] ?? ""}`}>
                      {ESTADO_LABEL[ot.estado] ?? ot.estado}
                    </span>
                    <span className={`block text-xs mt-0.5 ${PRIORIDAD_COLOR[ot.prioridad]}`}>
                      {ot.prioridad.toLowerCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/ot/${ot.id}`}
                      className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      Ver →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

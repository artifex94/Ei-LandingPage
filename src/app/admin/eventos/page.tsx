import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma/client";

export const metadata: Metadata = { title: "Eventos de alarma — Admin" };

const ESTADO_LABEL: Record<string, string> = {
  NUEVO:                    "Nuevo",
  EN_PROCESO:               "En proceso",
  EN_ESPERA:                "En espera",
  EN_PROCESO_DESDE_ESPERA:  "Retomado",
  EN_PROCESO_MULTIPLE:      "Múltiple",
  PROCESADO:                "Procesado",
  PROCESADO_NO_ALERTA:      "No alerta",
  PROCESADO_MODO_PRUEBA:    "Modo prueba",
  PROCESADO_MODO_OFF:       "Modo off",
};

const ESTADO_COLOR: Record<string, string> = {
  NUEVO:                    "bg-red-500/20 text-red-300",
  EN_PROCESO:               "bg-blue-500/20 text-blue-300",
  EN_ESPERA:                "bg-amber-500/20 text-amber-300",
  EN_PROCESO_DESDE_ESPERA:  "bg-blue-500/20 text-blue-300",
  EN_PROCESO_MULTIPLE:      "bg-indigo-500/20 text-indigo-300",
  PROCESADO:                "bg-emerald-500/20 text-emerald-300",
  PROCESADO_NO_ALERTA:      "bg-slate-600 text-slate-400",
  PROCESADO_MODO_PRUEBA:    "bg-slate-600 text-slate-400",
  PROCESADO_MODO_OFF:       "bg-slate-600 text-slate-400",
};

export default async function EventosPage() {
  const eventos = await prisma.eventoAlarma.findMany({
    include: {
      cuenta: {
        select: {
          descripcion: true,
          softguard_ref: true,
          perfil: { select: { nombre: true } },
        },
      },
    },
    orderBy: { fecha_evento: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Eventos de alarma</h1>
          <p className="text-sm text-slate-400 mt-1">
            Sincronizados desde SoftGuard · {eventos.length} recientes
          </p>
        </div>
        <Link
          href="/admin/sync-softguard"
          className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          Sincronizar →
        </Link>
      </div>

      {eventos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 p-10 text-center">
          <p className="text-slate-500">No hay eventos sincronizados todavía.</p>
          <p className="text-xs text-slate-600 mt-1">
            Configurá la conexión a SoftGuard y ejecutá la sincronización.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-800 border-b border-slate-700">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden sm:table-cell">
                  Cuenta
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Evento
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">
                  Zona
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Estado
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden lg:table-cell">
                  Notif.
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {eventos.map((ev) => (
                <tr key={ev.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3 text-slate-300 text-xs whitespace-nowrap">
                    {new Date(ev.fecha_evento).toLocaleString("es-AR", {
                      day: "2-digit", month: "2-digit", year: "2-digit",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <p className="text-white text-xs font-medium">
                      {ev.cuenta?.perfil.nombre ?? ev.softguard_ref}
                    </p>
                    <p className="text-slate-500 text-xs">{ev.cuenta?.descripcion}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-white text-xs font-medium">{ev.descripcion}</p>
                    <p className="text-slate-500 text-xs font-mono">{ev.codigo}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs hidden md:table-cell">
                    {ev.zona ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ESTADO_COLOR[ev.estado] ?? "bg-slate-700 text-slate-400"}`}>
                      {ESTADO_LABEL[ev.estado] ?? ev.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center hidden lg:table-cell">
                    {ev.notificado_cliente ? (
                      <span className="text-emerald-400 text-xs">✓</span>
                    ) : (
                      <span className="text-slate-600 text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

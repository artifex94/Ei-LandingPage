import { prisma } from "@/lib/prisma/client";

const ACCION_LABELS: Record<string, { label: string; color: string }> = {
  CUENTA_CREADA:        { label: "Cuenta creada",       color: "text-green-400 bg-green-900/30" },
  CUENTA_ACTUALIZADA:   { label: "Cuenta actualizada",  color: "text-blue-400 bg-blue-900/30" },
  CUENTA_BAJA_DEFINITIVA: { label: "Baja definitiva",   color: "text-red-400 bg-red-900/30" },
  CLIENTE_EDITADO:      { label: "Cliente editado",      color: "text-orange-400 bg-orange-900/30" },
  PAGO_REGISTRADO:      { label: "Pago registrado",      color: "text-emerald-400 bg-emerald-900/30" },
  SENSOR_CREADO:        { label: "Sensor creado",        color: "text-cyan-400 bg-cyan-900/30" },
  SENSOR_ACTUALIZADO:   { label: "Sensor actualizado",   color: "text-cyan-400 bg-cyan-900/30" },
  SENSOR_ELIMINADO:     { label: "Sensor eliminado",     color: "text-slate-400 bg-slate-700" },
};

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string; accion?: string }>;
}) {
  const { pagina: paginaStr, accion: accionFiltro } = await searchParams;
  const pagina = Math.max(1, Number(paginaStr ?? 1));
  const POR_PAGINA = 50;

  const where = accionFiltro ? { accion: accionFiltro } : {};

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
    }),
  ]);

  const totalPaginas = Math.ceil(total / POR_PAGINA);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">Auditoría de acciones</h1>
        <p className="text-sm text-slate-400">{total} registros</p>
      </div>

      {/* Filtro por acción */}
      <div className="flex flex-wrap gap-2">
        <a
          href="/admin/auditoria"
          className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
            !accionFiltro
              ? "bg-orange-500 text-white"
              : "bg-slate-700 text-slate-300 hover:bg-slate-600"
          }`}
        >
          Todas
        </a>
        {Object.entries(ACCION_LABELS).map(([key, { label }]) => (
          <a
            key={key}
            href={`/admin/auditoria?accion=${key}`}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
              accionFiltro === key
                ? "bg-orange-500 text-white"
                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
            }`}
          >
            {label}
          </a>
        ))}
      </div>

      {/* Tabla */}
      {logs.length === 0 ? (
        <p className="text-slate-400 text-sm">Sin registros todavía.</p>
      ) : (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-900/50 border-b border-slate-700">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-300">Fecha</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-300">Admin</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-300">Acción</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-300">Entidad</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-300">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {logs.map((log) => {
                const cfg = ACCION_LABELS[log.accion] ?? { label: log.accion, color: "text-slate-400 bg-slate-700" };
                let detalle: Record<string, unknown> | null = null;
                try { detalle = log.detalle ? JSON.parse(log.detalle) : null; } catch { /* noop */ }

                return (
                  <tr key={log.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString("es-AR", {
                        day: "2-digit", month: "2-digit", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3 text-white font-medium text-xs">{log.admin_nombre}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs font-mono">
                      {log.entidad}
                      <br />
                      <span className="opacity-60">{log.entidad_id.slice(0, 12)}…</span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs max-w-xs">
                      {detalle ? (
                        <details>
                          <summary className="cursor-pointer hover:text-slate-200 transition-colors">
                            Ver detalle
                          </summary>
                          <pre className="mt-2 text-xs bg-slate-900 rounded p-2 overflow-x-auto whitespace-pre-wrap">
                            {JSON.stringify(detalle, null, 2)}
                          </pre>
                        </details>
                      ) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginación */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-between gap-4 pt-2">
          <span className="text-sm text-slate-400">
            Página {pagina} de {totalPaginas}
          </span>
          <div className="flex gap-2">
            {pagina > 1 && (
              <a
                href={`/admin/auditoria?pagina=${pagina - 1}${accionFiltro ? `&accion=${accionFiltro}` : ""}`}
                className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                ← Anterior
              </a>
            )}
            {pagina < totalPaginas && (
              <a
                href={`/admin/auditoria?pagina=${pagina + 1}${accionFiltro ? `&accion=${accionFiltro}` : ""}`}
                className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Siguiente →
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

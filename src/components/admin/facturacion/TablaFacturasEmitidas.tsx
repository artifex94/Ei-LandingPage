import type { Factura, FacturaItem, Perfil } from "@/generated/prisma/client";

type FacturaConRelaciones = Factura & { perfil: Perfil; items: FacturaItem[] };

export function TablaFacturasEmitidas({ facturas }: { facturas: FacturaConRelaciones[] }) {
  if (facturas.length === 0) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-12 text-center">
        <p className="text-slate-400">No hay facturas emitidas todavía.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-700 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-800 border-b border-slate-700">
          <tr>
            <th className="text-left px-4 py-3 text-slate-400 font-medium">Nº</th>
            <th className="text-left px-4 py-3 text-slate-400 font-medium">Titular</th>
            <th className="text-left px-4 py-3 text-slate-400 font-medium">Período</th>
            <th className="text-left px-4 py-3 text-slate-400 font-medium">Fecha emisión</th>
            <th className="text-right px-4 py-3 text-slate-400 font-medium">Total</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/50">
          {facturas.map((f) => (
            <tr key={f.id} className="bg-slate-900 hover:bg-slate-800/50 transition-colors">
              <td className="px-4 py-3 font-mono text-xs text-slate-300">
                {f.numero_oficial ?? "—"}
              </td>
              <td className="px-4 py-3 font-medium text-white">
                {f.razon_social_receptor ?? f.perfil.nombre}
              </td>
              <td className="px-4 py-3 text-slate-400 text-xs capitalize">
                {new Date(f.periodo_desde).toLocaleDateString("es-AR", {
                  month: "long",
                  year: "numeric",
                })}
              </td>
              <td className="px-4 py-3 text-slate-400 text-xs">
                {f.fecha_emision
                  ? new Date(f.fecha_emision).toLocaleDateString("es-AR")
                  : "—"}
              </td>
              <td className="px-4 py-3 text-right font-mono font-semibold text-white">
                ${Number(f.total).toLocaleString("es-AR")}
              </td>
              <td className="px-4 py-3 text-right">
                {f.pdf_url ? (
                  <a
                    href={f.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    Ver PDF ↗
                  </a>
                ) : (
                  <span className="text-xs text-slate-500">Sin PDF</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

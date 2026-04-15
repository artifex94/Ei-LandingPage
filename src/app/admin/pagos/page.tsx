import { prisma } from "@/lib/prisma/client";
import { PagoManualBulkForm } from "@/components/admin/PagoManualBulkForm";

const ESTADO_CONFIG: Record<string, { bg: string; label: string }> = {
  PAGADO: { bg: "bg-green-900/40 text-green-400", label: "Pagado" },
  PENDIENTE: { bg: "bg-amber-900/40 text-amber-400", label: "Pendiente" },
  VENCIDO: { bg: "bg-red-900/40 text-red-400", label: "Vencido" },
  PROCESANDO: { bg: "bg-blue-900/40 text-blue-400", label: "Procesando" },
};

export default async function PagosAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; anio?: string }>;
}) {
  const sp = await searchParams;
  const ahora = new Date();
  const mes = Number(sp.mes) || ahora.getMonth() + 1;
  const anio = Number(sp.anio) || ahora.getFullYear();

  const pagos = await prisma.pago.findMany({
    where: { mes, anio },
    include: { cuenta: { include: { perfil: { select: { nombre: true } } } } },
    orderBy: [{ estado: "asc" }, { cuenta: { descripcion: "asc" } }],
  });

  const cuentasConPago = new Set(pagos.map((p) => p.cuenta_id));
  const cuentasSinPago = await prisma.cuenta.findMany({
    where: {
      estado: { in: ["ACTIVA", "SUSPENDIDA_PAGO"] },
      id: { notIn: [...cuentasConPago] },
    },
    include: { perfil: { select: { nombre: true } } },
    orderBy: { descripcion: "asc" },
  });

  const totalCobrado = pagos
    .filter((p) => p.estado === "PAGADO")
    .reduce((s, p) => s + Number(p.importe), 0);

  const totalPendiente = pagos
    .filter((p) => p.estado !== "PAGADO")
    .reduce((s, p) => s + Number(p.importe), 0);

  const MESES = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

  return (
    <section aria-labelledby="pagos-heading" className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <h1 id="pagos-heading" className="text-2xl font-bold text-white">
          Pagos — {MESES[mes]}/{anio}
        </h1>

        {/* Navegación mes */}
        <form method="GET" className="flex items-center gap-2">
          <select
            name="mes"
            defaultValue={mes}
            className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm min-h-[40px]"
          >
            {MESES.slice(1).map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            name="anio"
            defaultValue={anio}
            className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm min-h-[40px]"
          >
            {[2024, 2025, 2026, 2027].map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <button
            type="submit"
            className="bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white px-4 py-2 rounded-lg text-sm min-h-[40px] transition-colors"
          >
            Ver
          </button>
        </form>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-green-900/30 border border-green-800 rounded-xl p-4">
          <p className="text-2xl font-bold text-green-300">
            ${totalCobrado.toLocaleString("es-AR")}
          </p>
          <p className="text-sm text-green-400 mt-1">Cobrado</p>
        </div>
        <div className="bg-amber-900/30 border border-amber-800 rounded-xl p-4">
          <p className="text-2xl font-bold text-amber-300">
            ${totalPendiente.toLocaleString("es-AR")}
          </p>
          <p className="text-sm text-amber-400 mt-1">Pendiente / Vencido</p>
        </div>
      </div>

      {/* Tabla de pagos registrados */}
      {pagos.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-3">
            Pagos registrados ({pagos.length})
          </h2>
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/50 border-b border-slate-700">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-300">Cliente</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-300">Dirección</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-300">Importe</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-300">Estado</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-300">Método</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-300">Acreditado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {pagos.map((p) => {
                  const cfg = ESTADO_CONFIG[p.estado] ?? { bg: "bg-slate-700 text-slate-400", label: p.estado };
                  return (
                    <tr key={p.id} className="hover:bg-slate-700/40 transition-colors">
                      <td className="px-4 py-3 font-medium text-white">
                        {p.cuenta.perfil.nombre}
                      </td>
                      <td className="px-4 py-3 text-slate-300 max-w-[180px] truncate">
                        {p.cuenta.descripcion}
                      </td>
                      <td className="px-4 py-3 text-white">
                        ${Number(p.importe).toLocaleString("es-AR")}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${cfg.bg}`}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{p.metodo ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {p.acreditado_en
                          ? new Date(p.acreditado_en).toLocaleDateString("es-AR")
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cuentas sin pago — registro manual */}
      {cuentasSinPago.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-3">
            Sin pago registrado ({cuentasSinPago.length})
          </h2>
          <div className="space-y-3">
            {cuentasSinPago.map((c) => (
              <div
                key={c.id}
                className="bg-slate-800 rounded-xl border border-slate-700 px-5 py-4 flex items-center justify-between gap-4"
              >
                <div>
                  <p className="font-medium text-white">{c.descripcion}</p>
                  <p className="text-sm text-slate-400">{c.perfil.nombre}</p>
                </div>
                <PagoManualBulkForm
                  cuentaId={c.id}
                  mes={mes}
                  anio={anio}
                  importe={Number(c.costo_mensual)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {pagos.length === 0 && cuentasSinPago.length === 0 && (
        <p className="text-slate-400">No hay datos para este período.</p>
      )}
    </section>
  );
}

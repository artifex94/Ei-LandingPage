import { prisma } from "@/lib/prisma/client";
import { PagoManualBulkForm } from "@/components/admin/PagoManualBulkForm";
import { ConfirmarTransferenciaForm } from "@/components/admin/ConfirmarTransferenciaForm";

const ESTADO_CONFIG: Record<string, { bg: string; label: string }> = {
  PAGADO:     { bg: "bg-green-900/40 text-green-400",  label: "Pagado" },
  PENDIENTE:  { bg: "bg-amber-900/40 text-amber-400",  label: "Pendiente" },
  VENCIDO:    { bg: "bg-red-900/40 text-red-400",      label: "Vencido" },
  PROCESANDO: { bg: "bg-blue-900/40 text-blue-400",    label: "Procesando" },
};

const METODO_LABELS: Record<string, string> = {
  EFECTIVO:               "Efectivo",
  CHEQUE:                 "Cheque",
  TRANSFERENCIA_BANCARIA: "Transferencia",
  MERCADOPAGO:            "MercadoPago",
  TALO_CVU:               "Talo (crypto)",
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

  // Transferencias bancarias pendientes de confirmar — siempre visibles
  const transferenciasPendientes = await prisma.pago.findMany({
    where: { estado: "PROCESANDO", metodo: "TRANSFERENCIA_BANCARIA" },
    include: {
      cuenta: { include: { perfil: { select: { nombre: true } } } },
    },
    orderBy: { updated_at: "desc" },
  });

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

        {/* Selector de mes/año */}
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
          <a
            href={`/api/admin/export?tipo=pagos&mes=${mes}&anio=${anio}`}
            className="bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium px-3 py-2 rounded-lg min-h-[40px] flex items-center text-sm transition-colors"
            title="Exportar a Excel"
          >
            ↓ Excel
          </a>
        </form>
      </div>

      {/* ── Transferencias bancarias a verificar ─────────────────────────────── */}
      {transferenciasPendientes.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-lg font-semibold text-white">
              Transferencias a verificar
            </h2>
            <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {transferenciasPendientes.length}
            </span>
          </div>

          <div className="bg-amber-900/20 border border-amber-700 rounded-xl p-4 mb-3 text-sm text-amber-300">
            <strong>¿Qué hacer?</strong> Abrí tu homebanking o app del banco y
            buscá la transferencia con el código que figura acá. Si la encontrás,
            hacé clic en "Confirmar pago". Si no aparece todavía, esperá unos
            minutos — a veces las transferencias demoran.
          </div>

          <div className="space-y-3">
            {transferenciasPendientes.map((p) => (
              <div
                key={p.id}
                className="bg-slate-800 border border-amber-700/50 rounded-xl px-5 py-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <p className="font-semibold text-white truncate">
                      {p.cuenta.perfil.nombre}
                    </p>
                    <p className="text-sm text-slate-400 truncate">
                      {p.cuenta.descripcion}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 mt-2">
                      <span className="text-white font-bold">
                        ${Number(p.importe).toLocaleString("es-AR")}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Intl.DateTimeFormat("es-AR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }).format(new Date(p.updated_at))}
                      </span>
                    </div>
                    {p.ref_externa && (
                      <div className="mt-2">
                        <span className="text-xs text-slate-400">
                          Buscá en el banco el concepto:{" "}
                        </span>
                        <span className="font-mono font-bold text-orange-400 text-sm">
                          {p.ref_externa}
                        </span>
                      </div>
                    )}
                  </div>
                  <ConfirmarTransferenciaForm pagoId={p.id} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Resumen del mes ──────────────────────────────────────────────────── */}
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

      {/* ── Pagos del mes ────────────────────────────────────────────────────── */}
      {pagos.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-3">
            Pagos registrados ({pagos.length})
          </h2>

          {/* Tabla — desktop */}
          <div className="hidden md:block bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/50 border-b border-slate-700">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-300">Cliente</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-300">Servicio</th>
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
                      <td className="px-4 py-3 font-medium text-white">{p.cuenta.perfil.nombre}</td>
                      <td className="px-4 py-3 text-slate-300 max-w-[160px] truncate">{p.cuenta.descripcion}</td>
                      <td className="px-4 py-3 text-white">${Number(p.importe).toLocaleString("es-AR")}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${cfg.bg}`}>{cfg.label}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{p.metodo ? METODO_LABELS[p.metodo] ?? p.metodo : "—"}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {p.acreditado_en ? new Date(p.acreditado_en).toLocaleDateString("es-AR") : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Cards — mobile */}
          <div className="md:hidden space-y-3">
            {pagos.map((p) => {
              const cfg = ESTADO_CONFIG[p.estado] ?? { bg: "bg-slate-700 text-slate-400", label: p.estado };
              return (
                <div key={p.id} className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-white truncate">{p.cuenta.perfil.nombre}</p>
                      <p className="text-sm text-slate-400 truncate">{p.cuenta.descripcion}</p>
                    </div>
                    <span className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${cfg.bg}`}>
                      {cfg.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white font-bold">${Number(p.importe).toLocaleString("es-AR")}</span>
                    <span className="text-slate-400 text-xs">
                      {p.metodo ? METODO_LABELS[p.metodo] ?? p.metodo : "—"}
                      {p.acreditado_en && ` · ${new Date(p.acreditado_en).toLocaleDateString("es-AR")}`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Cuentas sin pago — registro manual ──────────────────────────────── */}
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

      {pagos.length === 0 && cuentasSinPago.length === 0 && transferenciasPendientes.length === 0 && (
        <p className="text-slate-400">No hay datos para este período.</p>
      )}
    </section>
  );
}

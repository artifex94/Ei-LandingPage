import type { Metadata } from "next";
import { prisma } from "@/lib/prisma/client";
import { METODO_LABEL as METODO_LABELS } from "@/lib/constants/payment";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { PagoManualBulkForm } from "@/components/admin/PagoManualBulkForm";
import { ConfirmarTransferenciaForm } from "@/components/admin/ConfirmarTransferenciaForm";
import { EditarPagoDialog } from "@/components/admin/EditarPagoDialog";

export const metadata: Metadata = { title: "Pagos" };

const MESES = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const ESTADO_CONFIG: Record<string, { bg: string; label: string }> = {
  PAGADO: { bg: "bg-green-900/40 text-green-400", label: "Pagado" },
  PENDIENTE: { bg: "bg-amber-900/40 text-amber-400", label: "Pendiente" },
  VENCIDO: { bg: "bg-red-900/40 text-red-400", label: "Vencido" },
  PROCESANDO: { bg: "bg-blue-900/40 text-blue-400", label: "Procesando" },
};

export default async function CobrosPagosPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; anio?: string }>;
}) {
  const sp = await searchParams;
  const ahora = new Date();
  const mes = Math.min(12, Math.max(1, Number(sp.mes) || ahora.getMonth() + 1));
  const anio = Math.min(2100, Math.max(2020, Number(sp.anio) || ahora.getFullYear()));

  // Select fino en vez de include: la página usa un puñado de campos y el
  // include arrastraba la cuenta completa (proyección sg_*, notas, overrides).
  const selectPago = {
    id: true, mes: true, anio: true, importe: true, estado: true, metodo: true,
    acreditado_en: true, updated_at: true, ref_externa: true,
    cuenta: { select: { descripcion: true, perfil: { select: { nombre: true } } } },
  } as const;

  const [transferenciasPendientes, pagos, cuentasSinPago] = await Promise.all([
    // Transferencias bancarias a verificar — siempre visibles, sin filtrar por mes.
    prisma.pago.findMany({
      where: { estado: "PROCESANDO", metodo: "TRANSFERENCIA_BANCARIA" },
      select: selectPago,
      orderBy: { updated_at: "desc" },
      take: 100,
    }),
    prisma.pago.findMany({
      where: { mes, anio },
      select: selectPago,
      orderBy: [{ estado: "asc" }, { cuenta: { descripcion: "asc" } }],
      take: 500,
    }),
    // Cuentas activas que todavía no tienen pago cargado este mes → registro
    // manual. El filtro `pagos: { none: { mes, anio } }` resuelve en SQL lo que
    // antes se computaba en JS con el resultado de la query anterior (y sin el
    // borde del take: 500 truncando el set de exclusión).
    prisma.cuenta.findMany({
      where: {
        estado: { in: ["ACTIVA", "SUSPENDIDA_PAGO"] },
        pagos: { none: { mes, anio } },
      },
      include: { perfil: { select: { nombre: true } } },
      orderBy: { descripcion: "asc" },
      take: 500,
    }),
  ]);

  const totalCobrado = pagos
    .filter((p) => p.estado === "PAGADO")
    .reduce((s, p) => s + Number(p.importe), 0);
  const totalPendiente = pagos
    .filter((p) => p.estado !== "PAGADO")
    .reduce((s, p) => s + Number(p.importe), 0);

  type PagoRow = (typeof pagos)[number];

  const editarPagoProps = (p: PagoRow) => ({
    id: p.id,
    mes: p.mes,
    anio: p.anio,
    importe: Number(p.importe),
    estado: p.estado,
    metodo: p.metodo ?? null,
    cuentaNombre: p.cuenta.perfil.nombre,
    cuentaDesc: p.cuenta.descripcion,
  });

  const columns: Column<PagoRow>[] = [
    {
      id: "cliente",
      header: "Cliente",
      cell: (p) => <span className="font-medium text-white">{p.cuenta.perfil.nombre}</span>,
    },
    {
      id: "servicio",
      header: "Servicio",
      cell: (p) => (
        <span className="block text-slate-300 max-w-[160px] truncate">{p.cuenta.descripcion}</span>
      ),
    },
    {
      id: "importe",
      header: "Importe",
      cell: (p) => <span className="text-white">${Number(p.importe).toLocaleString("es-AR")}</span>,
    },
    {
      id: "estado",
      header: "Estado",
      cell: (p) => {
        const cfg = ESTADO_CONFIG[p.estado] ?? { bg: "bg-slate-700 text-slate-400", label: p.estado };
        return (
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${cfg.bg}`}>{cfg.label}</span>
        );
      },
    },
    {
      id: "metodo",
      header: "Método",
      cell: (p) => (
        <span className="text-slate-300">{p.metodo ? METODO_LABELS[p.metodo] ?? p.metodo : "—"}</span>
      ),
    },
    {
      id: "acreditado",
      header: "Acreditado",
      cell: (p) => (
        <span className="text-slate-400 text-xs">
          {p.acreditado_en ? new Date(p.acreditado_en).toLocaleDateString("es-AR") : "—"}
        </span>
      ),
    },
    {
      id: "acciones",
      header: "Acciones",
      srOnlyHeader: true,
      cell: (p) => <EditarPagoDialog pago={editarPagoProps(p)} />,
    },
  ];

  const renderCard = (p: PagoRow) => {
    const cfg = ESTADO_CONFIG[p.estado] ?? { bg: "bg-slate-700 text-slate-400", label: p.estado };
    return (
      <div className="bg-industrial-800 border border-industrial-700 rounded-xl px-4 py-3">
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
          <div className="flex items-center gap-3">
            <span className="text-slate-400 text-xs">
              {p.metodo ? METODO_LABELS[p.metodo] ?? p.metodo : "—"}
              {p.acreditado_en && ` · ${new Date(p.acreditado_en).toLocaleDateString("es-AR")}`}
            </span>
            <EditarPagoDialog pago={editarPagoProps(p)} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <section aria-labelledby="pagos-heading" className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <h1 id="pagos-heading" className="text-2xl font-bold text-white">
          Pagos — {MESES[mes]}/{anio}
        </h1>
        <form method="GET" className="flex items-center gap-2">
          <label htmlFor="select-mes" className="sr-only">Mes</label>
          <select
            id="select-mes"
            name="mes"
            defaultValue={mes}
            aria-label="Mes"
            className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm min-h-[44px]"
          >
            {MESES.slice(1).map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}
          </select>
          <label htmlFor="select-anio" className="sr-only">Año</label>
          <select
            id="select-anio"
            name="anio"
            defaultValue={anio}
            aria-label="Año"
            className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm min-h-[44px]"
          >
            {Array.from({ length: 4 }, (_, i) => new Date().getFullYear() - 1 + i).map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <button
            type="submit"
            aria-label="Ver pagos del mes seleccionado"
            className="bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white px-4 py-2 rounded-lg text-sm min-h-[44px] transition-colors"
          >
            Ver
          </button>
        </form>
      </div>

      {/* Transferencias bancarias a verificar — acción del agente de cobros */}
      {transferenciasPendientes.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-lg font-semibold text-white">Transferencias a verificar</h2>
            <span className="bg-orange-500 text-slate-900 text-xs font-bold px-2 py-0.5 rounded-full">
              {transferenciasPendientes.length}
            </span>
          </div>
          <div className="bg-amber-900/20 border border-amber-700 rounded-xl p-4 mb-3 text-sm text-amber-300">
            Buscá la transferencia en el homebanking con el código que figura acá. Si
            la encontrás, confirmá el pago; si todavía no aparece, esperá unos minutos.
          </div>
          <div className="space-y-3">
            {transferenciasPendientes.map((p) => (
              <div
                key={p.id}
                className="bg-industrial-800 border border-amber-700/50 rounded-xl px-5 py-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <p className="font-semibold text-white truncate">{p.cuenta.perfil.nombre}</p>
                    <p className="text-sm text-slate-400 truncate">{p.cuenta.descripcion}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-2">
                      <span className="text-white font-bold">
                        ${Number(p.importe).toLocaleString("es-AR")}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(p.updated_at).toLocaleString("es-AR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {p.ref_externa && (
                      <div className="mt-2">
                        <span className="text-xs text-slate-400">Concepto a buscar: </span>
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

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-green-900/30 border border-green-800 rounded-xl p-4">
          <p className="text-2xl font-bold text-green-300">${totalCobrado.toLocaleString("es-AR")}</p>
          <p className="text-sm text-green-400 mt-1">Cobrado</p>
        </div>
        <div className="bg-amber-900/30 border border-amber-800 rounded-xl p-4">
          <p className="text-2xl font-bold text-amber-300">${totalPendiente.toLocaleString("es-AR")}</p>
          <p className="text-sm text-amber-400 mt-1">Pendiente / Vencido</p>
        </div>
      </div>

      {pagos.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-3">
            Pagos registrados ({pagos.length})
          </h2>
          <DataTable
            columns={columns}
            rows={pagos}
            keyExtractor={(p) => p.id}
            caption="Pagos registrados del mes"
            renderCard={renderCard}
          />
        </div>
      )}

      {/* Sin pago registrado → registro manual (acción del agente de cobros) */}
      {cuentasSinPago.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-3">
            Sin pago registrado ({cuentasSinPago.length})
          </h2>
          <div className="space-y-3">
            {cuentasSinPago.map((c) => (
              <div
                key={c.id}
                className={`bg-industrial-800 rounded-xl border px-5 py-4 flex items-center justify-between gap-4 ${
                  c.estado === "SUSPENDIDA_PAGO" ? "border-amber-700/50" : "border-industrial-700"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-white">{c.descripcion}</p>
                    {c.estado === "SUSPENDIDA_PAGO" && (
                      <span className="text-xs font-bold text-amber-400 bg-amber-900/40 border border-amber-700/50 px-1.5 py-0.5 rounded">
                        SUSPENDIDA
                      </span>
                    )}
                  </div>
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

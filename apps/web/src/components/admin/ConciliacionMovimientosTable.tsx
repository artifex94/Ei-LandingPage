"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { conciliarMovimientos, type ConciliarMovimientosResult } from "@/lib/actions/conciliacion";
import { DataTable, type Column } from "@/components/ui/DataTable";

export interface CandidatoRow {
  pagoId: string;
  label: string;
}

export interface MovimientoRow {
  id: string;
  fechaLabel: string;
  importe: number;
  descripcion: string;
  clasificacion: "confiable" | "ambiguo" | "sin_match";
  pagoIdPropuesto: string | null;
  candidatos: CandidatoRow[];
}

const CLASIFICACION_CONFIG: Record<
  MovimientoRow["clasificacion"],
  { bg: string; label: string; rowBg: string }
> = {
  confiable: { bg: "bg-green-900/40 text-green-400", label: "Confiable", rowBg: "bg-green-950/10" },
  ambiguo: { bg: "bg-amber-900/40 text-amber-400", label: "Ambiguo", rowBg: "bg-amber-950/10" },
  sin_match: { bg: "bg-slate-700 text-slate-400", label: "Sin match", rowBg: "bg-slate-900" },
};

/**
 * Tabla interactiva de movimientos sin conciliar (Fase 6). Los matches
 * "confiables" vienen pre-tildados (por ref_externa o por importe único); los
 * "ambiguos" requieren elegir el pago entre 2+ candidatos; los "sin match"
 * solo se muestran informativos, sin acción. "Conciliar seleccionados"
 * aplica el lote en un solo click (server-side, un par por transacción).
 */
export function ConciliacionMovimientosTable({ movimientos }: { movimientos: MovimientoRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [resultado, setResultado] = useState<ConciliarMovimientosResult | null>(null);

  // movimiento_id -> pago_id seleccionado (string vacía = no incluido en el lote).
  const inicial = useMemo(() => {
    const m: Record<string, string> = {};
    for (const mov of movimientos) {
      if (mov.clasificacion === "confiable" && mov.pagoIdPropuesto) {
        m[mov.id] = mov.pagoIdPropuesto;
      } else {
        m[mov.id] = "";
      }
    }
    return m;
  }, [movimientos]);

  const [seleccion, setSeleccion] = useState<Record<string, string>>(inicial);

  if (movimientos.length === 0) {
    return (
      <div className="bg-green-900/20 border border-green-800 rounded-xl p-8 text-center">
        <p className="text-green-400 font-semibold">No hay movimientos pendientes de conciliar.</p>
      </div>
    );
  }

  const cantidadSeleccionada = Object.values(seleccion).filter(Boolean).length;

  function toggleConfiable(id: string, pagoId: string, incluir: boolean) {
    setSeleccion((prev) => ({ ...prev, [id]: incluir ? pagoId : "" }));
  }

  function elegirCandidato(id: string, pagoId: string) {
    setSeleccion((prev) => ({ ...prev, [id]: pagoId }));
  }

  function conciliarSeleccionados() {
    const pares = Object.entries(seleccion)
      .filter(([, pagoId]) => pagoId)
      .map(([movimiento_id, pago_id]) => ({ movimiento_id, pago_id }));
    if (pares.length === 0) return;

    setResultado(null);
    startTransition(async () => {
      const res = await conciliarMovimientos(pares);
      setResultado(res);
      if (res.ok) router.refresh();
    });
  }

  const columns: Column<MovimientoRow>[] = [
    {
      id: "fecha",
      header: "Fecha",
      cell: (m) => <span className="text-slate-300 whitespace-nowrap">{m.fechaLabel}</span>,
    },
    {
      id: "descripcion",
      header: "Descripción",
      cell: (m) => <span className="block max-w-[260px] truncate text-slate-300">{m.descripcion}</span>,
    },
    {
      id: "importe",
      header: "Importe",
      cell: (m) => <span className="text-white font-medium">${m.importe.toLocaleString("es-AR")}</span>,
    },
    {
      id: "clasificacion",
      header: "Match",
      cell: (m) => {
        const cfg = CLASIFICACION_CONFIG[m.clasificacion];
        return <span className={`text-xs font-semibold px-2 py-1 rounded-full ${cfg.bg}`}>{cfg.label}</span>;
      },
    },
    {
      id: "accion",
      header: "Pago propuesto",
      cell: (m) => {
        if (m.clasificacion === "confiable" && m.pagoIdPropuesto) {
          const candidato = m.candidatos[0];
          return (
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={Boolean(seleccion[m.id])}
                onChange={(e) => toggleConfiable(m.id, m.pagoIdPropuesto!, e.target.checked)}
                className="h-4 w-4 accent-green-500"
              />
              <span className="truncate max-w-[220px]">{candidato?.label ?? "—"}</span>
            </label>
          );
        }
        if (m.clasificacion === "ambiguo") {
          return (
            <select
              value={seleccion[m.id] ?? ""}
              onChange={(e) => elegirCandidato(m.id, e.target.value)}
              aria-label={`Elegir pago para el movimiento del ${m.fechaLabel}`}
              className="bg-slate-700 border border-slate-600 text-white rounded-lg px-2 py-1.5 text-xs max-w-[240px]"
            >
              <option value="">— Elegir pago —</option>
              {m.candidatos.map((c) => (
                <option key={c.pagoId} value={c.pagoId}>
                  {c.label}
                </option>
              ))}
            </select>
          );
        }
        return <span className="text-slate-500 text-sm">Sin candidatos</span>;
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-white">
          Movimientos sin conciliar ({movimientos.length})
        </h2>
        <button
          type="button"
          onClick={conciliarSeleccionados}
          disabled={isPending || cantidadSeleccionada === 0}
          className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold min-h-[44px] transition-colors whitespace-nowrap"
        >
          {isPending ? "Conciliando…" : `Conciliar seleccionados (${cantidadSeleccionada})`}
        </button>
      </div>

      {resultado && (
        <div
          role="status"
          className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-300"
        >
          <p>
            ✓ {resultado.conciliados} conciliado{resultado.conciliados !== 1 ? "s" : ""}
            {resultado.omitidos && resultado.omitidos.length > 0
              ? ` · ${resultado.omitidos.length} omitido${resultado.omitidos.length !== 1 ? "s" : ""}`
              : ""}
          </p>
          {resultado.omitidos && resultado.omitidos.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-xs text-amber-300 list-disc list-inside">
              {resultado.omitidos.map((o, i) => (
                <li key={i}>{o.motivo}</li>
              ))}
            </ul>
          )}
          {resultado.error && <p className="text-red-400">{resultado.error}</p>}
        </div>
      )}

      <DataTable
        columns={columns}
        rows={movimientos}
        keyExtractor={(m) => m.id}
        caption="Movimientos bancarios sin conciliar con su propuesta de match"
        rowClassName={(m) => `${CLASIFICACION_CONFIG[m.clasificacion].rowBg} hover:bg-slate-800/50`}
      />
    </div>
  );
}

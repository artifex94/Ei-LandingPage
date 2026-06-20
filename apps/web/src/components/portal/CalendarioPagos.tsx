"use client";

import { useState } from "react";
import type { EstadoPago } from "@/generated/prisma/client";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { PagoModal } from "./PagoModal";

// ── Tipos ──────────────────────────────────────────────────────────────────────

export interface PagoPlano {
  id: string;
  cuenta_id: string;
  mes: number;
  anio: number;
  importe: number;
  estado: EstadoPago;
  metodo: string | null;
  ref_externa: string | null;
  acreditado_en: Date | string | null;
  registrado_por: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

interface Props {
  pagos: PagoPlano[];
  anio: number;
  cuentaId: string;
}

// ── Constantes ─────────────────────────────────────────────────────────────────

const MESES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

const ESTADO_CONFIG: Record<EstadoPago | "SIN_DATOS", {
  variant: BadgeVariant; icono: string; etiqueta: string; esAccionable: boolean;
}> = {
  VENCIDO:    { variant: "danger",  icono: "⚠", etiqueta: "DEUDA",      esAccionable: true  },
  PENDIENTE:  { variant: "warning", icono: "○", etiqueta: "PENDIENTE",  esAccionable: true  },
  PROCESANDO: { variant: "info",    icono: "↻", etiqueta: "PROCESANDO", esAccionable: false },
  PAGADO:     { variant: "success", icono: "✓", etiqueta: "ABONADO",    esAccionable: false },
  SIN_DATOS:  { variant: "neutral", icono: "",  etiqueta: "—",          esAccionable: false },
};

// ── Componente principal ───────────────────────────────────────────────────────

export function CalendarioPagos({ pagos, anio, cuentaId }: Props) {
  const [pagoSeleccionado, setPagoSeleccionado] = useState<{
    mes: number; pago: PagoPlano | null;
  } | null>(null);

  const pagosPorMes = new Map(pagos.map((p) => [p.mes, p]));

  return (
    <>
      {/* ── Grilla de meses ── */}
      <div
        className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4"
        role="list"
        aria-label={`Calendario de pagos del año ${anio}`}
      >
        {MESES.map((nombreMes, idx) => {
          const numMes  = idx + 1;
          const pago    = pagosPorMes.get(numMes);
          const estado  = (pago?.estado ?? "SIN_DATOS") as EstadoPago | "SIN_DATOS";
          const cfg     = ESTADO_CONFIG[estado];
          const importeStr = pago?.importe
            ? `$${Number(pago.importe).toLocaleString("es-AR")}`
            : "";

          const ariaCard = [`${nombreMes} ${anio}: ${cfg.etiqueta}`, importeStr]
            .filter(Boolean)
            .join(". ");

          // ── Tarjeta de mes ──
          return (
            <div
              key={numMes}
              role="listitem"
              aria-label={ariaCard}
              className="portal-panel flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between px-3 pt-2.5 pb-1 gap-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
                  {nombreMes.slice(0, 3)}
                </span>
                <Badge variant={cfg.variant}>
                  {cfg.icono && (
                    <span
                      className={`leading-none mr-0.5${estado === "PROCESANDO" ? " inline-block animate-spin" : ""}`}
                      aria-hidden="true"
                    >
                      {cfg.icono}
                    </span>
                  )}
                  {cfg.etiqueta}
                </Badge>
              </div>

              {/* Importe */}
              <span className="text-sm font-mono tabular-nums text-slate-300 px-3 pb-3 leading-none min-h-[14px]">
                {importeStr || " "}
              </span>

              {/* Botón de pago (solo meses accionables) */}
              {cfg.esAccionable && pago && (
                <button
                  onClick={() => setPagoSeleccionado({ mes: numMes, pago })}
                  className="mt-auto w-full border-t border-tactical-600/60 bg-tactical-500 py-2.5 text-center text-sm font-semibold text-slate-950 transition-colors hover:bg-tactical-400"
                  aria-label={`Pagar ${nombreMes} — ${importeStr}`}
                >
                  Pagar
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal de pago */}
      {pagoSeleccionado?.pago && (
        <PagoModal
          pago={pagoSeleccionado.pago}
          cuentaId={cuentaId}
          nombreMes={MESES[pagoSeleccionado.mes - 1]}
          onClose={() => setPagoSeleccionado(null)}
        />
      )}
    </>
  );
}

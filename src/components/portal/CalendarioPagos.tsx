"use client";

import { useState } from "react";
import type { EstadoPago } from "@/generated/prisma/client";
import { PagoModal } from "./PagoModal";

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

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

interface EstadoConfig {
  bg: string;
  textColor: string;
  icono: string;
  iconoAriaLabel: string;
  etiqueta: string;
  esAccionable: boolean;
}

const ESTADO_CONFIG: Record<EstadoPago | "SIN_DATOS", EstadoConfig> = {
  VENCIDO: {
    bg: "bg-red-700",
    textColor: "text-white",
    icono: "⚠",
    iconoAriaLabel: "Triángulo de advertencia",
    etiqueta: "DEUDA",
    esAccionable: true,
  },
  PENDIENTE: {
    bg: "bg-amber-700",
    textColor: "text-white",
    icono: "○",
    iconoAriaLabel: "Círculo",
    etiqueta: "PENDIENTE",
    esAccionable: true,
  },
  PROCESANDO: {
    bg: "bg-blue-700",
    textColor: "text-white",
    icono: "↻",
    iconoAriaLabel: "Flecha circular",
    etiqueta: "PROCESANDO",
    esAccionable: false,
  },
  PAGADO: {
    bg: "bg-green-700",
    textColor: "text-white",
    icono: "✓",
    iconoAriaLabel: "Tilde de verificación",
    etiqueta: "ABONADO",
    esAccionable: false,
  },
  SIN_DATOS: {
    bg: "bg-slate-700/50",
    textColor: "text-slate-500",
    icono: "",
    iconoAriaLabel: "",
    etiqueta: "—",
    esAccionable: false,
  },
};

interface Props {
  pagos: PagoPlano[];
  anio: number;
  cuentaId: string;
}

export function CalendarioPagos({ pagos, anio, cuentaId }: Props) {
  const [pagoSeleccionado, setPagoSeleccionado] = useState<{
    mes: number;
    pago: PagoPlano | null;
  } | null>(null);

  const pagosPorMes = new Map(pagos.map((p) => [p.mes, p]));

  return (
    <>
      <div
        className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6"
        role="list"
        aria-label={`Calendario de pagos del año ${anio}`}
      >
        {MESES.map((nombreMes, idx) => {
          const numMes = idx + 1;
          const pago = pagosPorMes.get(numMes);
          const estado = (pago?.estado ?? "SIN_DATOS") as EstadoPago | "SIN_DATOS";
          const cfg = ESTADO_CONFIG[estado];
          const importeStr = pago?.importe
            ? `$${Number(pago.importe).toLocaleString("es-AR")}`
            : "";

          const ariaLabel = [
            `${nombreMes} ${anio}:`,
            cfg.etiqueta,
            importeStr,
          ]
            .filter(Boolean)
            .join(" ");

          // Celda accionable: el botón ocupa toda la celda para máxima área táctil
          if (cfg.esAccionable && pago) {
            return (
              <button
                key={numMes}
                role="listitem"
                onClick={() => setPagoSeleccionado({ mes: numMes, pago })}
                className={`${cfg.bg} ${cfg.textColor} rounded-xl p-3 flex flex-col items-center gap-1 min-h-[110px] w-full focus:outline-2 focus:outline-white focus:outline-offset-2 active:opacity-80 transition-opacity`}
                aria-label={`${ariaLabel} — Tocá para pagar`}
              >
                <span className="text-xs font-semibold uppercase tracking-wide opacity-80">
                  {nombreMes.slice(0, 3)}
                </span>
                {cfg.icono && (
                  <span className="text-2xl leading-none font-bold" aria-hidden="true">
                    {cfg.icono}
                  </span>
                )}
                <span className="text-xs font-bold">{cfg.etiqueta}</span>
                {importeStr && (
                  <span className="text-xs font-semibold opacity-90">{importeStr}</span>
                )}
                <span className="text-xs underline underline-offset-2 mt-1 opacity-90">
                  Pagar
                </span>
              </button>
            );
          }

          return (
            <div
              key={numMes}
              role="listitem"
              className={`${cfg.bg} ${cfg.textColor} rounded-xl p-3 flex flex-col items-center gap-1 min-h-[110px]`}
            >
              <span className="text-xs font-semibold uppercase tracking-wide opacity-80">
                {nombreMes.slice(0, 3)}
              </span>

              {cfg.icono && (
                <span
                  className="text-2xl leading-none font-bold"
                  role="img"
                  aria-label={cfg.iconoAriaLabel}
                >
                  {cfg.icono}
                </span>
              )}

              <span className="text-xs font-bold">{cfg.etiqueta}</span>

              {importeStr && (
                <span className="text-xs opacity-90">{importeStr}</span>
              )}

              <span className="sr-only">{ariaLabel}</span>
            </div>
          );
        })}
      </div>

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

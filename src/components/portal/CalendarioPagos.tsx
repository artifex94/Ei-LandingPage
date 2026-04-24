"use client";

import { useState } from "react";
import type { EstadoPago } from "@/generated/prisma/client";
import type { DiaEvento, TipoDia } from "@/lib/actions/eventos";
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
  eventosHeatmap?: DiaEvento[];
}

// ── Constantes ─────────────────────────────────────────────────────────────────

const MESES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

const ESTADO_CONFIG: Record<EstadoPago | "SIN_DATOS", {
  badgeBg: string; icono: string; etiqueta: string; esAccionable: boolean;
}> = {
  VENCIDO:    { badgeBg: "bg-orange-600",  icono: "⚠",  etiqueta: "DEUDA",      esAccionable: true  },
  PENDIENTE:  { badgeBg: "bg-amber-700",   icono: "○",  etiqueta: "PENDIENTE",  esAccionable: true  },
  PROCESANDO: { badgeBg: "bg-blue-700",    icono: "↻",  etiqueta: "PROCESANDO", esAccionable: false },
  PAGADO:     { badgeBg: "bg-emerald-700", icono: "✓",  etiqueta: "ABONADO",    esAccionable: false },
  SIN_DATOS:  { badgeBg: "bg-slate-600",   icono: "",   etiqueta: "—",          esAccionable: false },
};

// ── Colores del heatmap por tipo y cantidad de eventos ─────────────────────────
// Paleta de menor (1 evento) a mayor intensidad (6+ eventos)
// Se rige por el estándar de colores de telemonitoreo:
//   Rojo     → emergencia médica / personal
//   Violeta  → pánico / coacción / violencia
//   Naranja  → fuego / humo
//   Ámbar    → intrusión / robo
//   Azul     → avería técnica (AC, batería, tamper)
//   Verde    → actividad normal del sistema (aperturas, cierres, tests)

const PALETA: Record<Exclude<TipoDia, "vacio">, [string, string, string, string]> = {
  medica:    ["#450a0a", "#7f1d1d", "#b91c1c", "#dc2626"],
  violencia: ["#2e1065", "#4c1d95", "#6d28d9", "#7c3aed"],
  fuego:     ["#431407", "#7c2d12", "#c2410c", "#ea580c"],
  intrusion: ["#451a03", "#78350f", "#b45309", "#d97706"],
  tecnico:   ["#172554", "#1e3a8a", "#1d4ed8", "#2563eb"],
  normal:    ["#052e16", "#064e3b", "#065f46", "#059669"],
};

// Animación de pulso activada cuando hay ≥6 eventos ese día
const ANIM: Record<Exclude<TipoDia, "vacio">, string> = {
  medica:    "animate-led-crit",
  violencia: "animate-led-violencia",
  fuego:     "animate-led-alert",
  intrusion: "animate-led-warn",
  tecnico:   "animate-led-idle",
  normal:    "animate-led-ok",
};

const TIPO_LABEL: Record<TipoDia, string> = {
  vacio:     "Sin señal",
  normal:    "Sistema activo",
  tecnico:   "Avería técnica",
  intrusion: "Intrusión",
  fuego:     "Fuego / Humo",
  violencia: "Pánico / Violencia",
  medica:    "Emergencia médica",
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function getDiasEnMes(mes: number, anio: number): number {
  return new Date(anio, mes, 0).getDate();
}

function celStyle(tipo: TipoDia, total: number): { bg: string; animClass: string } {
  if (tipo === "vacio" || total === 0) return { bg: "#0f172a", animClass: "" };
  const idx = total >= 6 ? 3 : total >= 3 ? 2 : total >= 2 ? 1 : 0;
  return {
    bg: PALETA[tipo][idx],
    animClass: total >= 6 ? ANIM[tipo] : "",
  };
}

// ── Leyenda ────────────────────────────────────────────────────────────────────

const LEYENDA: { tipo: TipoDia; label: string }[] = [
  { tipo: "normal",    label: "Normal" },
  { tipo: "intrusion", label: "Intrusión" },
  { tipo: "fuego",     label: "Fuego" },
  { tipo: "violencia", label: "Pánico / Violencia" },
  { tipo: "medica",    label: "Emergencia médica" },
  { tipo: "tecnico",   label: "Avería técnica" },
  { tipo: "vacio",     label: "Sin señal" },
];

// ── Componente principal ───────────────────────────────────────────────────────

export function CalendarioPagos({ pagos, anio, cuentaId, eventosHeatmap }: Props) {
  const [pagoSeleccionado, setPagoSeleccionado] = useState<{
    mes: number; pago: PagoPlano | null;
  } | null>(null);

  const pagosPorMes = new Map(pagos.map((p) => [p.mes, p]));

  // Mapa fecha → evento para acceso O(1) desde cada celda de día
  const eventosMap = new Map(
    (eventosHeatmap ?? []).map((e) => [e.fecha, e])
  );

  const hoy = new Date();
  const hayEventos = (eventosHeatmap?.length ?? 0) > 0;

  return (
    <>
      {/* ── Grilla de meses ── */}
      <div
        className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6"
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

          const diasEnMes = getDiasEnMes(numMes, anio);

          // Resumen de actividad del mes para aria
          const eventosDelMes = (eventosHeatmap ?? []).filter((e) =>
            e.fecha.startsWith(`${anio}-${String(numMes).padStart(2, "0")}`)
          );
          const totalDelMes = eventosDelMes.reduce((s, e) => s + e.total, 0);
          const ariaCard = [
            `${nombreMes} ${anio}: ${cfg.etiqueta}`,
            importeStr,
            hayEventos
              ? totalDelMes > 0
                ? `${totalDelMes} eventos de alarma registrados`
                : "Sin señal de alarma registrada"
              : undefined,
          ].filter(Boolean).join(". ");

          // ── Tarjeta de mes ──
          return (
            <div
              key={numMes}
              role="listitem"
              aria-label={ariaCard}
              className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden flex flex-col"
            >
              {/* Cabecera: nombre del mes + badge de pago */}
              <div className="flex items-center justify-between px-2.5 pt-2.5 pb-1 gap-1">
                <span className="text-xs font-bold text-white uppercase tracking-wide">
                  {nombreMes.slice(0, 3)}
                </span>
                <div className={`${cfg.badgeBg} flex items-center gap-0.5 rounded-full px-1.5 py-0.5`}>
                  {cfg.icono && (
                    <span className="text-[10px] text-white leading-none" aria-hidden="true">
                      {cfg.icono}
                    </span>
                  )}
                  <span className="text-[9px] font-bold text-white leading-none">
                    {cfg.etiqueta}
                  </span>
                </div>
              </div>

              {/* Importe */}
              {importeStr && (
                <span className="text-[10px] text-slate-400 px-2.5 pb-1 leading-none">
                  {importeStr}
                </span>
              )}

              {/* ── Grilla de días (heatmap de eventos) ── */}
              <DayGrid
                mes={numMes}
                anio={anio}
                diasEnMes={diasEnMes}
                eventosMap={eventosMap}
                hoy={hoy}
                nombreMes={nombreMes}
                hayDatos={hayEventos}
              />

              {/* Botón de pago (solo meses accionables) */}
              {cfg.esAccionable && pago && (
                <button
                  onClick={() => setPagoSeleccionado({ mes: numMes, pago })}
                  className="w-full text-center bg-orange-600 hover:bg-orange-500 active:bg-orange-700 transition-colors py-1.5 text-[10px] font-bold text-white tracking-wide mt-auto"
                  aria-label={`Pagar ${nombreMes} — ${importeStr}`}
                >
                  PAGAR
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Leyenda de colores ── */}
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5" aria-label="Referencia de colores del sistema de alarma">
        {LEYENDA.map(({ tipo, label }) => {
          const color = tipo === "vacio"
            ? "#0f172a"
            : PALETA[tipo][3];
          return (
            <div key={tipo} className="flex items-center gap-1.5">
              <span
                className="inline-block w-3 h-3 rounded-[2px] flex-shrink-0"
                style={{ backgroundColor: color, boxShadow: tipo !== "vacio" ? `0 0 4px ${color}66` : "none" }}
                aria-hidden="true"
              />
              <span className="text-[10px] text-slate-400">{label}</span>
            </div>
          );
        })}
        <div className="flex items-center gap-1.5">
          <div className="flex gap-px">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className="inline-block w-2.5 h-3 rounded-[1px]"
                style={{ backgroundColor: PALETA.normal[i] }}
                aria-hidden="true"
              />
            ))}
          </div>
          <span className="text-[10px] text-slate-400">intensidad →</span>
        </div>
      </div>

      {!hayEventos && (
        <p className="mt-3 text-[11px] text-slate-500 italic">
          El historial de actividad del sistema de alarma estará disponible
          una vez que se establezca conexión con SoftGuard.
        </p>
      )}

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

// ── Sub-componente: grilla de días ─────────────────────────────────────────────

interface DayGridProps {
  mes: number;
  anio: number;
  diasEnMes: number;
  eventosMap: Map<string, DiaEvento>;
  hoy: Date;
  nombreMes: string;
  hayDatos: boolean;
}

function DayGrid({ mes, anio, diasEnMes, eventosMap, hoy, nombreMes, hayDatos }: DayGridProps) {
  const [tooltip, setTooltip] = useState<string | null>(null);

  const mesPad = String(mes).padStart(2, "0");

  return (
    <div className="px-2 pt-1 pb-2 flex-1 flex flex-col gap-1">
      {/* Tooltip del día seleccionado */}
      <div className="min-h-[16px]">
        {tooltip && (
          <p className="text-[9px] text-slate-300 leading-none truncate">{tooltip}</p>
        )}
      </div>

      {/* Grilla 7 columnas */}
      <div
        className="grid grid-cols-7 gap-[2px]"
        aria-hidden="true"
        onMouseLeave={() => setTooltip(null)}
      >
        {Array.from({ length: diasEnMes }, (_, i) => {
          const dia = i + 1;
          const fechaStr = `${anio}-${mesPad}-${String(dia).padStart(2, "0")}`;
          const fechaDate = new Date(anio, mes - 1, dia);
          const esFuturo = fechaDate > hoy;

          if (esFuturo) {
            return (
              <div
                key={dia}
                className="aspect-square rounded-[2px]"
                style={{ backgroundColor: "#0f172a" }}
              />
            );
          }

          const evento = hayDatos ? eventosMap.get(fechaStr) : undefined;
          const tipo: TipoDia = evento?.tipo ?? (hayDatos ? "vacio" : "vacio");
          const total = evento?.total ?? 0;
          const { bg, animClass } = celStyle(tipo, total);

          const tooltipTxt = total > 0
            ? `${dia} ${nombreMes}: ${total} ev · ${TIPO_LABEL[tipo]}`
            : `${dia} ${nombreMes}: sin señal`;

          return (
            <div
              key={dia}
              className={`aspect-square rounded-[2px] cursor-default transition-transform hover:scale-125 hover:z-10 relative ${animClass}`}
              style={{ backgroundColor: bg }}
              onMouseEnter={() => setTooltip(tooltipTxt)}
            />
          );
        })}
      </div>
    </div>
  );
}

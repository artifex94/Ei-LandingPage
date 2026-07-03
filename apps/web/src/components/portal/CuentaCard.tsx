import Link from "next/link";
import {
  calcularEstadoFinanciero,
  type EstadoFinancieroConfig,
  type PagoParaEstado,
} from "@/lib/billing-state";

const CATEGORIA_LABELS: Record<string, string> = {
  ALARMA_MONITOREO: "Alarma y Monitoreo",
  DOMOTICA:         "Domótica",
  CAMARA_CCTV:      "Cámaras CCTV",
  ANTENA_STARLINK:  "StarLink",
  OTRO:             "Otro",
};

interface LedConfig {
  core: string;
  pulse: string;
  bar: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  badgeLabel: string | ((d: number) => string);
}

function getLedConfig(
  estadoCuenta: string,
  estadoFinanciero: ReturnType<typeof calcularEstadoFinanciero>
): LedConfig {
  if (estadoCuenta === "EN_MANTENIMIENTO") {
    return {
      core: "bg-amber-400",
      pulse: "animate-led-warn",
      bar: "bg-amber-500",
      badgeBg: "bg-amber-500/10",
      badgeText: "text-amber-400",
      badgeBorder: "border-amber-500/30",
      badgeLabel: "En mantenimiento",
    };
  }
  if (estadoCuenta === "BAJA_DEFINITIVA") {
    return {
      core: "bg-slate-700",
      pulse: "",
      bar: "bg-slate-700",
      badgeBg: "bg-industrial-800",
      badgeText: "text-slate-500",
      badgeBorder: "border-slate-700",
      badgeLabel: "Baja",
    };
  }

  switch (estadoFinanciero.tipo) {
    case "GRACE_PERIOD":
      return {
        core: "bg-tactical-500",
        pulse: "animate-led-warn",
        bar: "bg-tactical-500",
        badgeBg: "bg-tactical-500/10",
        badgeText: "text-tactical-400",
        badgeBorder: "border-tactical-500/30",
        badgeLabel: (d: number) => `${d} día${d !== 1 ? "s" : ""} de mora`,
      };
    case "SUSPENDED":
      return {
        core: "bg-red-500",
        pulse: "animate-led-crit",
        bar: "bg-red-600",
        badgeBg: "bg-red-500/10",
        badgeText: "text-red-400",
        badgeBorder: "border-red-500/30",
        badgeLabel: "Suspendida",
      };
    case "PAYMENT_IN_REVIEW":
      return {
        core: "bg-blue-400",
        pulse: "animate-led-idle",
        bar: "bg-blue-500",
        badgeBg: "bg-blue-500/10",
        badgeText: "text-blue-400",
        badgeBorder: "border-blue-500/30",
        badgeLabel: "Pago en revisión",
      };
    default: // ACTIVE
      return {
        core: "bg-blue-400",
        pulse: "animate-led-idle",
        bar: "bg-blue-500",
        badgeBg: "bg-blue-500/10",
        badgeText: "text-blue-400",
        badgeBorder: "border-blue-500/30",
        badgeLabel: "Al día",
      };
  }
}

interface CuentaCardProps {
  cuenta: {
    id: string;
    descripcion: string;
    estado: string;
    categoria: string;
    sensores: { id: string }[];
    pagos: (PagoParaEstado & { id: string })[];
  };
  /** Umbrales de `ParametroNegocio` (DIAS_GRACIA/DIAS_SUSPENSION); sin config = default actual. */
  config?: EstadoFinancieroConfig;
}

export function CuentaCard({ cuenta, config }: CuentaCardProps) {
  const estadoFinanciero = calcularEstadoFinanciero(cuenta.estado, cuenta.pagos, undefined, undefined, config);
  const led = getLedConfig(cuenta.estado, estadoFinanciero);

  const badgeLabel =
    typeof led.badgeLabel === "function"
      ? led.badgeLabel((estadoFinanciero as { dias_mora?: number }).dias_mora ?? 0)
      : led.badgeLabel;

  const tieneAlerta = cuenta.sensores.length > 0;

  return (
    <Link
      href={`/portal/cuentas/${cuenta.id}`}
      className="block overflow-hidden rounded-xl border border-white/10 bg-slate-950/65
                 shadow-[0_14px_30px_rgba(2,6,23,.14)] transition-all duration-200
                 hover:-translate-y-0.5 hover:border-tactical-500/35 hover:bg-slate-950/85 group"
      aria-label={`Ver detalle de ${cuenta.descripcion} — ${badgeLabel}`}
    >
      {/* Barra de estado superior — indicador cromático */}
      <div className={`h-[2px] w-full ${led.bar}`} aria-hidden="true" />

      {/* Cabecera — alineación F-pattern */}
      <div className="px-4 py-4 border-b border-white/8 flex items-center gap-3">

        {/* LED diodo — estado de hardware */}
        <div
          className="relative flex h-4 w-4 flex-shrink-0 items-center justify-center"
          role="status"
          aria-label={`Estado: ${badgeLabel}`}
        >
          <span className={`relative inline-flex h-2 w-2 rounded-full z-10 ${led.core}`} />
          {led.pulse && (
            <span className={`absolute inline-flex h-full w-full rounded-full ${led.pulse}`} aria-hidden="true" />
          )}
        </div>

        {/* Nombre y categoría */}
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-slate-200 text-base leading-tight truncate group-hover:text-white transition-colors">
            {cuenta.descripcion}
          </h2>
          <span className="text-xs text-slate-500">
            {CATEGORIA_LABELS[cuenta.categoria] ?? cuenta.categoria}
          </span>
        </div>

        {/* Badge de estado */}
        <span
          className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-md border ${led.badgeBg} ${led.badgeText} ${led.badgeBorder}`}
        >
          {badgeLabel}
        </span>
      </div>

      {/* Cuerpo — alertas adicionales */}
      {(estadoFinanciero.tipo === "SUSPENDED" || tieneAlerta || estadoFinanciero.tipo === "GRACE_PERIOD") && (
        <div className="px-4 py-3 flex flex-wrap gap-1.5">
          {estadoFinanciero.tipo === "SUSPENDED" && (
            <span className="flex items-center gap-1 rounded-md border border-red-500/20 bg-red-500/10 px-2 py-1 text-xs font-semibold text-red-400">
              Reactivar servicio
            </span>
          )}
          {tieneAlerta && (
            <span className="flex items-center gap-1 rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-400">
              Mantenimiento pendiente
            </span>
          )}
        </div>
      )}
    </Link>
  );
}

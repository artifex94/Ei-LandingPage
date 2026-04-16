import Link from "next/link";
import {
  calcularEstadoFinanciero,
  type PagoParaEstado,
} from "@/lib/billing-state";

const ESTADO_CUENTA_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  ACTIVA: { bg: "bg-green-900/40", text: "text-green-400", label: "Activa" },
  SUSPENDIDA_PAGO: { bg: "bg-red-900/40", text: "text-red-400", label: "Suspendida" },
  EN_MANTENIMIENTO: { bg: "bg-yellow-900/40", text: "text-yellow-400", label: "En mantenimiento" },
  BAJA_DEFINITIVA: { bg: "bg-slate-700", text: "text-slate-400", label: "Baja" },
};

const ESTADO_FINANCIERO_BADGE = {
  ACTIVE:            { bg: "bg-green-900/40",  text: "text-green-400",  label: "Al día" },
  GRACE_PERIOD:      { bg: "bg-amber-900/40",  text: "text-amber-400",  label: (d: number) => `${d} día${d !== 1 ? "s" : ""} de mora` },
  SUSPENDED:         { bg: "bg-red-900/40",    text: "text-red-400",    label: "Suspendida" },
  PAYMENT_IN_REVIEW: { bg: "bg-blue-900/40",   text: "text-blue-400",   label: "Pago en revisión" },
} as const;

const CATEGORIA_LABELS: Record<string, string> = {
  ALARMA_MONITOREO: "Alarma y monitoreo",
  DOMOTICA: "Domótica",
  CAMARA_CCTV: "Cámaras CCTV",
  ANTENA_STARLINK: "Antena StarLink",
  OTRO: "Otro",
};

interface CuentaCardProps {
  cuenta: {
    id: string;
    descripcion: string;
    estado: string;
    categoria: string;
    sensores: { id: string }[];
    pagos: (PagoParaEstado & { id: string })[];
  };
}

export function CuentaCard({ cuenta }: CuentaCardProps) {
  const estadoFinanciero = calcularEstadoFinanciero(cuenta.estado, cuenta.pagos);

  // Badge principal: refleja estado financiero (más informativo que el de BD)
  let badgeBg: string;
  let badgeText: string;
  let badgeLabel: string;

  if (cuenta.estado === "EN_MANTENIMIENTO") {
    badgeBg   = ESTADO_CUENTA_BADGE.EN_MANTENIMIENTO.bg;
    badgeText = ESTADO_CUENTA_BADGE.EN_MANTENIMIENTO.text;
    badgeLabel = ESTADO_CUENTA_BADGE.EN_MANTENIMIENTO.label;
  } else if (cuenta.estado === "BAJA_DEFINITIVA") {
    badgeBg   = ESTADO_CUENTA_BADGE.BAJA_DEFINITIVA.bg;
    badgeText = ESTADO_CUENTA_BADGE.BAJA_DEFINITIVA.text;
    badgeLabel = ESTADO_CUENTA_BADGE.BAJA_DEFINITIVA.label;
  } else {
    if (estadoFinanciero.tipo === "GRACE_PERIOD") {
      const cfg = ESTADO_FINANCIERO_BADGE.GRACE_PERIOD;
      badgeBg   = cfg.bg;
      badgeText = cfg.text;
      badgeLabel = cfg.label(estadoFinanciero.dias_mora);
    } else {
      const cfg = ESTADO_FINANCIERO_BADGE[estadoFinanciero.tipo];
      badgeBg   = cfg.bg;
      badgeText = cfg.text;
      badgeLabel = cfg.label;
    }
  }

  const tieneAlerta = cuenta.sensores.length > 0;

  return (
    <Link
      href={`/portal/cuentas/${cuenta.id}`}
      className="block bg-slate-800 rounded-xl border border-slate-700 p-5 hover:border-orange-500 hover:bg-slate-800/80 transition-all group"
      aria-label={`Ver detalle de ${cuenta.descripcion} — ${badgeLabel}`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <h2 className="font-semibold text-white text-lg leading-snug group-hover:text-orange-400 transition-colors">
          {cuenta.descripcion}
        </h2>
        <span
          className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${badgeBg} ${badgeText}`}
        >
          {badgeLabel}
        </span>
      </div>

      <p className="text-sm text-slate-400 mb-4">
        {CATEGORIA_LABELS[cuenta.categoria] ?? cuenta.categoria}
      </p>

      <div className="flex flex-wrap gap-2">
        {estadoFinanciero.tipo === "SUSPENDED" && (
          <span className="flex items-center gap-1 text-xs font-medium text-red-400 bg-red-900/40 px-2 py-1 rounded-full">
            ⚠ Pagar para reactivar
          </span>
        )}
        {estadoFinanciero.tipo === "GRACE_PERIOD" && (
          <span className="flex items-center gap-1 text-xs font-medium text-amber-400 bg-amber-900/40 px-2 py-1 rounded-full">
            ○ Pago pendiente
          </span>
        )}
        {estadoFinanciero.tipo === "PAYMENT_IN_REVIEW" && (
          <span className="flex items-center gap-1 text-xs font-medium text-blue-400 bg-blue-900/40 px-2 py-1 rounded-full">
            🔄 Verificando pago
          </span>
        )}
        {tieneAlerta && (
          <span className="flex items-center gap-1 text-xs font-medium text-yellow-400 bg-yellow-900/40 px-2 py-1 rounded-full">
            🔧 Mantenimiento
          </span>
        )}
      </div>
    </Link>
  );
}

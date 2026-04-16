import Link from "next/link";

const ESTADO_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  ACTIVA: { bg: "bg-green-900/40", text: "text-green-400", label: "Activa" },
  SUSPENDIDA_PAGO: { bg: "bg-red-900/40", text: "text-red-400", label: "Suspendida" },
  EN_MANTENIMIENTO: { bg: "bg-yellow-900/40", text: "text-yellow-400", label: "En mantenimiento" },
  BAJA_DEFINITIVA: { bg: "bg-slate-700", text: "text-slate-400", label: "Baja" },
};

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
    pagos: { id: string; estado: string }[];
  };
}

export function CuentaCard({ cuenta }: CuentaCardProps) {
  const badge = ESTADO_BADGE[cuenta.estado] ?? {
    bg: "bg-slate-700",
    text: "text-slate-400",
    label: cuenta.estado,
  };

  const tienePagoVencido = cuenta.pagos.some((p) => p.estado === "VENCIDO");
  const tienePagoPendiente = cuenta.pagos.some((p) => p.estado === "PENDIENTE");
  const tieneAlerta = cuenta.sensores.length > 0;

  return (
    <Link
      href={`/portal/cuentas/${cuenta.id}`}
      className="block bg-slate-800 rounded-xl border border-slate-700 p-5 hover:border-orange-500 hover:bg-slate-800/80 transition-all group"
      aria-label={`Ver detalle de ${cuenta.descripcion} — ${badge.label}`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <h2 className="font-semibold text-white text-lg leading-snug group-hover:text-orange-400 transition-colors">
          {cuenta.descripcion}
        </h2>
        <span
          className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${badge.bg} ${badge.text}`}
        >
          {badge.label}
        </span>
      </div>

      <p className="text-sm text-slate-400 mb-4">
        {CATEGORIA_LABELS[cuenta.categoria] ?? cuenta.categoria}
      </p>

      <div className="flex flex-wrap gap-2">
        {tienePagoVencido && (
          <span className="flex items-center gap-1 text-xs font-medium text-red-400 bg-red-900/40 px-2 py-1 rounded-full">
            ⚠ Pago vencido
          </span>
        )}
        {tienePagoPendiente && !tienePagoVencido && (
          <span className="flex items-center gap-1 text-xs font-medium text-amber-400 bg-amber-900/40 px-2 py-1 rounded-full">
            ○ Pago pendiente
          </span>
        )}
        {tieneAlerta && (
          <span className="flex items-center gap-1 text-xs font-medium text-yellow-400 bg-yellow-900/40 px-2 py-1 rounded-full">
            ⚠ Mantenimiento
          </span>
        )}
      </div>
    </Link>
  );
}

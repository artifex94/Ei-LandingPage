export const ESTADO_LABEL: Record<string, string> = {
  NUEVO:                   "Nuevo",
  EN_PROCESO:              "En proceso",
  EN_ESPERA:               "En espera",
  EN_PROCESO_DESDE_ESPERA: "Retomado",
  EN_PROCESO_MULTIPLE:     "Múltiple",
  PROCESADO:               "Procesado",
  PROCESADO_NO_ALERTA:     "No alerta",
  PROCESADO_MODO_PRUEBA:   "Modo prueba",
  PROCESADO_MODO_OFF:      "Modo off",
};

export const ESTADO_COLOR: Record<string, string> = {
  NUEVO:                   "bg-red-500/20 text-red-300",
  EN_PROCESO:              "bg-blue-500/20 text-blue-300",
  EN_ESPERA:               "bg-amber-500/20 text-amber-300",
  EN_PROCESO_DESDE_ESPERA: "bg-blue-500/20 text-blue-300",
  EN_PROCESO_MULTIPLE:     "bg-indigo-500/20 text-indigo-300",
  PROCESADO:               "bg-emerald-500/20 text-emerald-300",
  PROCESADO_NO_ALERTA:     "bg-slate-600 text-slate-400",
  PROCESADO_MODO_PRUEBA:   "bg-slate-600 text-slate-400",
  PROCESADO_MODO_OFF:      "bg-slate-600 text-slate-400",
};

interface EventoEstadoBadgeProps {
  estado: string;
  size?: "sm" | "md";
}

export function EventoEstadoBadge({ estado, size = "sm" }: EventoEstadoBadgeProps) {
  const colorClass = ESTADO_COLOR[estado] ?? "bg-slate-700 text-slate-400";
  const label = ESTADO_LABEL[estado] ?? estado;
  const sizeClass = size === "md"
    ? "text-xs font-semibold px-2.5 py-1 rounded-full"
    : "text-[10px] font-semibold px-2 py-0.5 rounded-full";

  return (
    <span
      className={`inline-block ${sizeClass} ${colorClass}`}
      aria-label={`Estado: ${label}`}
    >
      {label}
    </span>
  );
}

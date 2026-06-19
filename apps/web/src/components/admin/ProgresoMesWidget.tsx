const MESES = [
  "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

interface Props {
  pagado: number;
  total: number;
  cobradoArs: number;
  mes: number;
}

function formatArs(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n}`;
}

function barColor(pct: number): string {
  if (pct === 100) return "rgb(34 197 94)";   // green-500
  if (pct >= 75)  return "rgb(16 185 129)";   // emerald-500
  if (pct >= 50)  return "rgb(234 179 8)";    // yellow-500
  return "rgb(249 115 22)";                   // orange-500
}

export function ProgresoMesWidget({ pagado, total, cobradoArs, mes }: Props) {
  const pct = total > 0 ? Math.min(100, Math.round((pagado / total) * 100)) : 0;
  const completo = pct === 100;

  return (
    <div
      className={`rounded-xl border px-5 py-4 ${
        completo
          ? "border-emerald-700/50 bg-emerald-950/20"
          : "border-slate-700 bg-slate-800"
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="text-sm font-semibold text-white">
            Cobros — {MESES[mes]}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {pagado} de {total} cuentas al día ·{" "}
            <span className="text-emerald-400 font-medium">
              {formatArs(cobradoArs)} cobrado
            </span>
          </p>
        </div>

        {completo ? (
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-900/60 border border-emerald-700/50 px-3 py-1 text-xs font-bold text-emerald-300 shrink-0">
            <span aria-hidden="true">✓</span> Mes al día
          </span>
        ) : (
          <span className="text-2xl font-bold text-white shrink-0">{pct}%</span>
        )}
      </div>

      <div
        className="h-2.5 w-full rounded-full bg-slate-700 overflow-hidden"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progreso de cobros: ${pct}%`}
      >
        <div
          className="h-full rounded-full admin-progreso-barra"
          style={
            {
              "--target-width": `${pct}%`,
              backgroundColor: barColor(pct),
            } as React.CSSProperties
          }
        />
      </div>

      {completo && (
        <p className="mt-2 text-xs text-emerald-400 font-medium">
          ¡Excelente! Todos los pagos del mes registrados.
        </p>
      )}
    </div>
  );
}

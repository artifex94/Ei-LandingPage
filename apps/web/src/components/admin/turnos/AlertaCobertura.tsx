const FRANJA_LABEL: Record<string, string> = {
  MANANA: "Mañana (06–14)",
  TARDE:  "Tarde (14–22)",
  NOCHE:  "Noche (22–06)",
};

export function AlertaCobertura({
  huecos,
}: {
  huecos: { fecha: Date; franja: string }[];
}) {
  return (
    <div
      role="alert"
      aria-live="polite"
      className="flex items-start gap-3 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3"
    >
      <span className="mt-0.5 text-red-400 text-lg" aria-hidden="true">⚠</span>
      <div>
        <p className="text-sm font-semibold text-red-300">
          {huecos.length} franja{huecos.length !== 1 ? "s" : ""} sin cobertura esta semana
        </p>
        <ul className="mt-1 space-y-0.5">
          {huecos.slice(0, 5).map((h, i) => (
            <li key={i} className="text-xs text-red-300/80">
              {h.fecha.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" })}
              {" — "}
              {FRANJA_LABEL[h.franja] ?? h.franja}
            </li>
          ))}
          {huecos.length > 5 && (
            <li className="text-xs text-red-400">
              …y {huecos.length - 5} más
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

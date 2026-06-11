import { normalizarRangos, type Rango } from "@/lib/disponibilidad-utils";

const MIN_DIA = 6 * 60;   // 06:00
const MAX_DIA = 22 * 60;  // 22:00
const RANGO_TOTAL = MAX_DIA - MIN_DIA;

const MARCAS = ["06", "10", "14", "18", "22"];

function horaAMin(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Visualización de solo lectura de las franjas de disponibilidad del día
 * sobre la línea 06:00→22:00. Feedback inmediato de lo configurado;
 * la edición ocurre con los presets y franjas, no acá.
 */
export function BarraDisponibilidad({ rangos }: { rangos: Rango[] }) {
  const norm = normalizarRangos(rangos);

  return (
    <div aria-hidden="true">
      <div className="relative h-2 rounded-full bg-industrial-900 border border-industrial-700/60 overflow-hidden">
        {norm.map((r) => {
          const desde = horaAMin(r.desde);
          const hasta = horaAMin(r.hasta);
          const left = ((desde - MIN_DIA) / RANGO_TOTAL) * 100;
          const width = ((hasta - desde) / RANGO_TOTAL) * 100;
          return (
            <span
              key={`${r.desde}-${r.hasta}`}
              className="absolute top-0 bottom-0 bg-emerald-500/80"
              style={{ left: `${left}%`, width: `${width}%` }}
            />
          );
        })}
      </div>
      <div className="flex justify-between mt-1">
        {MARCAS.map((m) => (
          <span key={m} className="text-[10px] font-mono text-slate-500 tabular-nums">
            {m}
          </span>
        ))}
      </div>
    </div>
  );
}

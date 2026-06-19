import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import {
  ESTADO_PARADA_LABEL,
  ESTADO_PARADA_VARIANT,
  TIPO_OT_LABEL,
  PRIORIDAD_BORDE,
} from "./parada-ui";
import type { Parada } from "./paradas";

/** Item de la cronología de paradas del run sheet. */
export function ParadaCard({ parada }: { parada: Parada }) {
  return (
    <Link
      href={parada.href}
      className={`
        block rounded-lg border border-industrial-700 border-l-4 px-4 py-3
        bg-industrial-800/60 hover:bg-industrial-800 transition-colors
        ${PRIORIDAD_BORDE[parada.prioridad] ?? "border-l-slate-600"}
        ${parada.completada ? "opacity-50" : ""}
        ${parada.activa ? "ring-1 ring-tactical-500/40" : ""}
      `}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-mono font-bold tabular-nums text-slate-300 flex-shrink-0">
              {parada.hora ?? "—:—"}
            </span>
            {parada.tipoOT && (
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 flex-shrink-0">
                {TIPO_OT_LABEL[parada.tipoOT] ?? parada.tipoOT}
              </span>
            )}
            <span className="text-sm font-semibold text-white truncate">
              {parada.titulo}
            </span>
          </div>
          {parada.direccion && (
            <p className="text-xs text-slate-400 mt-0.5 truncate">{parada.direccion}</p>
          )}
        </div>
        <Badge
          variant={ESTADO_PARADA_VARIANT[parada.estado] ?? "neutral"}
          className="flex-shrink-0"
        >
          {ESTADO_PARADA_LABEL[parada.estado] ?? parada.estado}
        </Badge>
      </div>
    </Link>
  );
}

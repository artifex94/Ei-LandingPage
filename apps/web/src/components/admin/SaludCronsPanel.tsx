import { Badge } from "@/components/ui/Badge";
import { DataTable, type Column } from "@/components/ui/DataTable";
import type { SaludCron, CorridaCronReciente } from "@/lib/cron-salud";
import type { BadgeVariant } from "@/components/ui/Badge";

const BADGE_VARIANT: Record<SaludCron["salud"], BadgeVariant> = {
  ok: "success",
  atrasado: "warning",
  error: "danger",
  sin_datos: "neutral",
};

function badgeLabel(c: SaludCron): string {
  if (c.salud === "ok" && c.ultima) return `OK ${tiempoRelativo(c.ultima.started_at)}`;
  if (c.salud === "atrasado") return "Atrasado";
  if (c.salud === "error") return "Error";
  return "Sin datos";
}

function tiempoRelativo(fecha: Date): string {
  const diff = Date.now() - fecha.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "hace instantes";
  if (min < 60) return `hace ${min} min`;
  const hs = Math.floor(min / 60);
  if (hs < 24) return `hace ${hs}h`;
  const dias = Math.floor(hs / 24);
  return `hace ${dias} día${dias !== 1 ? "s" : ""}`;
}

function truncar(texto: string | null, max = 60): string {
  if (!texto) return "—";
  return texto.length > max ? `${texto.slice(0, max)}…` : texto;
}

interface SaludCronsPanelProps {
  crons: SaludCron[];
  corridas: CorridaCronReciente[];
}

/**
 * Panel "Salud de crons" — Fase 5 del plan maestro (administradores). Sin
 * esto, un cron caído (ej. sync SoftGuard muerto cada 5 min) era invisible
 * hasta que reclamaba un cliente.
 */
export function SaludCronsPanel({ crons, corridas }: SaludCronsPanelProps) {
  const columns: Column<CorridaCronReciente>[] = [
    { id: "cron", header: "Cron", cell: (r) => <span className="font-mono text-xs">{r.cron}</span> },
    {
      id: "estado",
      header: "Estado",
      cell: (r) => (
        <Badge variant={r.estado === "OK" ? "success" : "danger"}>{r.estado}</Badge>
      ),
    },
    {
      id: "inicio",
      header: "Inicio",
      cell: (r) => (
        <span className="text-xs text-slate-400">
          {r.started_at.toLocaleString("es-AR", { timeZone: "UTC", dateStyle: "short", timeStyle: "short" })}
        </span>
      ),
    },
    {
      id: "duracion",
      header: "Duración",
      align: "right",
      cell: (r) => (
        <span className="text-xs text-slate-400 tabular-nums">
          {r.duracion_ms != null ? `${(r.duracion_ms / 1000).toFixed(1)}s` : "—"}
        </span>
      ),
    },
    {
      id: "resumen",
      header: "Resumen",
      cell: (r) => <span className="text-xs text-slate-500">{truncar(r.resumen)}</span>,
    },
  ];

  return (
    <section aria-labelledby="salud-crons-heading" className="rounded-lg border border-slate-700 bg-slate-800 p-5 space-y-4">
      <h2 id="salud-crons-heading" className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
        Salud de crons
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {crons.map((c) => (
          <div key={c.nombre} className="rounded-lg border border-slate-700/60 bg-slate-900/50 px-3 py-2.5">
            <p className="text-xs font-semibold text-slate-200">{c.label}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">{c.frecuenciaLabel}</p>
            <div className="mt-2">
              <Badge variant={BADGE_VARIANT[c.salud]}>{badgeLabel(c)}</Badge>
            </div>
          </div>
        ))}
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-2">
          Últimas corridas
        </p>
        <DataTable
          columns={columns}
          rows={corridas}
          keyExtractor={(r) => r.id}
          caption="Últimas corridas de crons"
          emptyState={<p className="text-xs text-slate-600 py-4">Todavía no hay corridas registradas.</p>}
        />
      </div>
    </section>
  );
}

export default SaludCronsPanel;

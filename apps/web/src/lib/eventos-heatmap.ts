import { clasificarCodigo, PRIORIDAD, type TipoDia } from "@/lib/eventos-clasificacion";

// Estructuralmente idéntico al `DiaEvento` de `@/lib/actions/eventos` — ese
// archivo es "use server" y no puede re-exportar tipos (ver nota ahí), así que
// el interface se declara acá también en vez de importarse.
export interface DiaEvento {
  fecha: string; // YYYY-MM-DD
  total: number;
  tipo: TipoDia;
}

/**
 * Composición pura del heatmap anual: agrega eventos por día quedándose con
 * el tipo de mayor prioridad. Extraída de `getEventosHeatmap` para poder
 * componer varios heatmaps a partir de UNA sola query por perfil (particionada
 * por cuenta en JS) en vez de una query por cuenta.
 */
export function componerHeatmap(
  rows: Array<{ fecha_evento: Date; codigo: string }>,
): DiaEvento[] {
  const byDia = new Map<string, { total: number; tipo: TipoDia }>();

  for (const ev of rows) {
    const fecha = ev.fecha_evento.toISOString().slice(0, 10);
    const tipoEv = clasificarCodigo(ev.codigo);
    const existing = byDia.get(fecha);

    if (!existing) {
      byDia.set(fecha, { total: 1, tipo: tipoEv });
    } else {
      existing.total += 1;
      if (PRIORIDAD[tipoEv] > PRIORIDAD[existing.tipo]) {
        existing.tipo = tipoEv;
      }
    }
  }

  return Array.from(byDia.entries())
    .map(([fecha, { total, tipo }]) => ({ fecha, total, tipo }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

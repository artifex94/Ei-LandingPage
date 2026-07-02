/**
 * Métricas de atención de eventos de monitoreo — Fase 7a del plan maestro.
 *
 * Puro, sin Prisma: el caller (server component de /monitoreo) trae los
 * eventos del día y esta función solo agrega. Los timestamps de gestión
 * (`tomado_en`/`resuelto_en`) son nuevos y pueden venir `null` en eventos
 * viejos (pre-migración) o en eventos que todavía no se tomaron/resolvieron
 * — las medias se calculan solo sobre los eventos que sí tienen el dato.
 */

export interface EventoMetrica {
  estado: string;
  fecha_evento: Date;
  tomado_en: Date | null;
  resuelto_en: Date | null;
}

export interface MetricasDia {
  atendidos: number;
  pendientes: number;
  tiempoMedioTomaMs: number | null;
  tiempoMedioResolucionMs: number | null;
}

const ESTADOS_ATENDIDOS = new Set<string>([
  "PROCESADO",
  "PROCESADO_NO_ALERTA",
  "PROCESADO_MODO_PRUEBA",
  "PROCESADO_MODO_OFF",
]);

/**
 * Agrega métricas del día a partir de los eventos ya filtrados por fecha por
 * el caller: cuántos quedaron atendidos (cerrados) vs. pendientes, y el
 * tiempo medio de toma (fecha_evento → tomado_en) y de resolución
 * (tomado_en → resuelto_en). `null` cuando no hay ningún evento con ambos
 * timestamps para esa media (no confundir con 0).
 */
export function calcularMetricasDia(eventos: EventoMetrica[]): MetricasDia {
  let atendidos = 0;
  let sumaToma = 0;
  let cuentaToma = 0;
  let sumaResolucion = 0;
  let cuentaResolucion = 0;

  for (const ev of eventos) {
    if (ESTADOS_ATENDIDOS.has(ev.estado)) atendidos += 1;

    if (ev.tomado_en) {
      sumaToma += ev.tomado_en.getTime() - ev.fecha_evento.getTime();
      cuentaToma += 1;
    }

    if (ev.tomado_en && ev.resuelto_en) {
      sumaResolucion += ev.resuelto_en.getTime() - ev.tomado_en.getTime();
      cuentaResolucion += 1;
    }
  }

  return {
    atendidos,
    pendientes: eventos.length - atendidos,
    tiempoMedioTomaMs: cuentaToma > 0 ? sumaToma / cuentaToma : null,
    tiempoMedioResolucionMs: cuentaResolucion > 0 ? sumaResolucion / cuentaResolucion : null,
  };
}

/**
 * Formatea una duración en milisegundos a texto compacto: "45s", "4m",
 * "1h 20m". Redondea al minuto una vez que supera el minuto (no interesa el
 * segundo exacto para tiempos de atención). `null`/negativo → "—".
 */
export function formatDuracion(ms: number | null): string {
  if (ms === null || ms < 0) return "—";

  const segundos = Math.round(ms / 1000);
  if (segundos < 60) return `${segundos}s`;

  const minutos = Math.round(segundos / 60);
  if (minutos < 60) return `${minutos}m`;

  const horas = Math.floor(minutos / 60);
  const minutosRestantes = minutos % 60;
  return minutosRestantes > 0 ? `${horas}h ${minutosRestantes}m` : `${horas}h`;
}

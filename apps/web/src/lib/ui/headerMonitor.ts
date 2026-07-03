// Configuración y matemática pura del monitor CCTV del navbar (HeaderMonitor):
// una pantallita que muestra un espejo DOM de la página centrado en el mouse.

export const MONITOR = {
  /** Tamaño de la pantalla del monitor (px CSS). */
  SCREEN_W: 76,
  SCREEN_H: 44,
  /** Escala del clon de la página dentro de la pantalla. */
  SCALE: 0.4,
  /** Constante de tiempo del suavizado exponencial del paneo (ms). */
  TAU_MS: 140,
  /** Corte del loop rAF: delta menor a esto se considera convergido (px). */
  EPSILON: 0.5,
  /** El clon se reconstruye en idle cada tanto ("delay de señal"). */
  REBUILD_MS: 20_000,
} as const;

/**
 * Transform del clon (transform-origin 0 0) para que el punto de la página
 * (pageX, pageY) — coordenadas de documento, no de viewport — quede exactamente
 * en el centro de la pantalla del monitor.
 */
export function calcularTransformMonitor(
  pageX: number,
  pageY: number
): { tx: number; ty: number } {
  return {
    tx: MONITOR.SCREEN_W / 2 - MONITOR.SCALE * pageX,
    ty: MONITOR.SCREEN_H / 2 - MONITOR.SCALE * pageY,
  };
}

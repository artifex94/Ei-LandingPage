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
  /**
   * Desvío máximo del cursor dibujado respecto del centro (px). El cursor se
   * adelanta al paneo exactamente en el error de seguimiento (cur − target):
   * el mouse "se mueve primero" y la cámara lo alcanza. El clamp evita que un
   * movimiento brusco lo saque de la pantallita.
   */
  CURSOR_DESVIO_MAX: { x: 14, y: 9 },
} as const;

/**
 * Posición del cursor dibujado, relativa al centro de la pantalla: el error
 * de seguimiento del paneo (cur − target), acotado. Es la proyección exacta
 * del mouse real sobre el feed: s_mouse = centro + (cur − target).
 */
export function calcularDesvioCursor(
  curX: number,
  curY: number,
  tgtX: number,
  tgtY: number
): { dx: number; dy: number } {
  const { x: maxX, y: maxY } = MONITOR.CURSOR_DESVIO_MAX;
  return {
    dx: Math.max(-maxX, Math.min(maxX, curX - tgtX)),
    dy: Math.max(-maxY, Math.min(maxY, curY - tgtY)),
  };
}

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

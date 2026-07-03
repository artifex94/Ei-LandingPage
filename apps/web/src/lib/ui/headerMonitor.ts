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
  /**
   * Franja superior del viewport (px) donde el mouse "se escapa por arriba"
   * del campo visual de la cámara: cubre las dos alturas del navbar (96 al
   * tope, 80 scrolleado) y evita el efecto túnel al posar el mouse sobre la
   * propia pantallita.
   */
  ESCAPE_Y: 96,
  /** Período del barrido de búsqueda (ida y vuelta completa, ms). */
  BUSQUEDA_PERIODO_MS: 11_000,
  /** Amplitud del barrido como fracción del ancho del viewport. */
  BUSQUEDA_AMPLITUD: 0.4,
} as const;

/**
 * Evento con el que el monitor anuncia entrar/salir del modo búsqueda
 * (detail: { activa, inicio }). La cámara del header lo escucha para
 * acompañar el barrido con su giro, en fase (mismo seno, mismo reloj).
 */
export const EVENTO_BUSQUEDA = "ei-vigilancia-busqueda";

/**
 * Punto de mira del barrido de búsqueda, en coordenadas de viewport: oscila
 * de lado a lado del ancho visible, en la banda vertical media.
 */
export function calcularPuntoBusquedaViewport(
  tMs: number,
  anchoViewport: number,
  altoViewport: number
): { x: number; y: number } {
  const fase = (2 * Math.PI * tMs) / MONITOR.BUSQUEDA_PERIODO_MS;
  return {
    x: anchoViewport * (0.5 + MONITOR.BUSQUEDA_AMPLITUD * Math.sin(fase)),
    y: altoViewport / 2,
  };
}

/**
 * Target del paneo del feed en modo búsqueda: el punto de mira del barrido
 * llevado a coordenadas de documento.
 */
export function calcularBarridoBusqueda(
  tMs: number,
  anchoViewport: number,
  altoViewport: number,
  scrollX: number,
  scrollY: number
): { tx: number; ty: number } {
  const p = calcularPuntoBusquedaViewport(tMs, anchoViewport, altoViewport);
  return calcularTransformMonitor(scrollX + p.x, scrollY + p.y);
}

export type TipoCursor = "default" | "pointer" | "text";

const TAGS_DE_TEXTO = new Set([
  "P", "SPAN", "H1", "H2", "H3", "H4", "H5", "H6", "LI", "DD", "DT",
  "BLOCKQUOTE", "FIGCAPTION", "LABEL", "TD", "TH", "EM", "STRONG", "B", "I",
]);

/**
 * Clasifica la forma que el cursor real tendría sobre un elemento, para que
 * el cursor dibujado en el monitor la espeje: manito sobre interactivos,
 * I-beam sobre texto (cursor:auto sobre tags de texto seleccionable, la
 * heurística del navegador), flecha para el resto.
 */
export function clasificarCursor(
  cursorCss: string,
  tagName: string,
  enCampoDeTexto: boolean
): TipoCursor {
  if (cursorCss === "pointer") return "pointer";
  if (cursorCss === "text" || cursorCss === "vertical-text") return "text";
  if (cursorCss === "auto" && (enCampoDeTexto || TAGS_DE_TEXTO.has(tagName))) return "text";
  return "default";
}

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

// Calibración de la cámara decorativa del header (HeaderCamera).
// Los valores de geometría salen de las fuentes SVG en
// public/images/cctv-layers/ (v2 retro): el cuerpo está dibujado horizontal y
// rotado 30° alrededor del lug en (409.6, 307.2) de un canvas de 1024; la
// punta del barril del lente queda en (831.6, 583.0). Si se regeneran los
// assets, recalibrar acá.

export const CAM = {
  /** Lado del box renderizado en pantalla (el canvas es cuadrado). */
  RENDER_W: 96,
  /** Centro del lug/bisagra, en fracción del canvas. Eje de rotación del cuerpo. */
  PIVOT: { x: 0.4, y: 0.3 },
  /** Punta del barril del lente, en fracción del canvas (ancla del LED/flash). */
  LENS_FRONT: { x: 0.8121, y: 0.5693 },
  /** Inclinación dibujada del cuerpo en el asset (grados, 0° = derecha, + horario). */
  A0: 30,
  /** Clamp del ángulo de mira hacia el cursor (grados en pantalla). */
  AIM_MIN: 8,
  AIM_MAX: 66,
  /** Ángulo de reposo/idle (grados en pantalla). */
  REST_AIM: 35,
  /**
   * Constante de tiempo del suavizado exponencial (ms). El factor por frame
   * es 1 - exp(-dt/TAU): independiente del frame rate (a 60fps equivale a
   * ~0.11 por frame; a 15fps converge en el mismo tiempo de reloj).
   */
  TAU_MS: 140,
  /** Corte del loop rAF: delta menor a esto se considera convergido (grados). */
  EPSILON: 0.05,
  /** Sin movimiento de mouse durante este tiempo → vuelve al reposo. */
  IDLE_MS: 4000,
  /** Offset horizontal del ancla (la clase left-3 del root). */
  LEFT_PX: 12,
  /**
   * Umbral de scroll en el que el Navbar muestra su línea dura inferior
   * (Navbar.tsx usa scrollY > 24): por debajo, la cámara se sujeta de la
   * pared izquierda de la ventana; por encima, cuelga de esa línea.
   */
  SCROLL_UMBRAL: 24,
  /** Duración del re-asiento pared ↔ techo. */
  SEAT_MS: 450,
} as const;

/** Rotación CSS en reposo (la que trae el SSR). */
export const CAM_REST_DEG = CAM.REST_AIM - CAM.A0;

/**
 * Corrimiento horizontal en modo pared: rota el soporte -90° alrededor de la
 * bisagra y este shift deja la placa exactamente al ras del borde izquierdo
 * de la ventana (la placa está al ras del borde superior del canvas, a
 * RENDER_W·PIVOT.y de la bisagra).
 */
export const CAM_WALL_SHIFT_X =
  CAM.RENDER_W * CAM.PIVOT.y - CAM.LEFT_PX - CAM.RENDER_W * CAM.PIVOT.x;

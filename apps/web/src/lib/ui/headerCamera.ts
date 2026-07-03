// Calibración de la cámara decorativa del header (HeaderCamera).
// Los valores de geometría salen de las fuentes SVG en
// public/images/cctv-layers/: el cuerpo está dibujado horizontal y rotado 30°
// alrededor de la rótula en (409.6, 307.2) de un canvas de 1024; el centro del
// lente queda en (842.6, 557.2). Si se regeneran los assets, recalibrar acá.

export const CAM = {
  /** Lado del box renderizado en pantalla (el canvas es cuadrado). */
  RENDER_W: 80,
  /** Centro de la rótula, en fracción del canvas. Eje de rotación del cuerpo. */
  PIVOT: { x: 0.4, y: 0.3 },
  /** Centro del lente frontal, en fracción del canvas (ancla del LED/flash). */
  LENS_FRONT: { x: 0.8228, y: 0.5441 },
  /** Inclinación dibujada del cuerpo en el asset (grados, 0° = derecha, + horario). */
  A0: 30,
  /** Clamp del ángulo de mira hacia el cursor (grados en pantalla). */
  AIM_MIN: 8,
  AIM_MAX: 66,
  /** Ángulo de reposo/idle (grados en pantalla). */
  REST_AIM: 35,
  /** Factor de interpolación por frame del seguimiento. */
  LERP: 0.1,
  /** Corte del loop rAF: delta menor a esto se considera convergido (grados). */
  EPSILON: 0.05,
  /** Sin movimiento de mouse durante este tiempo → vuelve al reposo. */
  IDLE_MS: 4000,
  /** Duración del flash de captura al click. */
  FLASH_MS: 320,
} as const;

/** Rotación CSS en reposo (la que trae el SSR). */
export const CAM_REST_DEG = CAM.REST_AIM - CAM.A0;

/**
 * Detección de fallos sostenidos del panel (Fase 3: detección → acción).
 *
 * La proyección sg_* MUESTRA que un panel está en fallo; esta lógica decide
 * cuándo eso se convierte en TRABAJO: un fallo de test periódico (TST) o de
 * alimentación (AC) sostenido más allá del umbral genera una
 * SolicitudMantenimiento automática que entra al flujo existente
 * (bandeja → asignación → OT → técnico).
 *
 * Funciones puras, sin IO: el sync (sync.ts) las alimenta y persiste.
 * - TST: la central informa `sta_tEnFalloDeTSTDesde` → el "desde" es de ella.
 * - AC:  la central solo da el booleano actual → el "desde" se deriva acá y
 *   se persiste en `Cuenta.sg_fallo_ac_desde`.
 */

export const UMBRAL_FALLO_HORAS_DEFAULT = 24;

/** Prefijo de las solicitudes generadas por el sync — sirve de dedupe y es visible en la bandeja. */
export const AUTO_PREFIX = "[AUTO]";

/** Umbral configurable por env (horas de fallo sostenido antes de generar trabajo). */
export function umbralFalloHoras(): number {
  const n = Number(process.env.SOFTGUARD_FALLO_SOSTENIDO_HORAS);
  return Number.isFinite(n) && n > 0 ? n : UMBRAL_FALLO_HORAS_DEFAULT;
}

/**
 * Deriva el inicio del corte de AC comparando con el estado persistido:
 * entra en fallo → ahora; sigue en fallo → conserva el inicio; sale → null.
 * (`prevDesde` puede venir null en cuentas sincronizadas antes de que existiera
 * el campo: en ese caso el reloj arranca en este sync.)
 */
export function derivarFalloAcDesde(
  enFalloAhora: boolean,
  prevEnFallo: boolean | undefined,
  prevDesde: Date | null | undefined,
  ahora: Date,
): Date | null {
  if (!enFalloAhora) return null;
  if (prevEnFallo && prevDesde) return prevDesde;
  return ahora;
}

export interface FalloDetectado {
  tipo: "AC" | "TST";
  desde: Date;
}

/** Fallos del panel que superan el umbral de sostenido en este momento. */
export function evaluarFallosSostenidos(opts: {
  en_fallo_tst: boolean;
  fallo_tst_desde: Date | null;
  en_fallo_ac: boolean;
  fallo_ac_desde: Date | null;
  ahora: Date;
  umbralHoras: number;
}): FalloDetectado[] {
  const umbralMs = opts.umbralHoras * 3_600_000;
  const sostenido = (desde: Date | null): desde is Date =>
    desde !== null && opts.ahora.getTime() - desde.getTime() >= umbralMs;

  const fallos: FalloDetectado[] = [];
  if (opts.en_fallo_ac && sostenido(opts.fallo_ac_desde)) {
    fallos.push({ tipo: "AC", desde: opts.fallo_ac_desde });
  }
  if (opts.en_fallo_tst && sostenido(opts.fallo_tst_desde)) {
    fallos.push({ tipo: "TST", desde: opts.fallo_tst_desde });
  }
  return fallos;
}

const DETALLE_FALLO: Record<FalloDetectado["tipo"], string> = {
  AC: "sin 220v (corte de alimentación)",
  TST: "sin reportar test periódico",
};

function fechaCorta(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Descripción de la solicitud automática, legible en la bandeja del admin. */
export function descripcionSolicitudAuto(
  softguardRef: string,
  fallos: FalloDetectado[],
  umbralHoras: number,
): string {
  const detalle = fallos
    .map((f) => `${DETALLE_FALLO[f.tipo]} desde ${fechaCorta(f.desde)}`)
    .join("; ");
  return `${AUTO_PREFIX} Panel ${softguardRef} con fallo sostenido (>${umbralHoras} h): ${detalle}. Detectado por la sincronización con la central.`;
}

// Validación pura del adjunto (imagen/video) de un ticket de feedback.
// Sin dependencias de FormData/Supabase para que sea testeable de punta a punta.

export const FEEDBACK_IMAGEN_TIPOS_VALIDOS = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
]);

export const FEEDBACK_VIDEO_TIPOS_VALIDOS = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

export const FEEDBACK_IMAGEN_MAX_SIZE = 10 * 1024 * 1024; // 10 MB
// Tope alineado al file size limit del bucket "feedback-adjuntos" en Supabase
// (15 MB, configurado a mano): si se sube este valor, subir también el del bucket.
export const FEEDBACK_VIDEO_MAX_SIZE = 15 * 1024 * 1024; // 15 MB

export interface AdjuntoFeedbackInput {
  mime: string;
  size: number;
}

export type ValidarAdjuntoResultado =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Valida un adjunto opcional de ticket de feedback. Sin archivo es válido
 * (el adjunto no es obligatorio) — devuelve `{ ok: true }`.
 */
export function validarAdjuntoFeedback(
  input: AdjuntoFeedbackInput | null | undefined
): ValidarAdjuntoResultado {
  if (!input) return { ok: true };

  const { mime, size } = input;

  if (FEEDBACK_IMAGEN_TIPOS_VALIDOS.has(mime)) {
    if (size > FEEDBACK_IMAGEN_MAX_SIZE) {
      return { ok: false, error: "La imagen supera el límite de 10 MB." };
    }
    return { ok: true };
  }

  if (FEEDBACK_VIDEO_TIPOS_VALIDOS.has(mime)) {
    if (size > FEEDBACK_VIDEO_MAX_SIZE) {
      return { ok: false, error: "El video supera el límite de 15 MB." };
    }
    return { ok: true };
  }

  return { ok: false, error: `Tipo de archivo no permitido: ${mime}.` };
}

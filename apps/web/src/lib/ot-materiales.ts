// Lógica pura (sin Prisma) del catálogo de materiales de una OT — Fase 9 del
// plan maestro (cierre de OT en campo). Extraída para poder testear cálculo
// de costos, validación de cantidad por unidad y merge de presets de notas
// sin levantar la DB. Usada por `OTCampoClient.tsx` (técnico) y por la vista
// admin de detalle de OT.

export interface MaterialUsadoResumen {
  cantidad: number;
  costo_unitario: number | null;
}

/**
 * Suma cantidad * costo_unitario de cada línea. Las líneas sin costo
 * (`costo_unitario` null — material sin costo de referencia cargado en el
 * catálogo) se tratan como $0 a efectos del total, no rompen la cuenta.
 */
export function calcularCostoTotalMateriales(materiales: MaterialUsadoResumen[]): number {
  return materiales.reduce((acc, m) => acc + m.cantidad * (m.costo_unitario ?? 0), 0);
}

// Unidades que se cortan/miden a medida y por lo tanto admiten decimales
// (2.5 metros de cable). Todo lo demás ("unidad", "juego", etc.) son piezas
// enteras — no tiene sentido "0.5 sensores".
const UNIDADES_CON_DECIMALES = new Set(["metros", "metro", "m"]);

export interface ValidacionCantidad {
  valido: boolean;
  error?: string;
}

/**
 * Valida la cantidad que tipea el técnico según la unidad del material.
 */
export function validarCantidadMaterial(cantidad: number, unidad: string): ValidacionCantidad {
  if (!Number.isFinite(cantidad) || cantidad <= 0) {
    return { valido: false, error: "La cantidad debe ser mayor a cero." };
  }
  const permiteDecimales = UNIDADES_CON_DECIMALES.has(unidad.trim().toLowerCase());
  if (!permiteDecimales && !Number.isInteger(cantidad)) {
    return { valido: false, error: `La cantidad en "${unidad}" no admite decimales.` };
  }
  return { valido: true };
}

/**
 * Appendea un preset de nota ("Cliente ausente", etc.) al textarea de notas
 * del técnico. Un tap repetido del mismo chip no duplica la línea; el
 * textarea sigue siendo editable a mano después de aplicar el preset.
 */
export function aplicarPresetNota(notaActual: string, preset: string): string {
  const actual = notaActual.trim();
  const presetTrim = preset.trim();
  if (!presetTrim) return actual;
  const lineas = actual.split("\n").map((l) => l.trim());
  if (lineas.includes(presetTrim)) return actual;
  return actual ? `${actual}\n${presetTrim}` : presetTrim;
}

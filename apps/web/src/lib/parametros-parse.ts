/**
 * Lógica PURA de `ParametroNegocio`: parseo, catálogo y validación. Sin `server-only`
 * ni imports de Prisma a propósito — así es testeable con vitest sin necesidad de
 * mockear la DB (`server-only` no está resuelto bajo Vite/vitest; ver `parametros.ts`,
 * que sí es server-only y consume este módulo para el acceso a la DB).
 */

export type TipoParametroValor = "INT" | "DECIMAL" | "STRING" | "JSON";

/**
 * Parsea `valor` (siempre String en BD) según `tipo`. Función PURA y testeable:
 * ante un valor corrupto (no parseable para el tipo declarado), devuelve
 * `fallback` en vez de tirar — nunca debe romper al caller.
 */
export function parseParametro<T>(valor: string, tipo: TipoParametroValor, fallback: T): T {
  switch (tipo) {
    case "INT": {
      const n = Number(valor);
      return Number.isInteger(n) ? (n as unknown as T) : fallback;
    }
    case "DECIMAL": {
      const n = Number(valor);
      return Number.isFinite(n) ? (n as unknown as T) : fallback;
    }
    case "STRING":
      return valor as unknown as T;
    case "JSON":
      try {
        return JSON.parse(valor) as T;
      } catch {
        return fallback;
      }
    default:
      return fallback;
  }
}

/**
 * Catálogo de parámetros conocidos por la app: default (= comportamiento actual
 * si nunca se editó) + metadata para la UI de `/admin/configuracion`. Sin seed:
 * la fila en `parametros_negocio` recién se crea al editar por primera vez: hasta
 * entonces la UI y los callers muestran/usan este default.
 */
export const CATALOGO_PARAMETROS = [
  {
    clave: "UMBRAL_MORA",
    tipo: "INT" as const,
    categoria: "cobranza",
    descripcion: "A partir de cuántos períodos impagos se ofrece el aviso de mora (tono más firme).",
    defaultValor: 3,
  },
  {
    clave: "DIAS_GRACIA",
    tipo: "INT" as const,
    categoria: "cobranza",
    descripcion: "Días de atraso desde los que una cuenta pasa a período de gracia.",
    defaultValor: 1,
  },
  {
    clave: "DIAS_SUSPENSION",
    tipo: "INT" as const,
    categoria: "cobranza",
    descripcion: "Días de atraso desde los que una cuenta se considera suspendida por falta de pago.",
    defaultValor: 15,
  },
  {
    clave: "COBERTURA_DIAS_TURNOS",
    tipo: "INT" as const,
    categoria: "turnos",
    descripcion: "Ventana de días hacia adelante que cubre la auto-asignación de turnos del cron.",
    defaultValor: 3,
  },
  {
    clave: "VENTANA_AGRUPACION_MIN",
    tipo: "INT" as const,
    categoria: "monitoreo",
    descripcion:
      "Minutos dentro de los que varios eventos de la misma cuenta, zona y código se colapsan en una sola fila del board de monitoreo (con contador de repeticiones).",
    defaultValor: 10,
  },
] as const;

/**
 * Valida y normaliza el valor ingresado en la UI de `/admin/configuracion` según el
 * `tipo` declarado del parámetro. Función PURA: no toca la DB, la usa la action de
 * escritura (`actualizarParametro`) ANTES de persistir.
 */
export function validarValorParametro(
  valorRaw: string,
  tipo: TipoParametroValor,
): { ok: true; valor: string } | { ok: false; error: string } {
  const valor = valorRaw.trim();
  if (!valor) return { ok: false, error: "El valor no puede estar vacío." };

  switch (tipo) {
    case "INT": {
      const n = Number(valor);
      if (!Number.isInteger(n)) return { ok: false, error: "Debe ser un número entero." };
      return { ok: true, valor: String(n) };
    }
    case "DECIMAL": {
      const n = Number(valor);
      if (!Number.isFinite(n)) return { ok: false, error: "Debe ser un número." };
      return { ok: true, valor: String(n) };
    }
    case "STRING":
      return { ok: true, valor };
    case "JSON":
      try {
        JSON.parse(valor);
        return { ok: true, valor };
      } catch {
        return { ok: false, error: "Debe ser JSON válido." };
      }
    default:
      return { ok: false, error: "Tipo de parámetro desconocido." };
  }
}

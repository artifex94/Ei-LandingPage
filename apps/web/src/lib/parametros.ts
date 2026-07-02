import "server-only";

import { cache } from "react";
import { prisma } from "@/lib/prisma/client";
import { parseParametro } from "./parametros-parse";

export {
  parseParametro,
  validarValorParametro,
  CATALOGO_PARAMETROS,
  type TipoParametroValor,
} from "./parametros-parse";

async function getParamUncached<T>(clave: string, fallback: T): Promise<T> {
  try {
    const row = await prisma.parametroNegocio.findUnique({ where: { clave } });
    if (!row) return fallback;
    return parseParametro(row.valor, row.tipo, fallback);
  } catch {
    // Tabla inexistente (sync manual pendiente), DB caída, etc.: nunca romper
    // al caller — el comportamiento cae al de hoy (= fallback pasado por el caller).
    return fallback;
  }
}

/**
 * Lee un parámetro de negocio por clave; cacheado por request con `React.cache`
 * (varios callers del mismo render piden la misma clave sin pegarle N veces a la DB).
 * Ante fila inexistente, tabla inexistente o cualquier error: devuelve `fallback`.
 */
export const getParam = cache(getParamUncached);

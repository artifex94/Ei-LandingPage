/**
 * Conciliación bancaria — Fase 6 del plan maestro (tesoreros).
 *
 * Hoy las transferencias avisadas por el cliente (`avisarTransferencia`, que
 * deja el Pago en PROCESANDO con `ref_externa` "EI-{12hex}") se buscan a ojo
 * en el homebanking. Este módulo es 100% puro (parseo + matching, sin DB) para
 * poder testearlo sin mocks; la persistencia vive en
 * `src/lib/actions/conciliacion.ts`.
 *
 * Nota sobre el hash: usa `node:crypto` (disponible en Node y en el entorno
 * de test de Vitest) en vez de Web Crypto async, así el parser sigue siendo
 * una función sync sin I/O.
 *
 * Nota sobre colisiones: fecha|importe|descripcion NO es único — dos
 * transferencias legítimas idénticas el mismo día (mismo monto, misma
 * descripción del banco) colisionan. `parsearExtractoCSV` agrega un índice
 * de ocurrencia (0, 1, 2...) al hash de cada fila repetida DENTRO del mismo
 * archivo importado; es estable entre re-imports del mismo extracto porque
 * el banco siempre lista las filas duplicadas en el mismo orden.
 */

import { createHash } from "node:crypto";

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface MovimientoParseado {
  fecha: Date; // solo la parte de fecha (UTC medianoche), matchea @db.Date
  importe: number;
  descripcion: string;
  hash: string;
  fila: number; // número de fila original (1-based, sin contar header) — trazabilidad de errores
}

export interface ParseoExtractoResult {
  movimientos: MovimientoParseado[];
  errores: string[];
}

/** Pago candidato a match — subconjunto mínimo de campos que necesita el matcher. */
export interface PagoCandidato {
  id: string;
  importe: number;
  ref_externa: string | null;
  /**
   * Proxy de "fecha de aviso de transferencia": el modelo Pago no tiene un
   * campo dedicado (avisarTransferencia solo setea estado/metodo/ref_externa),
   * pero al ser @updatedAt, `updated_at` se actualiza en ese mismo momento.
   * Es una aproximación razonable: si el pago se edita después por otro
   * motivo (ej. editarPago cambia el importe), la ventana de ±2 días puede
   * quedar corrida — aceptable para un candidato "confiable" que igual
   * requiere confirmación humana en la UI cuando es ambiguo.
   */
  updated_at: Date;
}

/** Movimiento ya persistido (con id) sobre el que se propone un match. */
export interface MovimientoConciliable {
  id: string;
  fecha: Date;
  importe: number;
  descripcion: string;
}

export type ClasificacionMatch = "confiable" | "ambiguo" | "sin_match";
export type MotivoMatch = "ref_externa" | "ref_externa_importe_distinto" | "importe_unico" | "ninguno";

export interface CandidatoPropuesto {
  pago_id: string;
  importe: number;
}

export interface PropuestaMatch {
  movimiento_id: string;
  clasificacion: ClasificacionMatch;
  /** Único pago propuesto cuando la clasificación es "confiable"; null en los demás casos. */
  pago_id: string | null;
  /** Candidatos disponibles (1 en "confiable", 2+ en "ambiguo", 0 en "sin_match"). */
  candidatos: CandidatoPropuesto[];
  motivo: MotivoMatch;
  /** Texto humano opcional con la razón del caso "ambiguo" (ej. ref coincide pero el importe no). */
  detalle?: string;
}

// ── Hash de idempotencia ─────────────────────────────────────────────────────

export function calcularHashMovimiento(
  fecha: Date,
  importe: number,
  descripcion: string,
  ocurrencia = 0,
): string {
  const fechaIso = fecha.toISOString().slice(0, 10);
  const clave = `${fechaIso}|${importe.toFixed(2)}|${descripcion.trim()}|${ocurrencia}`;
  return createHash("sha256").update(clave).digest("hex");
}

// ── Parseo de CSV ────────────────────────────────────────────────────────────

function detectarSeparador(headerLine: string): "," | ";" {
  const comas = (headerLine.match(/,/g) ?? []).length;
  const puntoYComa = (headerLine.match(/;/g) ?? []).length;
  return puntoYComa > comas ? ";" : ",";
}

function normalizarHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // quita acentos (marcas diacriticas tras NFD)
}

function desentrecomillar(campo: string): string {
  const t = campo.trim();
  if (t.startsWith('"') && t.endsWith('"') && t.length >= 2) {
    return t.slice(1, -1).replace(/""/g, '"').trim();
  }
  return t;
}

/**
 * Split de una fila CSV que respeta campos entrecomillados: un separador
 * dentro de `"..."` NO parte el campo, y `""` escapada dentro de un campo
 * entrecomillado se conserva como una comilla literal. `linea.split(sep)`
 * ingenuo corrompía extractos con descripciones como `"Pago, ref. ""ABC"""`
 * (columnas corridas → montos/fechas mal asignados en silencio).
 */
function splitFila(linea: string, sep: "," | ";"): string[] {
  const campos: string[] = [];
  let actual = "";
  let dentroComillas = false;

  for (let i = 0; i < linea.length; i++) {
    const c = linea[i];
    if (c === '"') {
      if (dentroComillas && linea[i + 1] === '"') {
        // Comilla escapada ("") dentro de un campo entrecomillado: se
        // conserva tal cual y desentrecomillar() no vuelve a tocarla.
        actual += '""';
        i++;
      } else {
        dentroComillas = !dentroComillas;
        actual += c;
      }
    } else if (c === sep && !dentroComillas) {
      campos.push(actual);
      actual = "";
    } else {
      actual += c;
    }
  }
  campos.push(actual);

  return campos.map(desentrecomillar);
}

interface ColumnasDetectadas {
  fecha: number;
  importe: number;
  descripcion: number;
}

function detectarColumnas(headers: string[]): ColumnasDetectadas | null {
  const norm = headers.map(normalizarHeader);

  const idxFecha = norm.findIndex((h) => h.includes("fecha"));

  // Preferí una columna de "crédito" explícita (descarta "débito") — típico en
  // extractos de homebanking AR con columnas Débito/Crédito separadas. Si no
  // existe, buscá "importe" o "monto" genérico.
  let idxImporte = norm.findIndex((h) => h.includes("credito") && !h.includes("debito"));
  if (idxImporte === -1) {
    idxImporte = norm.findIndex((h) => h.includes("importe") || h.includes("monto"));
  }

  const idxDescripcion = norm.findIndex(
    (h) => h.includes("descripcion") || h.includes("concepto") || h.includes("detalle") || h.includes("leyenda"),
  );

  if (idxFecha === -1 || idxImporte === -1 || idxDescripcion === -1) return null;
  return { fecha: idxFecha, importe: idxImporte, descripcion: idxDescripcion };
}

/** dd/mm/yyyy, dd-mm-yyyy o yyyy-mm-dd → Date UTC (solo fecha, sin hora). */
function parsearFecha(raw: string): Date | null {
  const t = raw.trim();

  const isoMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return construirFechaUTC(Number(y), Number(m), Number(d));
  }

  const arMatch = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(t);
  if (arMatch) {
    const [, d, m, y] = arMatch;
    return construirFechaUTC(Number(y), Number(m), Number(d));
  }

  return null;
}

function construirFechaUTC(anio: number, mes: number, dia: number): Date | null {
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  // Rechaza fechas "desbordadas" (ej. 31/02) que Date normaliza silenciosamente.
  if (fecha.getUTCFullYear() !== anio || fecha.getUTCMonth() !== mes - 1 || fecha.getUTCDate() !== dia) {
    return null;
  }
  return fecha;
}

/**
 * Importe en formato AR ("15.000,50", "-500,00") o genérico con punto decimal
 * ("15000.50"). Devuelve `null` si no se puede interpretar.
 */
function parsearImporte(raw: string): number | null {
  let t = raw.trim().replace(/[$\s]/g, "");
  if (t === "") return null;

  // Paréntesis = negativo (convención contable), ej. "(500,00)".
  let negativo = false;
  if (t.startsWith("(") && t.endsWith(")")) {
    negativo = true;
    t = t.slice(1, -1);
  }

  const tieneComa = t.includes(",");
  const tienePunto = t.includes(".");

  let normalizado: string;
  if (tieneComa && tienePunto) {
    // El separador decimal es el que aparece más a la derecha; el otro es de miles.
    const ultimaComa = t.lastIndexOf(",");
    const ultimoPunto = t.lastIndexOf(".");
    if (ultimaComa > ultimoPunto) {
      normalizado = t.replace(/\./g, "").replace(",", ".");
    } else {
      normalizado = t.replace(/,/g, "");
    }
  } else if (tieneComa) {
    normalizado = t.replace(",", ".");
  } else if (tienePunto) {
    // Un solo punto: si deja exactamente 2 decimales, es separador decimal;
    // si no, se interpreta como separador de miles (ej. "1.234" = 1234).
    const partes = t.split(".");
    if (partes.length === 2 && partes[1].length === 2) {
      normalizado = t;
    } else {
      normalizado = t.replace(/\./g, "");
    }
  } else {
    normalizado = t;
  }

  const n = Number(normalizado);
  if (!Number.isFinite(n)) return null;
  return negativo ? -n : n;
}

/**
 * Parsea un CSV genérico de homebanking argentino. Filtra débitos (importe
 * ≤ 0) sin generar error — solo créditos entran a conciliación. Filas
 * malformadas se reportan en `errores` sin abortar el resto del archivo.
 */
export function parsearExtractoCSV(texto: string): ParseoExtractoResult {
  const lineas = texto
    .split(/\r\n|\n|\r/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lineas.length === 0) {
    return { movimientos: [], errores: ["El archivo está vacío."] };
  }

  const sep = detectarSeparador(lineas[0]);
  const headers = splitFila(lineas[0], sep);
  const columnas = detectarColumnas(headers);

  if (!columnas) {
    return {
      movimientos: [],
      errores: ["No se pudieron detectar las columnas de fecha/importe/descripción en el encabezado."],
    };
  }

  const movimientos: MovimientoParseado[] = [];
  const errores: string[] = [];
  // Cuenta ocurrencias de (fecha|importe|descripcion) DENTRO de este archivo
  // para desambiguar el hash de filas idénticas (ver nota de colisión arriba
  // del archivo) — estable entre re-imports porque el orden de filas no cambia.
  const ocurrencias = new Map<string, number>();

  for (let i = 1; i < lineas.length; i++) {
    const fila = i + 1; // 1-based incluyendo header, para que coincida con lo que ve el usuario en una planilla
    const campos = splitFila(lineas[i], sep);

    const maxIdx = Math.max(columnas.fecha, columnas.importe, columnas.descripcion);
    if (campos.length <= maxIdx) {
      errores.push(`Fila ${fila}: columnas insuficientes.`);
      continue;
    }

    const fecha = parsearFecha(campos[columnas.fecha]);
    if (!fecha) {
      errores.push(`Fila ${fila}: fecha inválida ("${campos[columnas.fecha]}").`);
      continue;
    }

    const importeRaw = campos[columnas.importe].trim();
    // Extractos con columnas Débito/Crédito separadas dejan vacía la columna
    // no usada en cada fila (no "0") — vacío en la columna de crédito es un
    // débito silencioso, no una fila rota.
    if (importeRaw === "") continue;

    const importe = parsearImporte(importeRaw);
    if (importe === null) {
      errores.push(`Fila ${fila}: importe inválido ("${campos[columnas.importe]}").`);
      continue;
    }

    if (importe <= 0) continue; // débito — no entra a conciliación

    const descripcion = campos[columnas.descripcion].trim();
    if (!descripcion) {
      errores.push(`Fila ${fila}: descripción vacía.`);
      continue;
    }

    const claveOcurrencia = `${fecha.toISOString().slice(0, 10)}|${importe.toFixed(2)}|${descripcion}`;
    const ocurrencia = ocurrencias.get(claveOcurrencia) ?? 0;
    ocurrencias.set(claveOcurrencia, ocurrencia + 1);

    movimientos.push({
      fecha,
      importe,
      descripcion,
      hash: calcularHashMovimiento(fecha, importe, descripcion, ocurrencia),
      fila,
    });
  }

  return { movimientos, errores };
}

// ── Matching ─────────────────────────────────────────────────────────────────

const REF_EXTERNA_RE = /EI-[0-9A-F]{12}/i;
const MS_POR_DIA = 24 * 60 * 60 * 1000;
const VENTANA_DIAS = 2;

function diferenciaEnDias(a: Date, b: Date): number {
  return Math.abs(a.getTime() - b.getTime()) / MS_POR_DIA;
}

/**
 * Propone un match por movimiento contra la lista de pagos pendientes
 * (PROCESANDO/PENDIENTE, ya filtrados por el caller). Prioridad:
 *   1. La descripción contiene la ref_externa de un pago Y el importe coincide
 *      → "confiable" (ref_externa).
 *   1b. La descripción contiene la ref_externa pero el importe NO coincide →
 *      "ambiguo" (ref_externa_importe_distinto) — la ref sola no alcanza para
 *      pre-tildar un pago por un monto distinto al avisado.
 *   2. Importe exacto + único candidato dentro de ±2 días de `updated_at` → "confiable" (importe_unico).
 *   3. Importe exacto + 2+ candidatos en la ventana → "ambiguo" (el tesorero elige).
 *   4. Sin candidatos → "sin_match".
 */
export function proponerMatches(
  movimientos: MovimientoConciliable[],
  pagosPendientes: PagoCandidato[],
): PropuestaMatch[] {
  return movimientos.map((mov) => {
    const refEncontrada = REF_EXTERNA_RE.exec(mov.descripcion)?.[0]?.toUpperCase();
    if (refEncontrada) {
      const pagoPorRef = pagosPendientes.find((p) => p.ref_externa?.toUpperCase() === refEncontrada);
      if (pagoPorRef) {
        if (pagoPorRef.importe === mov.importe) {
          return {
            movimiento_id: mov.id,
            clasificacion: "confiable",
            pago_id: pagoPorRef.id,
            candidatos: [{ pago_id: pagoPorRef.id, importe: pagoPorRef.importe }],
            motivo: "ref_externa",
          };
        }
        return {
          movimiento_id: mov.id,
          clasificacion: "ambiguo",
          pago_id: null,
          candidatos: [{ pago_id: pagoPorRef.id, importe: pagoPorRef.importe }],
          motivo: "ref_externa_importe_distinto",
          detalle: `La referencia coincide pero el importe difiere ($${mov.importe.toFixed(2)} vs $${pagoPorRef.importe.toFixed(2)}).`,
        };
      }
    }

    const candidatosEnVentana = pagosPendientes.filter(
      (p) => p.importe === mov.importe && diferenciaEnDias(p.updated_at, mov.fecha) <= VENTANA_DIAS,
    );

    if (candidatosEnVentana.length === 1) {
      const unico = candidatosEnVentana[0];
      return {
        movimiento_id: mov.id,
        clasificacion: "confiable",
        pago_id: unico.id,
        candidatos: [{ pago_id: unico.id, importe: unico.importe }],
        motivo: "importe_unico",
      };
    }

    if (candidatosEnVentana.length >= 2) {
      return {
        movimiento_id: mov.id,
        clasificacion: "ambiguo",
        pago_id: null,
        candidatos: candidatosEnVentana.map((p) => ({ pago_id: p.id, importe: p.importe })),
        motivo: "ninguno",
      };
    }

    return {
      movimiento_id: mov.id,
      clasificacion: "sin_match",
      pago_id: null,
      candidatos: [],
      motivo: "ninguno",
    };
  });
}

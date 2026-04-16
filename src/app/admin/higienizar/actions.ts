"use server";

import { redirect } from "next/navigation";
import { read, utils } from "xlsx";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type Confianza = "ALTA" | "MEDIA" | "BAJA";

export type CampoCorreccion =
  | "nombre"
  | "telefono"
  | "provincia"
  | "localidad"
  | "calle"
  | "codigo_postal"
  | "tipo_titular"
  | "zona_geografica";

export interface Correccion {
  softguard_ref: string;
  nombre_cuenta: string;
  campo: CampoCorreccion;
  valor_actual: string | null;
  valor_propuesto: string;
  confianza: Confianza;
  razon: string;
}

export interface EstadisticasHigiene {
  total: number;
  excluidos: string[];
  sin_email: number;
  correcciones_por_campo: Record<string, number>;
}

export interface ResultadoAnalisis {
  correcciones: Correccion[];
  estadisticas: EstadisticasHigiene;
  error?: string;
}

// ── Helpers de normalización ──────────────────────────────────────────────────

// ESI-0000: cuenta de eventos del receptor (sistema Softguard)
// _MP-0001: cuenta interna de Mercado Pago
// ESI-999A: cuenta de pruebas — no importada
// _SG-INTE: cuenta interna de Softguard — no importada
const EXCLUSIONES = new Set(["ESI-0000", "_MP-0001", "ESI-999A", "_SG-INTE"]);

const KEYWORDS_EMPRESA = [
  "S.A.", "S.R.L.", "SAS", "S.A.S", "S.C.", "SRL",
  "VETERINARIA", "CLINICA", "CLÍNICA", "FARMACIA", "FERRETERIA", "FERRETERÍA",
  "ESTUDIO", "COLEGIO", "ESCUELA", "IGLESIA", "HOTEL", "HOSTEL",
  "RESTAURANT", "RESTAURANTE", "BAR ", "SUPERMERCADO", "INMOBILIARIA",
  "DISTRIBUIDORA", "TRANSPORTE", "SERVICIO", "TALLER", "CONSULTORIO",
  "LABORATORIO", "MUNICIPALIDAD", "COOPERATIVA", "ASOCIACION", "ASOCIACIÓN",
];

function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/(?:^|\s|[-/])\S/g, (c) => c.toUpperCase());
}

function esEmpresa(nombre: string): boolean {
  const upper = nombre.toUpperCase();
  return KEYWORDS_EMPRESA.some((kw) => upper.includes(kw));
}

function normalizarNombre(raw: string): { valor: string; confianza: Confianza } {
  const trimmed = raw.trim();
  if (trimmed === trimmed.toUpperCase() && trimmed.length > 0) {
    const normalizado = toTitleCase(trimmed);
    return {
      valor: normalizado,
      confianza: esEmpresa(trimmed) ? "MEDIA" : "ALTA",
    };
  }
  return { valor: trimmed, confianza: "ALTA" };
}

function normalizarTelefono(raw: string): { valor: string; confianza: Confianza } | null {
  if (!raw) return null;
  // Quitar todo lo que no sea dígito
  let digits = raw.replace(/\D/g, "");

  // Quitar prefijo de país argentino (54)
  if (digits.startsWith("54") && digits.length >= 12) {
    digits = digits.slice(2);
  }
  // Quitar leading 0 si hay 11 dígitos resultantes
  if (digits.startsWith("0") && digits.length === 11) {
    digits = digits.slice(1);
  }
  // Quitar leading "15" si el número ya tiene area code (más de 10 dígitos)
  if (digits.startsWith("15") && digits.length > 10) {
    digits = digits.slice(2);
  }

  if (digits.length === 10 && /^\d{10}$/.test(digits)) {
    return { valor: digits, confianza: "ALTA" };
  }

  // Si no llegamos a 10 dígitos, devolver como está para revisión manual
  if (digits.length > 0) {
    return { valor: digits, confianza: "BAJA" };
  }

  return null;
}

const TIPO_TITULAR_MAP: Record<string, string> = {
  residencial: "RESIDENCIAL",
  comercial: "COMERCIAL",
  oficinas: "OFICINAS",
  "vehículo": "VEHICULO",
  vehiculo: "VEHICULO",
};

const CP_LOCALIDAD: Record<string, string> = {
  victoria: "3153",
  "victoria (e.r.)": "3153",
  nogoyá: "2840",
  nogoya: "2840",
  paraná: "3100",
  parana: "3100",
  gualeguaychú: "2820",
  gualeguaychu: "2820",
};

function strVal(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

// ── Parsear el archivo XLS con SheetJS (o HTML-as-XLS de Softguard) ──────────

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)))
    .replace(/&nbsp;/g, " ")
    .trim();
}

function parseHtmlTable(html: string): Record<string, string>[] {
  const headers = [...html.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)]
    .map(m => decodeHtmlEntities(m[1]));
  if (headers.length === 0) return [];

  const rows: Record<string, string>[] = [];
  for (const trMatch of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
    const cells = [...trMatch[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)]
      .map(m => decodeHtmlEntities(m[1]));
    if (cells.length === 0) continue;

    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = cells[i] ?? ""; });
    rows.push(row);
  }
  return rows;
}

function parsearXLS(buffer: Buffer): Record<string, string>[] {
  const content = buffer.toString("utf8");
  const isHtml = content.trimStart().startsWith("/***") || content.includes("<!DOCTYPE html>");

  if (isHtml) {
    return parseHtmlTable(content);
  }

  const wb = read(buffer, { type: "buffer", raw: false });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return utils.sheet_to_json<Record<string, string>>(sheet, {
    defval: "",
    raw: false,
  });
}

// ── Mapeo de encabezados Softguard → campos internos ─────────────────────────
// El archivo puede tener encabezados exactos o con variaciones de spacing.
const HEADER_MAP: Record<string, string> = {
  "dealer/cuenta": "softguard_ref",
  "nombre": "nombre",
  "tipo de cuenta": "tipo_titular_raw",
  "provincia-estado": "provincia",
  "localidad": "localidad",
  "calle": "calle",
  "código postal": "codigo_postal",
  "codigo postal": "codigo_postal",
  "teléfono": "telefono",
  "telefono": "telefono",
  "email": "email",
  "ubicacion de la cuenta": "gps",
};

function normalizarHeaders(row: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) {
    const keyNorm = k.toLowerCase().trim();
    const mapped = HEADER_MAP[keyNorm];
    if (mapped) {
      out[mapped] = v;
    } else {
      out[keyNorm] = v;
    }
  }
  return out;
}

// ── Server Action principal ───────────────────────────────────────────────────

async function verificarAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const perfil = await prisma.perfil.findUnique({ where: { id: user.id } });
  if (perfil?.rol !== "ADMIN") redirect("/portal/dashboard");
}

export async function analizarXLS(formData: FormData): Promise<ResultadoAnalisis> {
  await verificarAdmin();

  const archivo = formData.get("archivo") as File | null;
  if (!archivo) {
    return { correcciones: [], estadisticas: { total: 0, excluidos: [], sin_email: 0, correcciones_por_campo: {} }, error: "No se recibió ningún archivo." };
  }

  let rows: Record<string, string>[];
  try {
    const arrayBuffer = await archivo.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    rows = parsearXLS(buffer);
  } catch {
    return { correcciones: [], estadisticas: { total: 0, excluidos: [], sin_email: 0, correcciones_por_campo: {} }, error: "No se pudo leer el archivo. Asegurate de subir el archivo XLS del Reporte de Cuentas." };
  }

  const correcciones: Correccion[] = [];
  const excluidos: string[] = [];
  let sin_email = 0;
  const correcciones_por_campo: Record<string, number> = {};

  function agregarCorreccion(c: Correccion) {
    correcciones.push(c);
    correcciones_por_campo[c.campo] = (correcciones_por_campo[c.campo] ?? 0) + 1;
  }

  // La primera fila suele ser encabezados en este formato de Softguard.
  // sheet_to_json con defVal ya usa la primera fila como keys.
  // Pero el archivo HTML-as-XLS puede tener el encabezado en la primera fila como datos.
  // Detectamos si la primera fila es un encabezado de datos.
  const firstRow = rows[0] ?? {};
  const firstKeys = Object.keys(firstRow);
  const isHeaderRow = firstKeys.some((k) => k.toLowerCase().includes("dealer"));

  const dataRows = isHeaderRow ? rows : rows.slice(1);

  for (const rawRow of dataRows) {
    const row = normalizarHeaders(rawRow);

    const softguard_ref = strVal(row["softguard_ref"]).replace(/\s+/g, "");
    if (!softguard_ref) continue;
    if (EXCLUSIONES.has(softguard_ref)) {
      excluidos.push(softguard_ref);
      continue;
    }

    const nombre_cuenta = strVal(row["nombre"]);

    // 1. Nombre en MAYÚSCULAS
    if (nombre_cuenta && nombre_cuenta === nombre_cuenta.toUpperCase() && /[A-Z]/.test(nombre_cuenta)) {
      const { valor, confianza } = normalizarNombre(nombre_cuenta);
      if (valor !== nombre_cuenta) {
        agregarCorreccion({
          softguard_ref,
          nombre_cuenta,
          campo: "nombre",
          valor_actual: nombre_cuenta,
          valor_propuesto: valor,
          confianza,
          razon: esEmpresa(nombre_cuenta) ? "Nombre de empresa en mayúsculas → Title Case (revisar)" : "Nombre en MAYÚSCULAS → Title Case",
        });
      }
    }

    // 2. Teléfono
    const telRaw = strVal(row["telefono"]);
    if (telRaw) {
      const norm = normalizarTelefono(telRaw);
      if (norm && norm.valor !== telRaw.replace(/\D/g, "")) {
        agregarCorreccion({
          softguard_ref,
          nombre_cuenta,
          campo: "telefono",
          valor_actual: telRaw,
          valor_propuesto: norm.valor,
          confianza: norm.confianza,
          razon: norm.confianza === "ALTA" ? "Normalizado a 10 dígitos sin prefijo" : "Formato de teléfono no estándar — revisar manualmente",
        });
      }
    }

    // 3. GPS inválido → NULL
    const gps = strVal(row["gps"]);
    if (gps === "0.0,0.0" || gps === "0,0") {
      agregarCorreccion({
        softguard_ref,
        nombre_cuenta,
        campo: "zona_geografica",
        valor_actual: gps,
        valor_propuesto: "",  // string vacío = NULL en DB
        confianza: "ALTA",
        razon: "Coordenadas 0.0,0.0 son inválidas → se eliminan",
      });
    }

    // 4. Provincia faltante → "Entre Ríos"
    const provinciaRaw = strVal(row["provincia"]);
    if (!provinciaRaw) {
      agregarCorreccion({
        softguard_ref,
        nombre_cuenta,
        campo: "provincia",
        valor_actual: null,
        valor_propuesto: "Entre Ríos",
        confianza: "ALTA",
        razon: "Todas las cuentas son de Entre Ríos",
      });
    }

    // 5. Código postal según localidad
    const localidad = strVal(row["localidad"]).toLowerCase();
    const cpRaw = strVal(row["codigo_postal"]);
    if (!cpRaw && localidad) {
      const cpSugerido = CP_LOCALIDAD[localidad];
      if (cpSugerido) {
        agregarCorreccion({
          softguard_ref,
          nombre_cuenta,
          campo: "codigo_postal",
          valor_actual: null,
          valor_propuesto: cpSugerido,
          confianza: "ALTA",
          razon: `CP por localidad: ${localidad}`,
        });
      }
    }

    // 6. Tipo de titular
    const tipoRaw = strVal(row["tipo_titular_raw"]).toLowerCase().trim();
    if (tipoRaw) {
      const tipoMapeado = TIPO_TITULAR_MAP[tipoRaw];
      if (tipoMapeado) {
        agregarCorreccion({
          softguard_ref,
          nombre_cuenta,
          campo: "tipo_titular",
          valor_actual: tipoRaw,
          valor_propuesto: tipoMapeado,
          confianza: "ALTA",
          razon: `Mapeo: "${tipoRaw}" → ${tipoMapeado}`,
        });
      }
    }

    // 7. Email faltante — solo estadística
    const emailRaw = strVal(row["email"]);
    if (!emailRaw) {
      sin_email++;
    }
  }

  return {
    correcciones,
    estadisticas: {
      total: dataRows.length,
      excluidos,
      sin_email,
      correcciones_por_campo,
    },
  };
}

// ── Aplicar correcciones seleccionadas ───────────────────────────────────────

export interface ResultadoAplicacion {
  aplicadas: number;
  errores: Array<{ softguard_ref: string; campo: string; error: string }>;
}

export async function aplicarCorreccionesSeleccionadas(
  correcciones: Correccion[]
): Promise<ResultadoAplicacion> {
  await verificarAdmin();

  let aplicadas = 0;
  const errores: ResultadoAplicacion["errores"] = [];

  for (const c of correcciones) {
    try {
      if (c.campo === "nombre" || c.campo === "telefono") {
        // Campos en Perfil — buscar por softguard_ref a través de Cuenta
        const cuenta = await prisma.cuenta.findUnique({
          where: { softguard_ref: c.softguard_ref },
          select: { perfil_id: true },
        });
        if (!cuenta) {
          errores.push({ softguard_ref: c.softguard_ref, campo: c.campo, error: "Cuenta no encontrada en BD" });
          continue;
        }

        if (c.campo === "telefono") {
          // Verificar unicidad
          const colision = await prisma.perfil.findFirst({
            where: { telefono: c.valor_propuesto, id: { not: cuenta.perfil_id } },
          });
          if (colision) {
            errores.push({ softguard_ref: c.softguard_ref, campo: c.campo, error: `Teléfono ${c.valor_propuesto} ya existe` });
            continue;
          }
        }

        await prisma.perfil.update({
          where: { id: cuenta.perfil_id },
          data: { [c.campo]: c.valor_propuesto || null },
        });
      } else if (c.campo === "zona_geografica") {
        // Campo en Cuenta
        await prisma.cuenta.update({
          where: { softguard_ref: c.softguard_ref },
          data: { zona_geografica: c.valor_propuesto || null },
        });
      } else if (c.campo === "tipo_titular") {
        // Enum en Perfil
        const cuenta = await prisma.cuenta.findUnique({
          where: { softguard_ref: c.softguard_ref },
          select: { perfil_id: true },
        });
        if (!cuenta) {
          errores.push({ softguard_ref: c.softguard_ref, campo: c.campo, error: "Cuenta no encontrada en BD" });
          continue;
        }
        await prisma.perfil.update({
          where: { id: cuenta.perfil_id },
          data: { tipo_titular: c.valor_propuesto as "RESIDENCIAL" | "COMERCIAL" | "OFICINAS" | "VEHICULO" },
        });
      } else {
        // Campos en Cuenta: calle, localidad, provincia, codigo_postal
        const existe = await prisma.cuenta.findUnique({ where: { softguard_ref: c.softguard_ref } });
        if (!existe) {
          errores.push({ softguard_ref: c.softguard_ref, campo: c.campo, error: "Cuenta no importada — omitir" });
          continue;
        }
        await prisma.cuenta.update({
          where: { softguard_ref: c.softguard_ref },
          data: { [c.campo]: c.valor_propuesto || null },
        });
      }
      aplicadas++;
    } catch (err) {
      // Extraer solo el mensaje relevante, sin el stack de Prisma/Turbopack
      let mensaje = "Error desconocido";
      if (err instanceof Error) {
        if (err.message.includes("Unique constraint") || err.message.includes("UniqueConstraint")) {
          mensaje = "Valor duplicado — ya existe en otro perfil";
        } else if (err.message.includes("No record was found")) {
          mensaje = "Cuenta no importada — omitir";
        } else {
          // Tomar solo la primera línea del mensaje
          mensaje = err.message.split("\n")[0].slice(0, 120);
        }
      }
      errores.push({ softguard_ref: c.softguard_ref, campo: c.campo, error: mensaje });
    }
  }

  return { aplicadas, errores };
}

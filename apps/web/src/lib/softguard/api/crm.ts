/**
 * Adaptador del módulo CRM (SgWebCrm) — gestión de cuentas de la central.
 *
 * Funcionalidades cubiertas (solo lectura):
 *   - fetchCuentasDealer   → cuentas visibles con estado de comunicación del panel
 *   - fetchCuentasCount    → total visible (chequeo de permisos: 0 = problema)
 *   - fetchContactosCuenta → teléfonos/contactos de una cuenta (GET /Rest/Search/Telefonos,
 *                            filtro tel_iidcuenta) — la lista de "llamados" de la central.
 */

import { readConfig, restGet, s, num, refCuenta, fecha } from "./core";
import { normalizarTelefono } from "@/lib/whatsapp";

interface RawCuentaDealer {
  cue_clinea?: string; cue_ncuenta: string; cue_cnombre: string;
  Situacion?: string;
  cue_ccalle?: string; cue_clocalidad?: string; cue_cprovincia?: string; cue_ccodigopostal?: string;
  tip_cdescripcion?: string;
  sta_ncuentaenfallodetst?: number | string;
  sta_tEnFalloDeTSTDesde?: string;
  sta_dfechaultimotst?: string;
  sta_nEnFalloDeAC?: number | string;
  sta_cultimaalarma?: string;
  sta_dfechautimaalarma?: string; // sic: typo de SoftGuard ("utima")
  cod_cdescripcion?: string;
}

export interface WebCuenta {
  softguard_ref: string;       // "ESI-0175"
  titular: string;
  situacion: string | null;    // "Habilitado"/"Inhabilitado" en la central
  calle: string | null;
  localidad: string | null;
  provincia: string | null;
  codigo_postal: string | null;
  tipo: string | null;         // tip_cdescripcion ("Comercial", "Particular"…)
  en_fallo_tst: boolean;       // panel sin reportar test periódico
  fallo_tst_desde: Date | null;
  ultimo_tst: Date | null;
  en_fallo_ac: boolean;        // corte de alimentación AC
  ultimo_evento: string | null;
  ultimo_evento_at: Date | null;
}

/**
 * Total de cuentas visibles para el usuario web (grilla principal del CRM,
 * GET /Rest/Search/CuentaByDealer sin filtros). Sirve como chequeo de permisos:
 * si da 0, el usuario perdió la visibilidad de cuentas (línea/rango/módulo).
 */
export async function fetchCuentasCount(): Promise<number> {
  const c = readConfig();
  const res = await restGet<unknown>(c, "/Rest/Search/CuentaByDealer", { page: 1, start: 0, limit: 1 });
  return res.total;
}

/**
 * Cuentas visibles con su estado de comunicación (grilla principal del CRM).
 * Fuente: GET /Rest/Search/CuentaByDealer — reemplaza al syncCuentas por SQL
 * (bloqueado por firewall) y suma el estado de test/AC que el SQL no traía.
 */
export async function fetchCuentasDealer(limit = 1000): Promise<WebCuenta[]> {
  const c = readConfig();
  const res = await restGet<RawCuentaDealer>(c, "/Rest/Search/CuentaByDealer", { page: 1, start: 0, limit });
  return res.rows.map((r) => ({
    softguard_ref:   refCuenta(r.cue_clinea, r.cue_ncuenta),
    titular:         s(r.cue_cnombre),
    situacion:       s(r.Situacion) || null,
    calle:           s(r.cue_ccalle) || null,
    localidad:       s(r.cue_clocalidad) || null,
    provincia:       s(r.cue_cprovincia) || null,
    codigo_postal:   s(r.cue_ccodigopostal) || null,
    tipo:            s(r.tip_cdescripcion) || null,
    en_fallo_tst:    s(r.sta_ncuentaenfallodetst) === "1",
    fallo_tst_desde: fecha(r.sta_tEnFalloDeTSTDesde),
    ultimo_tst:      fecha(r.sta_dfechaultimotst),
    en_fallo_ac:     s(r.sta_nEnFalloDeAC) === "1",
    ultimo_evento:   [s(r.sta_cultimaalarma), s(r.cod_cdescripcion)].filter(Boolean).join(" — ") || null,
    ultimo_evento_at: fecha(r.sta_dfechautimaalarma),
  }));
}

// ── Contactos de una cuenta = lista de teléfonos/llamados de la central ───────────
// Fuente: la misma "llamadas post-procesado" del MultiMonitor. Shape verificado contra
// la API real (GET /Rest/Search/Telefonos filtrando por tel_iidcuenta).

interface RawTelefono {
  tel_iidcuenta?: number | string;
  tel_cnombre?: string;      // nombre del CONTACTO (NO el de la cuenta `cue_cnombre`)
  tel_ctelefono?: string;    // número
  tel_cpredigito?: string;   // prefijo de área (se antepone al número)
  tel_cobservacion?: string; // rol/nota del contacto (ej. "Encargado")
  tel_norden?: number | string;
  lis_cdescripcion?: string; // lista a la que pertenece (ej. "Alarma General")
}

export interface WebContactoCuenta {
  nombre: string;
  telefono: string | null; // 10 dígitos normalizados, o null si ilegible/ausente
  rol: string | null;       // observación/lista del contacto
  orden: number | null;     // prioridad de contacto (para ordenar la lista)
}

/**
 * Contactos de una cuenta (los teléfonos cargados en la central para notificar).
 * SOLO LECTURA. GET /Rest/Search/Telefonos filtrando por `tel_iidcuenta` (filtro ExtJS).
 * Devuelve la lista ordenada por `orden` (los sin orden quedan al final).
 */
export async function fetchContactosCuenta(iidCuenta: number, limit = 50): Promise<WebContactoCuenta[]> {
  const c = readConfig();
  const res = await restGet<RawTelefono>(c, "/Rest/Search/Telefonos", {
    page: 1,
    start: 0,
    limit,
    filter: JSON.stringify([{ property: "tel_iidcuenta", value: iidCuenta }]),
  });
  return res.rows
    .map((r) => ({
      // El nombre del destinatario sale del CONTACTO (tel_cnombre), nunca de la cuenta.
      nombre:   s(r.tel_cnombre),
      // El número viene partido en prefijo de área + número.
      telefono: normalizarTelefono(`${s(r.tel_cpredigito)}${s(r.tel_ctelefono)}`),
      rol:      s(r.tel_cobservacion) || s(r.lis_cdescripcion) || null,
      orden:    num(r.tel_norden),
    }))
    .sort((a, b) => (a.orden ?? Infinity) - (b.orden ?? Infinity));
}

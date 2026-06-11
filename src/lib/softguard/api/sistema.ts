/**
 * Adaptador de SISTEMA — salud de la sesión y catálogo de módulos de la suite.
 *
 * Funcionalidades cubiertas (solo lectura):
 *   - pingWebApi          → login + validez del token (/rest/token/IsValid)
 *   - fetchModulosDesktop → módulos del Desktop con disponibilidad (DesktopModules)
 */

import { readConfig, getSessionCookie, withTimeout, restGet, s, num } from "./core";

interface RawDesktopModule {
  udm_idKey: number | string; udm_modulo: string;
  udm_disponible: number | string; udm_key_reference: string;
}

export interface ModuloSuite {
  id: number;
  nombre: string;      // ej. "Monitoreo Web Remoto", "CRM"
  disponible: boolean; // udm_disponible === "1"
  key: string;         // udm_key_reference, ej. "WebRemoto"
}

/** Ping real: login + token válido. Lanza si falla. */
export async function pingWebApi(): Promise<{ ok: boolean; status: number }> {
  const c = readConfig();
  const cookie = await getSessionCookie(c);
  const { signal, done } = withTimeout(c.timeoutMs);
  try {
    const res = await fetch(`${c.base}/rest/token/IsValid?_dc=${Date.now()}`, {
      headers: { Cookie: cookie, "X-Requested-With": "XMLHttpRequest" },
      signal,
    });
    const j = (await res.json()) as { Status?: number };
    return { ok: j.Status === 1, status: j.Status ?? 0 };
  } finally { done(); }
}

/** Módulos del Desktop de la suite web y su disponibilidad para el usuario actual. */
export async function fetchModulosDesktop(): Promise<ModuloSuite[]> {
  const c = readConfig();
  const res = await restGet<RawDesktopModule>(c, "/Rest/Search/DesktopModules", { page: 1, start: 0, limit: 100 });
  return res.rows.map((r) => ({
    id:         num(r.udm_idKey) ?? 0,
    nombre:     s(r.udm_modulo),
    disponible: s(r.udm_disponible) === "1",
    key:        s(r.udm_key_reference),
  }));
}

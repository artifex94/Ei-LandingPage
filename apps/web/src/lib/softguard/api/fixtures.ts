/**
 * Fixtures y helpers para los tests del ACL. Solo lo importan los *.test.ts
 * (no lo exporta el barrel).
 *
 * Las filas crudas son FIELES a los shapes reales capturados de la suite web
 * (2026-06-10), con sus rarezas A PROPÓSITO: padding de espacios, fechas US e
 * ISO mezcladas, sentinel 1/1/1900 ("sin dato"), números como string,
 * mayúsculas inconsistentes entre módulos (rec_iPrioridad vs rec_iprioridad)
 * y el typo real de SoftGuard ("sta_dfechautimaalarma"). Si la central cambia
 * un shape, estos fixtures son el contrato congelado contra el que se nota.
 */

import { vi } from "vitest";

// ── Respuestas falsas (duck typing de Response, sin depender del runtime) ─────

export interface FakeResponse {
  ok: boolean;
  status: number;
  headers: {
    get(name: string): string | null;
    getSetCookie(): string[];
  };
  json(): Promise<unknown>;
}

export function fakeRes(opts: {
  status?: number;
  setCookie?: string[];
  location?: string;
  contentType?: string;
  body?: unknown;
} = {}): FakeResponse {
  const { status = 200, setCookie = [], location, body } = opts;
  const contentType =
    opts.contentType ?? (body !== undefined ? "application/json" : "text/html");
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get(name: string) {
        const k = name.toLowerCase();
        if (k === "content-type") return contentType;
        if (k === "location") return location ?? null;
        if (k === "set-cookie") return setCookie[0] ?? null;
        return null;
      },
      getSetCookie: () => setCookie,
    },
    json: async () => body,
  };
}

/** Lista en el formato ExtJS que devuelve la suite: {success, total, rows}. */
export function restList<T>(rows: T[], total = rows.length) {
  return { success: true, total, rows };
}

// ── Mock del fetch global: flujo de login OAuth + rutas /Rest/* ──────────────
//
// Resuelve el handshake completo (GET / → POST OAuthLogin → GET callback) y
// rutea el resto por fragmento de pathname (case-insensitive). Cada handler
// recibe la URL y el número de llamada a ESA ruta (para simular caídas y
// recuperación). Si devuelve algo que no es FakeResponse, se envuelve como
// JSON 200.

type RouteHandler = (url: URL, nthCall: number) => FakeResponse | unknown;

function esFakeResponse(v: unknown): v is FakeResponse {
  return v !== null && typeof v === "object" && "headers" in v && "status" in v;
}

export function mockSoftguardFetch(rutas: Record<string, RouteHandler> = {}) {
  let logins = 0;
  const porRuta = new Map<string, number>();

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    void init;
    const url = new URL(String(input));

    if (url.pathname === "/") {
      return fakeRes({ setCookie: ["ASP.NET_SessionId=sess"] }) as unknown as Response;
    }
    if (url.pathname === "/OAuthLogin.ashx") {
      logins++;
      return fakeRes({
        status: 302,
        location: `/OAuthCallback.ashx?Code=C${logins}`,
      }) as unknown as Response;
    }
    if (url.pathname.startsWith("/OAuthCallback.ashx")) {
      return fakeRes({ setCookie: [`OAuth_Token=tok-${logins}`] }) as unknown as Response;
    }

    for (const [frag, handler] of Object.entries(rutas)) {
      if (url.pathname.toLowerCase().includes(frag.toLowerCase())) {
        const n = (porRuta.get(frag) ?? 0) + 1;
        porRuta.set(frag, n);
        const out = handler(url, n);
        return (esFakeResponse(out) ? out : fakeRes({ body: out })) as unknown as Response;
      }
    }
    throw new Error(`mockSoftguardFetch: ruta sin handler: ${url.pathname}`);
  });

  vi.stubGlobal("fetch", fetchMock);
  return { fetchMock, getLogins: () => logins };
}

/** Variables de entorno mínimas para que readConfig() arme un config válido. */
export function stubSoftguardEnv() {
  vi.stubEnv("SOFTGUARD_API_BASE", "http://sg.test:8080");
  vi.stubEnv("SOFTGUARD_API_USER", "portal");
  vi.stubEnv("SOFTGUARD_API_PASS", "secreto");
  vi.stubEnv("SOFTGUARD_API_CLIENT_ID", "00000000-0000-0000-0000-000000000001");
}

// ── Filas crudas por módulo ───────────────────────────────────────────────────

/** ReporteHistoricoMM — campos con mayúsculas (rec_iPrioridad, rec_cContenido). */
export const FILA_HISTORICO_MM = {
  rec_iid: 481223,
  rec_iidcuenta: 175,
  cue_clinea: "ESI",
  cue_ncuenta: "0175      ",
  cue_cnombre: "CLIENTE DEMO SRL          ",
  rec_calarma: "A11",
  rec_czona: "",
  rec_iPrioridad: "2",
  rec_isoFechaHora: "2026-06-10T18:21:33",
  rec_tfechahora: "6/10/2026 6:21:33 PM",
  rec_cContenido: "Apertura de local",
  rec_cObservaciones: "",
  cod_cdescripcion: "APERTURA",
  rec_ioperador: 4,
  rec_nestado: 0,
};

/** EventosPendientes — mismos conceptos, campos en minúsculas. */
export const FILA_EVENTO_PENDIENTE = {
  rec_iid: "481301",
  rec_iidcuenta: "175",
  cue_clinea: "ESI",
  cue_ncuenta: "0175      ",
  cue_cnombre: "CLIENTE DEMO SRL",
  rec_calarma: "COF",
  rec_czona: "001",
  zon_cdescripcion: "Tablero principal",
  rec_iprioridad: "1",
  rec_isofechahora: "2026-06-10T19:02:10",
  rec_ccontenido: "",
  rec_cobservaciones: "Sin atender",
  rec_nestado: "0",
};

/** Catálogo codigosalarmas (con padding en el código, como viene). */
export const FILAS_CODIGOS = [
  { cod_ccodigo: "COF ", cod_cdescripcion: "CORTE 220V", cod_nprioridad: "1", cod_ntipo: "2", cod_nMultiMonitor: "1" },
  { cod_ccodigo: "A11", cod_cdescripcion: "APERTURA", cod_nprioridad: "3", cod_ntipo: "1", cod_nMultiMonitor: "1" },
];

/** CuentaByDealer (CRM) — fechas US + ISO + sentinel y el typo real "utima". */
export const FILA_CUENTA_DEALER = {
  cue_clinea: "ESI",
  cue_ncuenta: "0175      ",
  cue_cnombre: "CLIENTE DEMO SRL          ",
  Situacion: "Habilitado",
  cue_ccalle: "Av. Siempreviva 742",
  cue_clocalidad: "Escobar",
  cue_cprovincia: "Buenos Aires",
  cue_ccodigopostal: "1625",
  tip_cdescripcion: "Comercial",
  sta_ncuentaenfallodetst: "1",
  sta_tEnFalloDeTSTDesde: "8/27/2025 1:01:41 PM",
  sta_dfechaultimotst: "2026-06-09T07:30:00",
  sta_nEnFalloDeAC: 0,
  sta_cultimaalarma: "V21",
  sta_dfechautimaalarma: "1/1/1900 12:00:00 AM",
  cod_cdescripcion: "Falla 220v",
};

/**
 * ServTec — estado 2 está ACTIVA según la grilla oficial (el pipeline SQL
 * retirado asumía "estado=2 = CERRADA"; era falso). Fecha de cierre sentinel.
 */
export const FILA_SERVTEC_ABIERTA = {
  stc_inumero: "12",
  stc_iid_cuenta: 175,
  stc_ctipo_servicio: "COR",
  stc_nestado: "2",
  stc_mobservaciones: "Cambio de batería  ",
  stc_ctecnico_1: "JPEREZ",
  stc_yValor: "15000.50",
  stc_dfecha_cierre: "1/1/1900 12:00:00 AM",
  stc_dfecha_modificacion: "2026-06-08T10:00:00",
  stf_dfecha_vto_orden: "2026-06-30T00:00:00",
};

/** ServTec — réplica de la orden real #1: estado 4 + fecha de cierre US válida. */
export const FILA_SERVTEC_CERRADA = {
  stc_inumero: 1,
  stc_iid_cuenta: 175,
  stc_ctipo_servicio: "INS",
  stc_nestado: 4,
  stc_dfecha_cierre: "11/20/2019 4:45:00 PM",
  stc_dfecha_modificacion: "11/20/2019 4:45:00 PM",
};

/** DesktopModules — disponibilidad como "1"/0 mezclados. */
export const FILAS_DESKTOP_MODULES = [
  { udm_idKey: "3", udm_modulo: "Monitoreo Web Remoto", udm_disponible: "1", udm_key_reference: "WebRemoto" },
  { udm_idKey: 7, udm_modulo: "Video", udm_disponible: 0, udm_key_reference: "Video" },
];

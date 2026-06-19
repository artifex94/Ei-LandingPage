import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  s,
  num,
  fecha,
  refCuenta,
  readConfig,
  restGet,
  invalidateWebApiSession,
  softguardWebApiConfigured,
} from "./core";
import { fakeRes, restList, mockSoftguardFetch, stubSoftguardEnv } from "./fixtures";

// ── Normalización (las rarezas de los datos de SoftGuard) ─────────────────────

describe("s — string con trim", () => {
  it("recorta el padding de espacios de SoftGuard", () => {
    expect(s("0175      ")).toBe("0175");
    expect(s("  ESI ")).toBe("ESI");
  });

  it("null/undefined → cadena vacía", () => {
    expect(s(null)).toBe("");
    expect(s(undefined)).toBe("");
  });

  it("números → string", () => {
    expect(s(481223)).toBe("481223");
  });
});

describe("num — número o null", () => {
  it("parsea números que vienen como string", () => {
    expect(num("2")).toBe(2);
    expect(num("15000.50")).toBe(15000.5);
    expect(num(7)).toBe(7);
  });

  it("basura no numérica → null", () => {
    expect(num("N/A")).toBeNull();
    expect(num(undefined)).toBeNull();
  });

  it("documenta el edge actual: '' y null coercionan a 0 (Number('') === 0)", () => {
    // Comportamiento vigente del ACL — si algún día molesta, cambiarlo es
    // una decisión de mapeo, no un accidente.
    expect(num("")).toBe(0);
    expect(num(null)).toBe(0);
  });
});

describe("fecha — ISO, US y sentinel 1900", () => {
  it("parsea ISO sin zona", () => {
    const d = fecha("2026-06-10T18:21:33");
    expect(d).toBeInstanceOf(Date);
    expect(d?.getFullYear()).toBe(2026);
    expect(d?.getMonth()).toBe(5);
    expect(d?.getDate()).toBe(10);
  });

  it("parsea el formato US de SoftGuard (M/D/YYYY h:mm:ss AM/PM)", () => {
    const d = fecha("8/27/2025 1:01:41 PM");
    expect(d?.getFullYear()).toBe(2025);
    expect(d?.getMonth()).toBe(7); // agosto — mes 8, NO día 8
    expect(d?.getDate()).toBe(27);
    expect(d?.getHours()).toBe(13);
  });

  it("el sentinel 1/1/1900 ('sin dato') → null", () => {
    expect(fecha("1/1/1900 12:00:00 AM")).toBeNull();
    expect(fecha("1900-01-01T00:00:00")).toBeNull();
  });

  it("vacío, inválida o null → null", () => {
    expect(fecha("")).toBeNull();
    expect(fecha("   ")).toBeNull();
    expect(fecha("no es fecha")).toBeNull();
    expect(fecha(null)).toBeNull();
    expect(fecha(undefined)).toBeNull();
  });
});

describe("refCuenta — formato del portal 'LINEA-CUENTA'", () => {
  it("compone línea y número recortando el padding", () => {
    expect(refCuenta("ESI", "0175      ")).toBe("ESI-0175");
    expect(refCuenta("ESI  ", " 0042")).toBe("ESI-0042");
  });

  it("sin línea devuelve solo el número (no antepone guión)", () => {
    expect(refCuenta("", "0175")).toBe("0175");
    expect(refCuenta(undefined, "0042")).toBe("0042");
  });
});

// ── Config ────────────────────────────────────────────────────────────────────

describe("readConfig / softguardWebApiConfigured", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("recorta la barra final de la base y aplica el timeout default", () => {
    vi.stubEnv("SOFTGUARD_API_BASE", "http://sg.test:8080/");
    const c = readConfig();
    expect(c.base).toBe("http://sg.test:8080");
    expect(c.timeoutMs).toBe(15000);
  });

  it("configurado solo cuando hay base + usuario + clave", () => {
    vi.stubEnv("SOFTGUARD_API_BASE", "http://sg.test:8080");
    vi.stubEnv("SOFTGUARD_API_USER", "portal");
    vi.stubEnv("SOFTGUARD_API_PASS", "");
    expect(softguardWebApiConfigured()).toBe(false);
    vi.stubEnv("SOFTGUARD_API_PASS", "secreto");
    expect(softguardWebApiConfigured()).toBe(true);
  });
});

// ── restGet: login, cache de sesión y retry ───────────────────────────────────

describe("restGet — sesión y auto-recuperación", () => {
  beforeEach(() => {
    stubSoftguardEnv();
    invalidateWebApiSession();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    invalidateWebApiSession();
  });

  it("hace el login completo una vez y manda la cookie OAuth_Token", async () => {
    const { fetchMock, getLogins } = mockSoftguardFetch({
      "/Rest/Search/Cosa": () => restList([{ a: 1 }]),
    });

    const res = await restGet<{ a: number }>(readConfig(), "/Rest/Search/Cosa");

    expect(res.rows).toEqual([{ a: 1 }]);
    expect(getLogins()).toBe(1);

    const dataCall = fetchMock.mock.calls.find(([u]) => String(u).includes("/Rest/Search/Cosa"));
    const headers = (dataCall?.[1]?.headers ?? {}) as Record<string, string>;
    expect(headers.Cookie).toContain("OAuth_Token=tok-1");
    expect(headers["X-Requested-With"]).toBe("XMLHttpRequest");
  });

  it("reutiliza la cookie cacheada entre llamadas (no re-loguea)", async () => {
    const { fetchMock, getLogins } = mockSoftguardFetch({
      "/Rest/Search/Cosa": () => restList([{ a: 1 }]),
    });

    await restGet(readConfig(), "/Rest/Search/Cosa");
    await restGet(readConfig(), "/Rest/Search/Cosa");

    expect(getLogins()).toBe(1);
    // 3 requests de login + 2 de datos
    expect(fetchMock.mock.calls).toHaveLength(5);
  });

  it("ante HTTP de error invalida la sesión y reintenta UNA vez con login fresco", async () => {
    const { getLogins, fetchMock } = mockSoftguardFetch({
      "/Rest/Search/Cosa": (_url, n) =>
        n === 1 ? fakeRes({ status: 500 }) : restList([{ ok: true }]),
    });

    const res = await restGet(readConfig(), "/Rest/Search/Cosa");

    expect(res.rows).toEqual([{ ok: true }]);
    expect(getLogins()).toBe(2);

    const dataCalls = fetchMock.mock.calls.filter(([u]) => String(u).includes("/Rest/Search/Cosa"));
    const headersRetry = (dataCalls[1]?.[1]?.headers ?? {}) as Record<string, string>;
    expect(headersRetry.Cookie).toContain("OAuth_Token=tok-2");
  });

  it("una respuesta no-JSON (sesión expirada → HTML de login) también dispara el retry", async () => {
    const { getLogins } = mockSoftguardFetch({
      "/Rest/Search/Cosa": (_url, n) =>
        n === 1
          ? fakeRes({ status: 200, contentType: "text/html" })
          : restList([{ ok: true }]),
    });

    const res = await restGet(readConfig(), "/Rest/Search/Cosa");

    expect(res.rows).toEqual([{ ok: true }]);
    expect(getLogins()).toBe(2);
  });

  it("si el reintento también falla, lanza con el detalle del path", async () => {
    mockSoftguardFetch({
      "/Rest/Search/Cosa": () => fakeRes({ status: 503 }),
    });

    await expect(restGet(readConfig(), "/Rest/Search/Cosa")).rejects.toThrow(
      /GET \/Rest\/Search\/Cosa → HTTP 503/,
    );
  });

  it("el login sin redirect (credenciales malas) falla con error explícito", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = new URL(String(input));
        if (url.pathname === "/") return fakeRes({ setCookie: ["ASP.NET_SessionId=s"] }) as unknown as Response;
        // OAuthLogin sin header Location → credenciales inválidas
        return fakeRes({ status: 200 }) as unknown as Response;
      }),
    );

    await expect(restGet(readConfig(), "/Rest/Search/Cosa")).rejects.toThrow(
      /login sin redirect/,
    );
  });
});

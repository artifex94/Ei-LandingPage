import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { invalidateWebApiSession } from "./core";
import { fetchCuentasDealer, fetchCuentasCount } from "./crm";
import {
  restList,
  mockSoftguardFetch,
  stubSoftguardEnv,
  FILA_CUENTA_DEALER,
} from "./fixtures";

describe("adaptador crm", () => {
  beforeEach(() => {
    stubSoftguardEnv();
    invalidateWebApiSession();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    invalidateWebApiSession();
  });

  it("fetchCuentasDealer proyecta la fila real del CRM a WebCuenta", async () => {
    mockSoftguardFetch({ "/Rest/Search/CuentaByDealer": () => restList([FILA_CUENTA_DEALER]) });

    const [cta] = await fetchCuentasDealer();

    expect(cta.softguard_ref).toBe("ESI-0175");
    expect(cta.titular).toBe("CLIENTE DEMO SRL");
    expect(cta.situacion).toBe("Habilitado");
    expect(cta.calle).toBe("Av. Siempreviva 742");
    expect(cta.tipo).toBe("Comercial");

    // fallo de TST: viene "1" como string → true, con su fecha en formato US
    expect(cta.en_fallo_tst).toBe(true);
    expect(cta.fallo_tst_desde?.getFullYear()).toBe(2025);
    expect(cta.fallo_tst_desde?.getMonth()).toBe(7); // agosto

    // último test OK en ISO (asserts en hora local para no depender de la TZ)
    expect(cta.ultimo_tst?.getFullYear()).toBe(2026);
    expect(cta.ultimo_tst?.getMonth()).toBe(5);
    expect(cta.ultimo_tst?.getDate()).toBe(9);

    // fallo de AC: 0 numérico → false
    expect(cta.en_fallo_ac).toBe(false);

    // último evento compone código + descripción del catálogo
    expect(cta.ultimo_evento).toBe("V21 — Falla 220v");

    // el typo real de SoftGuard (sta_dfechautimaalarma) con sentinel 1900 → null
    expect(cta.ultimo_evento_at).toBeNull();
  });

  it("campos vacíos u omitidos quedan en null/false (no strings vacíos)", async () => {
    mockSoftguardFetch({
      "/Rest/Search/CuentaByDealer": () =>
        restList([{ cue_ncuenta: "0042", cue_cnombre: "OTRO CLIENTE" }]),
    });

    const [cta] = await fetchCuentasDealer();

    expect(cta.softguard_ref).toBe("0042"); // sin línea → sin guión
    expect(cta.situacion).toBeNull();
    expect(cta.calle).toBeNull();
    expect(cta.en_fallo_tst).toBe(false);
    expect(cta.en_fallo_ac).toBe(false);
    expect(cta.ultimo_evento).toBeNull();
    expect(cta.ultimo_tst).toBeNull();
  });

  it("fetchCuentasCount devuelve el total que reporta la grilla (chequeo de permisos)", async () => {
    mockSoftguardFetch({
      "/Rest/Search/CuentaByDealer": () => restList([{ cue_ncuenta: "0001" }], 203),
    });

    expect(await fetchCuentasCount()).toBe(203);
  });
});

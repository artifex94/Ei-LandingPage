import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { invalidateWebApiSession } from "./core";
import { fetchCuentasDealer, fetchCuentasCount, fetchContactosCuenta } from "./crm";
import {
  restList,
  mockSoftguardFetch,
  stubSoftguardEnv,
  FILA_CUENTA_DEALER,
  FILA_TELEFONO,
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

  it("fetchContactosCuenta mapea los teléfonos de la cuenta y ordena por orden", async () => {
    mockSoftguardFetch({
      "/Rest/Search/Telefonos": () =>
        restList([
          { tel_cnombre: "Ana López", tel_cpredigito: "343", tel_ctelefono: "4112233", tel_cobservacion: "Vecino", tel_norden: "2" },
          FILA_TELEFONO, // Carlos, orden 7
        ]),
    });

    const contactos = await fetchContactosCuenta(16);

    expect(contactos).toHaveLength(2);
    // ordenado por `orden` ascendente: Ana (2) antes que Carlos (7)
    expect(contactos.map((c) => c.nombre)).toEqual(["Ana López", "Carlos Adrián Muñoz"]);
    expect(contactos[0].telefono).toBe("3434112233"); // predigito + telefono
    // el nombre sale del CONTACTO (tel_cnombre), el número de predigito+telefono normalizado
    expect(contactos[1].telefono).toBe("3436414325");
    expect(contactos[1].rol).toBe("Encargado");
    expect(contactos[1].orden).toBe(7);
  });

  it("teléfono ilegible queda en null y el rol cae a la lista", async () => {
    mockSoftguardFetch({
      "/Rest/Search/Telefonos": () =>
        restList([{ tel_cnombre: "Sin Tel", tel_ctelefono: "n/d", lis_cdescripcion: "Emergencia" }]),
    });

    const [c] = await fetchContactosCuenta(1);

    expect(c.telefono).toBeNull();
    expect(c.rol).toBe("Emergencia"); // sin observación → cae a la lista
    expect(c.orden).toBeNull();
  });
});

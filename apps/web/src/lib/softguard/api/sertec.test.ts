import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { invalidateWebApiSession } from "./core";
import { fetchOrdenesServicio, fetchOrdenesServicioCount } from "./sertec";
import {
  restList,
  mockSoftguardFetch,
  stubSoftguardEnv,
  FILA_SERVTEC_ABIERTA,
  FILA_SERVTEC_CERRADA,
} from "./fixtures";

describe("adaptador sertec — criterio de cierre empírico", () => {
  beforeEach(() => {
    stubSoftguardEnv();
    invalidateWebApiSession();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    invalidateWebApiSession();
  });

  it("estado 2 es ACTIVA (el 'estado=2 = CERRADA' del pipeline SQL era falso)", async () => {
    mockSoftguardFetch({ "/Rest/search/ServTec": () => restList([FILA_SERVTEC_ABIERTA]) });

    const [orden] = await fetchOrdenesServicio();

    expect(orden.numero).toBe(12);
    expect(orden.estado_raw).toBe(2);
    expect(orden.activa).toBe(true);
    expect(orden.cerrada).toBe(false);
    // fecha de cierre sentinel 1900 → null
    expect(orden.fecha_cierre).toBeNull();
    expect(orden.tecnico).toBe("JPEREZ");
    expect(orden.valor).toBe(15000.5);
    expect(orden.vencimiento?.getMonth()).toBe(5);
    expect(orden.vencimiento?.getDate()).toBe(30);
  });

  it("cerrada = estado fuera de {1,2,5,6} + fecha de cierre válida (orden real #1)", async () => {
    mockSoftguardFetch({ "/Rest/search/ServTec": () => restList([FILA_SERVTEC_CERRADA]) });

    const [orden] = await fetchOrdenesServicio();

    expect(orden.estado_raw).toBe(4);
    expect(orden.activa).toBe(false);
    expect(orden.cerrada).toBe(true);
    expect(orden.fecha_cierre?.getFullYear()).toBe(2019);
  });

  it("estado no activo SIN fecha de cierre NO se considera cerrada (limbo)", async () => {
    mockSoftguardFetch({
      "/Rest/search/ServTec": () =>
        restList([{ ...FILA_SERVTEC_CERRADA, stc_dfecha_cierre: "1/1/1900 12:00:00 AM" }]),
    });

    const [orden] = await fetchOrdenesServicio();

    expect(orden.activa).toBe(false);
    expect(orden.cerrada).toBe(false);
  });

  it("cada estado activo de la grilla oficial (1,2,5,6) marca activa", async () => {
    const filas = [1, 2, 5, 6].map((estado, i) => ({
      ...FILA_SERVTEC_ABIERTA,
      stc_inumero: 100 + i,
      stc_nestado: String(estado),
    }));
    mockSoftguardFetch({ "/Rest/search/ServTec": () => restList(filas) });

    const ordenes = await fetchOrdenesServicio();

    expect(ordenes.map((o) => o.activa)).toEqual([true, true, true, true]);
    expect(ordenes.map((o) => o.cerrada)).toEqual([false, false, false, false]);
  });

  it("soloActivas replica el filtro exacto de la UI oficial en la query", async () => {
    const { fetchMock } = mockSoftguardFetch({ "/Rest/search/ServTec": () => restList([]) });

    await fetchOrdenesServicio({ soloActivas: true });

    const call = fetchMock.mock.calls.find(([u]) => String(u).includes("/Rest/search/ServTec"));
    const url = new URL(String(call?.[0]));
    expect(url.searchParams.get("filter")).toBe(
      '[{"property":"stc_nestado:inint","value":"1,2,5,6"}]',
    );
  });

  it("fetchOrdenesServicioCount devuelve el total reportado", async () => {
    mockSoftguardFetch({
      "/Rest/search/ServTec": () => restList([FILA_SERVTEC_ABIERTA], 57),
    });

    expect(await fetchOrdenesServicioCount()).toBe(57);
  });
});

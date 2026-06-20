import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { invalidateWebApiSession } from "./core";
import {
  fetchCodigosAlarma,
  fetchEventosHistoricoMM,
  fetchEventosPendientes,
} from "./monitoreo";
import {
  restList,
  mockSoftguardFetch,
  stubSoftguardEnv,
  FILA_HISTORICO_MM,
  FILA_EVENTO_PENDIENTE,
  FILAS_CODIGOS,
} from "./fixtures";

describe("adaptador monitoreo", () => {
  beforeEach(() => {
    stubSoftguardEnv();
    invalidateWebApiSession();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    invalidateWebApiSession();
  });

  it("fetchCodigosAlarma arma el catálogo con códigos recortados y prioridad numérica", async () => {
    mockSoftguardFetch({ "/rest/search/codigosalarmas": () => restList(FILAS_CODIGOS) });

    const cat = await fetchCodigosAlarma();

    // "COF " viene con padding del lado de SoftGuard → la clave queda limpia
    expect(cat.get("COF")).toEqual({ descripcion: "CORTE 220V", prioridad: 1, tipo: 2 });
    expect(cat.get("A11")?.prioridad).toBe(3);
  });

  it("fetchEventosHistoricoMM normaliza la fila real del ReporteHistoricoMM", async () => {
    mockSoftguardFetch({ "/Rest/Search/ReporteHistoricoMM": () => restList([FILA_HISTORICO_MM]) });

    const [ev] = await fetchEventosHistoricoMM(10);

    expect(ev.id_evento).toBe("481223");
    expect(ev.iid_cuenta).toBe(175);
    // padding "0175      " + línea → ref compuesta del portal
    expect(ev.softguard_ref).toBe("ESI-0175");
    expect(ev.titular).toBe("CLIENTE DEMO SRL");
    expect(ev.fecha_evento.getFullYear()).toBe(2026);
    expect(ev.fecha_evento.getHours()).toBe(18);
    expect(ev.codigo).toBe("A11");
    // la descripción legible viene en la misma fila (sin catálogo)
    expect(ev.descripcion).toBe("APERTURA");
    expect(ev.zona).toBe("Cocina"); // zon_cdescripcion (nombre) gana sobre el número
    expect(ev.prioridad).toBe(2); // rec_iPrioridad como string "2"
    expect(ev.operador_id).toBe("4");
    expect(ev.observacion).toBeNull();
    expect(ev.estado_raw).toBe("0");
  });

  it("fetchEventosHistoricoMM cae al número de zona si no hay nombre", async () => {
    mockSoftguardFetch({
      "/Rest/Search/ReporteHistoricoMM": () =>
        restList([{ ...FILA_HISTORICO_MM, zon_cdescripcion: "", rec_czona: "303" }]),
    });

    const [ev] = await fetchEventosHistoricoMM(10);
    expect(ev.zona).toBe("303");
  });

  it("fetchEventosPendientes usa el catálogo para la descripción y prefiere zon_cdescripcion", async () => {
    mockSoftguardFetch({ "/Rest/search/EventosPendientes": () => restList([FILA_EVENTO_PENDIENTE]) });
    const catalogo = new Map([["COF", { descripcion: "CORTE 220V", prioridad: 1, tipo: 2 }]]);

    const [ev] = await fetchEventosPendientes(catalogo, 200);

    expect(ev.softguard_ref).toBe("ESI-0175");
    expect(ev.codigo).toBe("COF");
    // rec_ccontenido vacío → gana la descripción del catálogo
    expect(ev.descripcion).toBe("CORTE 220V");
    // zon_cdescripcion legible gana sobre el código de zona rec_czona
    expect(ev.zona).toBe("Tablero principal");
    expect(ev.prioridad).toBe(1);
    expect(ev.observacion).toBe("Sin atender");
    // rec_ioperador ausente en la cola de pendientes → null
    expect(ev.operador_id).toBeNull();
  });

  it("fetchEventosPendientes sin catálogo cae al código como descripción", async () => {
    mockSoftguardFetch({ "/Rest/search/EventosPendientes": () => restList([FILA_EVENTO_PENDIENTE]) });

    const [ev] = await fetchEventosPendientes();

    expect(ev.descripcion).toBe("COF");
  });
});

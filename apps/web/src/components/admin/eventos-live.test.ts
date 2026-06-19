import { describe, it, expect } from "vitest";
import { filtrarEventos, FILTROS_INICIALES, horaConDia } from "./eventos-live";
import type { EventoLive } from "@/app/api/admin/eventos-live/route";

function ev(over: Partial<EventoLive>): EventoLive {
  return {
    id: "1",
    softguard_ref: "ESI-0175",
    titular: "CLIENTE DEMO SRL",
    codigo: "COF",
    descripcion: "CORTE 220V",
    zona: null,
    prioridad: 1,
    fecha: new Date().toISOString(),
    procesado: false,
    ...over,
  };
}

const EVENTOS: EventoLive[] = [
  ev({ id: "a", prioridad: 1, procesado: false }),
  ev({ id: "b", prioridad: 2, procesado: true, softguard_ref: "ESI-0042", titular: "OTRO COMERCIO" }),
  ev({ id: "c", prioridad: null, procesado: false, codigo: "TST", descripcion: "TEST PERIODICO" }),
  ev({ id: "d", prioridad: 3, procesado: true, softguard_ref: "ESI-0099", titular: "Casa García" }),
];

describe("filtrarEventos", () => {
  it("sin filtros deja pasar todo", () => {
    expect(filtrarEventos(EVENTOS, FILTROS_INICIALES)).toHaveLength(4);
  });

  it("filtra por prioridad exacta", () => {
    const p1 = filtrarEventos(EVENTOS, { ...FILTROS_INICIALES, prioridad: "1" });
    expect(p1.map((e) => e.id)).toEqual(["a"]);

    const p2 = filtrarEventos(EVENTOS, { ...FILTROS_INICIALES, prioridad: "2" });
    expect(p2.map((e) => e.id)).toEqual(["b"]);
  });

  it("'otras' agrupa lo que no es P1 ni P2 (incluye sin prioridad)", () => {
    const otras = filtrarEventos(EVENTOS, { ...FILTROS_INICIALES, prioridad: "otras" });
    expect(otras.map((e) => e.id)).toEqual(["c", "d"]);
  });

  it("solo pendientes excluye los procesados", () => {
    const pend = filtrarEventos(EVENTOS, { ...FILTROS_INICIALES, soloPendientes: true });
    expect(pend.map((e) => e.id)).toEqual(["a", "c"]);
  });

  it("busca por número de cuenta y por titular, sin distinguir mayúsculas", () => {
    expect(filtrarEventos(EVENTOS, { ...FILTROS_INICIALES, q: "0042" }).map((e) => e.id)).toEqual(["b"]);
    expect(filtrarEventos(EVENTOS, { ...FILTROS_INICIALES, q: "garcía" }).map((e) => e.id)).toEqual(["d"]);
    expect(filtrarEventos(EVENTOS, { ...FILTROS_INICIALES, q: "  demo " }).map((e) => e.id)).toEqual(["a", "c"]);
  });

  it("combina filtros (prioridad + pendientes + búsqueda)", () => {
    const res = filtrarEventos(EVENTOS, { q: "esi-0175", prioridad: "1", soloPendientes: true });
    expect(res.map((e) => e.id)).toEqual(["a"]);
  });
});

describe("horaConDia", () => {
  it("para un evento de hoy muestra solo la hora", () => {
    const hoy = new Date();
    hoy.setHours(14, 30, 5, 0);
    expect(horaConDia(hoy.toISOString())).toMatch(/^14:30:05$/);
  });

  it("para un evento de otro día antepone dd/mm", () => {
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    ayer.setHours(9, 15, 0, 0);
    expect(horaConDia(ayer.toISOString())).toMatch(/^\d{2}\/\d{2} 09:15:00$/);
  });
});

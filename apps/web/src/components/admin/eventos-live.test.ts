import { describe, it, expect, vi, afterEach } from "vitest";
import {
  filtrarEventos,
  FILTROS_INICIALES,
  horaConDia,
  eventosAgrupadosCuenta,
  COLUMNAS_MONITOREO,
  vidaUtilEvento,
  VENTANA_VIDA_UTIL_MS,
} from "./eventos-live";
import type { EventoLive } from "@/app/api/admin/eventos-live/route";

function ev(over: Partial<EventoLive>): EventoLive {
  return {
    id: "1",
    iid_cuenta: 0,
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

describe("COLUMNAS_MONITOREO (board)", () => {
  it("define las cuatro columnas en orden Todos · P1 · P2 · Resto", () => {
    expect(COLUMNAS_MONITOREO.map((c) => c.key)).toEqual(["todos", "p1", "p2", "resto"]);
  });

  it("cada columna parte el feed por su prioridad (sin solaparse, salvo Todos)", () => {
    const porColumna = Object.fromEntries(
      COLUMNAS_MONITOREO.map((c) => [
        c.key,
        filtrarEventos(EVENTOS, { q: "", prioridad: c.prioridad, soloPendientes: false }).map((e) => e.id),
      ]),
    );
    expect(porColumna.todos).toEqual(["a", "b", "c", "d"]);
    expect(porColumna.p1).toEqual(["a"]);
    expect(porColumna.p2).toEqual(["b"]);
    expect(porColumna.resto).toEqual(["c", "d"]);
  });
});

describe("horaConDia", () => {
  // La hora SIEMPRE se muestra en horario de Argentina (UTC-3), sin importar el
  // timezone del runtime. Fijamos "ahora" para que el branch "es hoy" sea estable.
  afterEach(() => vi.useRealTimers());

  it("para un evento de hoy muestra solo la hora (en ART)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-19T20:00:00Z")); // 17:00 ART del 19/06
    // 14:30:05 ART = 17:30:05 UTC
    expect(horaConDia("2026-06-19T17:30:05Z")).toBe("14:30:05");
  });

  it("para un evento de otro día antepone dd/mm (en ART)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-19T20:00:00Z")); // hoy = 19/06 ART
    // 18/06 09:15:00 ART = 18/06 12:15:00 UTC
    expect(horaConDia("2026-06-18T12:15:00Z")).toBe("18/06 09:15:00");
  });
});

describe("vidaUtilEvento (barra que se descarga)", () => {
  const fecha = "2026-06-19T22:00:00.000Z";
  const fechaMs = Date.parse(fecha);

  it("ventana por prioridad: P1 < P2 < Resto", () => {
    expect(vidaUtilEvento(fecha, fechaMs, 1).windowMs).toBe(VENTANA_VIDA_UTIL_MS.p1);
    expect(vidaUtilEvento(fecha, fechaMs, 2).windowMs).toBe(VENTANA_VIDA_UTIL_MS.p2);
    expect(vidaUtilEvento(fecha, fechaMs, 3).windowMs).toBe(VENTANA_VIDA_UTIL_MS.resto);
    expect(vidaUtilEvento(fecha, fechaMs, null).windowMs).toBe(VENTANA_VIDA_UTIL_MS.resto);
  });

  it("elapsedMs = refMs - fecha", () => {
    expect(vidaUtilEvento(fecha, fechaMs + 3 * 60_000, 1).elapsedMs).toBe(3 * 60_000);
  });

  it("clampa a 0 si la fecha es futura (clock skew)", () => {
    expect(vidaUtilEvento(fecha, fechaMs - 60_000, 1).elapsedMs).toBe(0);
  });

  it("una antigüedad mayor que la ventana sigue devolviendo la ventana (el vaciado lo hace el CSS)", () => {
    const { windowMs, elapsedMs } = vidaUtilEvento(fecha, fechaMs + 99 * 60_000, 1);
    expect(windowMs).toBe(VENTANA_VIDA_UTIL_MS.p1);
    expect(elapsedMs).toBe(99 * 60_000);
  });

  it("fecha inválida → elapsedMs 0 (no rompe)", () => {
    expect(vidaUtilEvento("no-es-fecha", fechaMs, 1).elapsedMs).toBe(0);
  });
});

describe("eventosAgrupadosCuenta", () => {
  const base = ev({ id: "base", softguard_ref: "ESI-0175", fecha: "2026-06-19T22:00:00.000Z" });
  const lista: EventoLive[] = [
    base,
    ev({ id: "cerca", softguard_ref: "ESI-0175", fecha: "2026-06-19T22:05:00.000Z" }), // +5min, misma cuenta
    ev({ id: "lejos", softguard_ref: "ESI-0175", fecha: "2026-06-19T22:30:00.000Z" }), // +30min, fuera de ventana
    ev({ id: "otra", softguard_ref: "ESI-0042", fecha: "2026-06-19T22:03:00.000Z" }), // otra cuenta
  ];

  it("agrupa la misma cuenta dentro de la ventana, incluye el base, ordenado por fecha", () => {
    expect(eventosAgrupadosCuenta(lista, base).map((e) => e.id)).toEqual(["base", "cerca"]);
  });

  it("excluye otra cuenta y los disparados fuera de la ventana", () => {
    const ids = eventosAgrupadosCuenta(lista, base).map((e) => e.id);
    expect(ids).not.toContain("otra");
    expect(ids).not.toContain("lejos");
  });

  it("un solo evento → grupo de uno", () => {
    expect(eventosAgrupadosCuenta([base], base).map((e) => e.id)).toEqual(["base"]);
  });
});

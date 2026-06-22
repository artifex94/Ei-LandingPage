import { describe, it, expect } from "vitest";
import {
  parseFechaSoftguard,
  horaAR,
  horaCortaAR,
  diaMesAR,
  fechaAR,
  saludoPorHora,
} from "./fecha-ar";

describe("parseFechaSoftguard", () => {
  it("interpreta la hora naive de SoftGuard como Argentina (UTC-3)", () => {
    // SoftGuard manda hora local AR sin offset → 13:21:59.61 ART = 16:21:59 UTC
    expect(parseFechaSoftguard("2026-06-10T13:21:59.61").toISOString()).toBe(
      "2026-06-10T16:21:59.610Z",
    );
  });

  it("acepta separador con espacio en vez de T", () => {
    expect(parseFechaSoftguard("2026-06-10 13:21:59").toISOString()).toBe(
      "2026-06-10T16:21:59.000Z",
    );
  });

  it("respeta el offset si el string ya trae zona", () => {
    expect(parseFechaSoftguard("2026-06-10T13:21:59-03:00").toISOString()).toBe(
      "2026-06-10T16:21:59.000Z",
    );
    expect(parseFechaSoftguard("2026-06-10T16:21:59Z").toISOString()).toBe(
      "2026-06-10T16:21:59.000Z",
    );
  });
});

describe("formato en hora de Argentina", () => {
  // Instante absoluto: 16:21:59 UTC = 13:21:59 ART
  const iso = "2026-06-10T16:21:59.000Z";

  it("horaAR → HH:mm:ss en ART", () => {
    expect(horaAR(iso)).toBe("13:21:59");
  });

  it("horaCortaAR → HH:mm en ART", () => {
    expect(horaCortaAR(iso)).toBe("13:21");
  });

  it("diaMesAR / fechaAR en ART", () => {
    expect(diaMesAR(iso)).toBe("10/06");
    expect(fechaAR(iso)).toBe("10/06/2026");
  });

  it("cruce de medianoche: 01:00 UTC = 22:00 ART del día anterior", () => {
    const cruce = "2026-06-10T01:00:00.000Z";
    expect(horaCortaAR(cruce)).toBe("22:00");
    expect(fechaAR(cruce)).toBe("09/06/2026");
  });

  it("fecha inválida → string vacío", () => {
    expect(horaAR("no-es-fecha")).toBe("");
  });
});

describe("saludoPorHora (según hora local AR, UTC-3)", () => {
  // El UTC es AR + 3h. Probamos los bordes de cada franja en hora de Argentina.
  it("mañana: 06:00–11:59 AR → Buenos días", () => {
    expect(saludoPorHora(new Date("2026-06-19T09:00:00Z"))).toBe("Buenos días"); // 06:00 AR
    expect(saludoPorHora(new Date("2026-06-19T14:59:00Z"))).toBe("Buenos días"); // 11:59 AR
  });

  it("tarde: 12:00–19:59 AR → Buenas tardes", () => {
    expect(saludoPorHora(new Date("2026-06-19T15:00:00Z"))).toBe("Buenas tardes"); // 12:00 AR
    expect(saludoPorHora(new Date("2026-06-19T22:59:00Z"))).toBe("Buenas tardes"); // 19:59 AR
  });

  it("noche: 20:00–05:59 AR → Buenas noches", () => {
    expect(saludoPorHora(new Date("2026-06-19T23:00:00Z"))).toBe("Buenas noches"); // 20:00 AR
    expect(saludoPorHora(new Date("2026-06-19T08:59:00Z"))).toBe("Buenas noches"); // 05:59 AR
    expect(saludoPorHora(new Date("2026-06-19T01:00:00Z"))).toBe("Buenas noches"); // 22:00 AR (18/06)
  });
});

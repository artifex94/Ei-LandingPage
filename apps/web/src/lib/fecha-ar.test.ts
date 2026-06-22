import { describe, it, expect } from "vitest";
import {
  parseFechaSoftguard,
  horaAR,
  horaCortaAR,
  diaMesAR,
  fechaAR,
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

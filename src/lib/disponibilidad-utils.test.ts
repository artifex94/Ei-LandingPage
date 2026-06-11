import { describe, it, expect } from "vitest";
import {
  jornadaARangos,
  normalizarRangos,
  presetActivo,
  rangosAJornada,
  rangosAResumen,
  rangosAHoras,
  sumarMedia,
} from "./disponibilidad-utils";

describe("normalizarRangos", () => {
  it("mergea rangos solapados", () => {
    expect(
      normalizarRangos([
        { desde: "08:00", hasta: "12:00" },
        { desde: "10:00", hasta: "14:00" },
      ])
    ).toEqual([{ desde: "08:00", hasta: "14:00" }]);
  });

  it("une rangos adyacentes", () => {
    expect(
      normalizarRangos([
        { desde: "08:00", hasta: "14:00" },
        { desde: "14:00", hasta: "18:00" },
      ])
    ).toEqual([{ desde: "08:00", hasta: "18:00" }]);
  });

  it("clampea horas fuera del dominio 06–22", () => {
    expect(normalizarRangos([{ desde: "04:00", hasta: "23:30" }])).toEqual([
      { desde: "06:00", hasta: "22:00" },
    ]);
  });

  it("descarta rangos invertidos y conserva los válidos ordenados", () => {
    expect(
      normalizarRangos([
        { desde: "18:00", hasta: "12:00" },
        { desde: "14:00", hasta: "16:00" },
        { desde: "08:00", hasta: "10:00" },
      ])
    ).toEqual([
      { desde: "08:00", hasta: "10:00" },
      { desde: "14:00", hasta: "16:00" },
    ]);
  });

  it("vacío → vacío", () => {
    expect(normalizarRangos([])).toEqual([]);
  });
});

describe("presetActivo", () => {
  it("detecta cada preset exacto", () => {
    expect(presetActivo([{ desde: "06:00", hasta: "22:00" }])).toBe("todo-dia");
    expect(presetActivo([{ desde: "06:00", hasta: "14:00" }])).toBe("manana");
    expect(presetActivo([{ desde: "14:00", hasta: "22:00" }])).toBe("tarde");
    expect(presetActivo([])).toBe("no-disponible");
  });

  it("detecta el preset aunque los rangos vengan sin normalizar", () => {
    expect(
      presetActivo([
        { desde: "06:00", hasta: "14:00" },
        { desde: "14:00", hasta: "22:00" },
      ])
    ).toBe("todo-dia");
  });

  it("configuración personalizada → null", () => {
    expect(presetActivo([{ desde: "08:00", hasta: "12:00" }])).toBeNull();
  });
});

describe("rangosAResumen", () => {
  it("una franja", () => {
    expect(rangosAResumen([{ desde: "06:00", hasta: "14:00" }])).toBe("06:00–14:00");
  });

  it("varias franjas separadas por punto medio", () => {
    expect(
      rangosAResumen([
        { desde: "08:00", hasta: "12:00" },
        { desde: "14:00", hasta: "18:00" },
      ])
    ).toBe("08:00–12:00 · 14:00–18:00");
  });

  it("vacío → Sin disponibilidad", () => {
    expect(rangosAResumen([])).toBe("Sin disponibilidad");
  });
});

describe("rangosAHoras", () => {
  it("cuenta horas con paso de media hora", () => {
    expect(rangosAHoras([{ desde: "08:00", hasta: "12:30" }])).toBe(4.5);
    expect(rangosAHoras([])).toBe(0);
  });
});

describe("sumarMedia", () => {
  it("suma y resta bloques de 30 min", () => {
    expect(sumarMedia("08:00", 1)).toBe("08:30");
    expect(sumarMedia("08:00", -2)).toBe("07:00");
  });

  it("clampea al dominio 06-22", () => {
    expect(sumarMedia("06:00", -1)).toBe("06:00");
    expect(sumarMedia("22:00", 1)).toBe("22:00");
  });
});

describe("rangosAJornada / jornadaARangos", () => {
  it("una franja → jornada sin corte", () => {
    expect(rangosAJornada([{ desde: "08:00", hasta: "18:00" }])).toEqual({
      entro: "08:00",
      salgo: "18:00",
      corte: null,
    });
  });

  it("dos franjas → jornada con corte", () => {
    expect(
      rangosAJornada([
        { desde: "08:00", hasta: "12:00" },
        { desde: "14:00", hasta: "18:00" },
      ])
    ).toEqual({
      entro: "08:00",
      salgo: "18:00",
      corte: { desde: "12:00", hasta: "14:00" },
    });
  });

  it("vacío → null (no disponible)", () => {
    expect(rangosAJornada([])).toBeNull();
  });

  it("3+ franjas legacy → jornada con el primer corte", () => {
    const j = rangosAJornada([
      { desde: "06:00", hasta: "09:00" },
      { desde: "10:00", hasta: "12:00" },
      { desde: "15:00", hasta: "20:00" },
    ]);
    expect(j).toEqual({
      entro: "06:00",
      salgo: "20:00",
      corte: { desde: "09:00", hasta: "10:00" },
    });
  });

  it("jornadaARangos invierte el mapeo", () => {
    expect(
      jornadaARangos({ entro: "08:00", salgo: "18:00", corte: { desde: "12:00", hasta: "14:00" } })
    ).toEqual([
      { desde: "08:00", hasta: "12:00" },
      { desde: "14:00", hasta: "18:00" },
    ]);
    expect(jornadaARangos({ entro: "06:00", salgo: "22:00", corte: null })).toEqual([
      { desde: "06:00", hasta: "22:00" },
    ]);
    expect(jornadaARangos(null)).toEqual([]);
  });

  it("roundtrip jornada → rangos → jornada es estable", () => {
    const j = { entro: "07:30", salgo: "19:00", corte: { desde: "12:30", hasta: "13:30" } };
    expect(rangosAJornada(jornadaARangos(j))).toEqual(j);
  });
});

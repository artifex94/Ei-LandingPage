import { describe, it, expect } from "vitest";
import {
  normalizarRangos,
  presetActivo,
  primerHueco,
  rangosAResumen,
  rangosAHoras,
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

describe("primerHueco", () => {
  it("día vacío → sugiere desde las 06:00 (máx 4h)", () => {
    expect(primerHueco([])).toEqual({ desde: "06:00", hasta: "10:00" });
  });

  it("encuentra el hueco entre dos franjas", () => {
    expect(
      primerHueco([
        { desde: "06:00", hasta: "12:00" },
        { desde: "18:00", hasta: "22:00" },
      ])
    ).toEqual({ desde: "12:00", hasta: "16:00" });
  });

  it("hueco al final del día", () => {
    expect(primerHueco([{ desde: "06:00", hasta: "20:00" }])).toEqual({
      desde: "20:00",
      hasta: "22:00",
    });
  });

  it("día completo → null", () => {
    expect(primerHueco([{ desde: "06:00", hasta: "22:00" }])).toBeNull();
  });

  it("ignora huecos más chicos que el mínimo", () => {
    expect(
      primerHueco([
        { desde: "06:00", hasta: "10:00" },
        { desde: "10:30", hasta: "22:00" },
      ])
    ).toBeNull();
  });
});

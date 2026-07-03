import { describe, it, expect } from "vitest";
import { calcularPatronHorario, histogramaPorHora } from "./patron-horario";

describe("histogramaPorHora", () => {
  it("cuenta ocurrencias por hora del día", () => {
    expect(histogramaPorHora([3, 3, 3, 14])[3]).toBe(3);
    expect(histogramaPorHora([3, 3, 3, 14])[14]).toBe(1);
  });

  it("ignora horas fuera de rango (no rompe)", () => {
    expect(histogramaPorHora([-1, 24, 5]).reduce((a, b) => a + b, 0)).toBe(1);
  });

  it("sin eventos → todo en cero", () => {
    expect(histogramaPorHora([])).toEqual(new Array(24).fill(0));
  });
});

describe("calcularPatronHorario", () => {
  function counts(entries: Record<number, number>): number[] {
    const c = new Array(24).fill(0);
    for (const [h, n] of Object.entries(entries)) c[Number(h)] = n;
    return c;
  }

  it("sin eventos cerca de la hora actual → sin patrón", () => {
    expect(calcularPatronHorario(counts({}), 14)).toBeNull();
  });

  it("por debajo del umbral (±1h) → sin patrón", () => {
    // 2 eventos repartidos en la ventana [13,14,15] no alcanzan el umbral de 3.
    expect(calcularPatronHorario(counts({ 13: 1, 14: 1 }), 14)).toBeNull();
  });

  it("alcanza el umbral exactamente en la hora actual → chip con esa hora", () => {
    expect(calcularPatronHorario(counts({ 14: 3 }), 14)).toEqual({ hora: 14, veces: 3 });
  });

  it("suma la ventana ±1h para decidir, pero informa la hora pico", () => {
    // 13:1 + 14:1 + 15:2 = 4 (≥ umbral); el pico es 15 con 2 ocurrencias.
    expect(calcularPatronHorario(counts({ 13: 1, 14: 1, 15: 2 }), 14)).toEqual({ hora: 15, veces: 2 });
  });

  it("la ventana envuelve la medianoche (23 → 0)", () => {
    expect(calcularPatronHorario(counts({ 23: 2, 0: 2 }), 23)).toEqual({ hora: 23, veces: 2 });
  });

  it("hora fuera de 0-23 → sin patrón (no rompe)", () => {
    expect(calcularPatronHorario(counts({ 14: 5 }), 25)).toBeNull();
    expect(calcularPatronHorario(counts({ 14: 5 }), -1)).toBeNull();
  });

  it("histograma con longitud inválida → sin patrón (no rompe)", () => {
    expect(calcularPatronHorario([1, 2, 3], 1)).toBeNull();
  });
});

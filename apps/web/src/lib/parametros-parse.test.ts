import { describe, it, expect } from "vitest";
import { parseParametro, validarValorParametro, CATALOGO_PARAMETROS } from "./parametros-parse";

describe("parseParametro", () => {
  it("INT: parsea un entero válido", () => {
    expect(parseParametro("2", "INT", 3)).toBe(2);
  });

  it("INT: valor corrupto (no entero) → fallback", () => {
    expect(parseParametro("abc", "INT", 3)).toBe(3);
    expect(parseParametro("2.5", "INT", 3)).toBe(3);
  });

  it("DECIMAL: parsea un decimal válido", () => {
    expect(parseParametro("2.5", "DECIMAL", 1)).toBe(2.5);
  });

  it("DECIMAL: valor corrupto (no numérico) → fallback", () => {
    expect(parseParametro("abc", "DECIMAL", 1)).toBe(1);
  });

  it("STRING: devuelve el valor tal cual", () => {
    expect(parseParametro("hola", "STRING", "chau")).toBe("hola");
  });

  it("JSON: parsea un objeto válido", () => {
    expect(parseParametro('{"a":1}', "JSON", {})).toEqual({ a: 1 });
  });

  it("JSON: valor corrupto (no parseable) → fallback", () => {
    expect(parseParametro("{roto", "JSON", { a: 0 })).toEqual({ a: 0 });
  });
});

describe("validarValorParametro", () => {
  it("INT sin min: acepta negativos (comportamiento sin cota)", () => {
    expect(validarValorParametro("-5", "INT")).toEqual({ ok: true, valor: "-5" });
  });

  it("INT con min: rechaza un valor por debajo del mínimo", () => {
    const r = validarValorParametro("-5", "INT", 1);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("1");
  });

  it("INT con min: acepta el valor exactamente igual al mínimo (borde inclusive)", () => {
    expect(validarValorParametro("1", "INT", 1)).toEqual({ ok: true, valor: "1" });
  });

  it("DECIMAL con min: rechaza un valor por debajo del mínimo", () => {
    const r = validarValorParametro("-0.5", "DECIMAL", 0);
    expect(r.ok).toBe(false);
  });

  it("DECIMAL con min: acepta el valor exactamente igual al mínimo", () => {
    expect(validarValorParametro("0", "DECIMAL", 0)).toEqual({ ok: true, valor: "0" });
  });

  it("cada clave del catálogo aplica su propio mínimo: DIAS_SUSPENSION=-5 se rechaza", () => {
    const catalogo = CATALOGO_PARAMETROS.find((p) => p.clave === "DIAS_SUSPENSION")!;
    const r = validarValorParametro("-5", catalogo.tipo, catalogo.min);
    expect(r.ok).toBe(false);
  });

  it("cada clave del catálogo aplica su propio mínimo: DIAS_GRACIA acepta 0 pero no -1", () => {
    const catalogo = CATALOGO_PARAMETROS.find((p) => p.clave === "DIAS_GRACIA")!;
    expect(validarValorParametro("0", catalogo.tipo, catalogo.min).ok).toBe(true);
    expect(validarValorParametro("-1", catalogo.tipo, catalogo.min).ok).toBe(false);
  });

  it("todas las claves INT del catálogo declaran min >= 0 (nunca aceptan negativos por accidente)", () => {
    for (const p of CATALOGO_PARAMETROS) {
      expect(p.min).toBeGreaterThanOrEqual(0);
    }
  });
});

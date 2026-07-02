import { describe, it, expect } from "vitest";
import { parseParametro } from "./parametros-parse";

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

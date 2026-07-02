import { describe, it, expect } from "vitest";
import {
  calcularCostoTotalMateriales,
  validarCantidadMaterial,
  aplicarPresetNota,
} from "./ot-materiales";

describe("calcularCostoTotalMateriales", () => {
  it("suma cantidad * costo_unitario de cada línea", () => {
    const total = calcularCostoTotalMateriales([
      { cantidad: 2, costo_unitario: 1000 },
      { cantidad: 5, costo_unitario: 200 },
    ]);
    expect(total).toBe(3000);
  });

  it("trata costo_unitario null como $0 sin romper la suma", () => {
    const total = calcularCostoTotalMateriales([
      { cantidad: 3, costo_unitario: null },
      { cantidad: 1, costo_unitario: 500 },
    ]);
    expect(total).toBe(500);
  });

  it("devuelve 0 para lista vacía", () => {
    expect(calcularCostoTotalMateriales([])).toBe(0);
  });

  it("soporta cantidades decimales (metros de cable)", () => {
    const total = calcularCostoTotalMateriales([{ cantidad: 2.5, costo_unitario: 100 }]);
    expect(total).toBe(250);
  });
});

describe("validarCantidadMaterial", () => {
  it("rechaza cantidad <= 0", () => {
    expect(validarCantidadMaterial(0, "unidad").valido).toBe(false);
    expect(validarCantidadMaterial(-1, "unidad").valido).toBe(false);
  });

  it("rechaza cantidad no finita", () => {
    expect(validarCantidadMaterial(NaN, "unidad").valido).toBe(false);
  });

  it("rechaza decimales para unidades de a uno", () => {
    const r = validarCantidadMaterial(1.5, "unidad");
    expect(r.valido).toBe(false);
    expect(r.error).toMatch(/no admite decimales/);
  });

  it("acepta enteros para unidades de a uno", () => {
    expect(validarCantidadMaterial(3, "unidad").valido).toBe(true);
  });

  it("acepta decimales para unidad 'metros'", () => {
    expect(validarCantidadMaterial(2.5, "metros").valido).toBe(true);
  });

  it("es insensible a mayúsculas/espacios en la unidad", () => {
    expect(validarCantidadMaterial(2.5, " Metros ").valido).toBe(true);
  });
});

describe("aplicarPresetNota", () => {
  it("appendea el preset a un textarea vacío", () => {
    expect(aplicarPresetNota("", "Cliente ausente")).toBe("Cliente ausente");
  });

  it("appendea el preset en una nueva línea si ya hay texto", () => {
    expect(aplicarPresetNota("Se revisó el panel", "Batería reemplazada")).toBe(
      "Se revisó el panel\nBatería reemplazada"
    );
  });

  it("no duplica el mismo preset si ya está presente", () => {
    const actual = "Cliente ausente";
    expect(aplicarPresetNota(actual, "Cliente ausente")).toBe(actual);
  });

  it("preserva texto editado a mano entre presets", () => {
    let notas = aplicarPresetNota("", "Falso contacto");
    notas += " — revisar cableado";
    notas = aplicarPresetNota(notas, "Se probó con el cliente");
    expect(notas).toBe("Falso contacto — revisar cableado\nSe probó con el cliente");
  });

  it("ignora presets vacíos", () => {
    expect(aplicarPresetNota("algo", "   ")).toBe("algo");
  });
});

import { describe, it, expect } from "vitest";
import { esCampoPerfil, formatOrdenLegible, CAMPO_LABEL, CAMPO_ORDEN_AVISOS } from "./solicitudes-cambio";

describe("esCampoPerfil", () => {
  it("nombre/telefono/email se auto-aplican en Perfil", () => {
    expect(esCampoPerfil("nombre")).toBe(true);
    expect(esCampoPerfil("telefono")).toBe(true);
    expect(esCampoPerfil("email")).toBe(true);
  });
  it("orden_avisos NO se auto-aplica (lo aplica el admin en SoftGuard)", () => {
    expect(esCampoPerfil(CAMPO_ORDEN_AVISOS)).toBe(false);
    expect(esCampoPerfil("cualquier_otro")).toBe(false);
  });
});

describe("formatOrdenLegible", () => {
  it("numera y agrega teléfono + rol", () => {
    const txt = formatOrdenLegible([
      { nombre: "Juan Pérez", telefono: "3436575372", rol: "Titular" },
      { nombre: "María López", telefono: "3434445566", rol: null },
    ]);
    expect(txt).toBe("1. Juan Pérez · 3436575372 · Titular\n2. María López · 3434445566");
  });

  it("tolera nombre vacío y sin teléfono/rol", () => {
    const txt = formatOrdenLegible([{ nombre: "  ", telefono: null, rol: null }]);
    expect(txt).toBe("1. Sin nombre");
  });

  it("una línea por contacto (orden preservado)", () => {
    const txt = formatOrdenLegible([
      { nombre: "A" },
      { nombre: "B" },
      { nombre: "C" },
    ]);
    expect(txt).toBe("1. A\n2. B\n3. C");
  });
});

describe("CAMPO_LABEL", () => {
  it("incluye la etiqueta de orden de avisos", () => {
    expect(CAMPO_LABEL[CAMPO_ORDEN_AVISOS]).toBe("Orden de avisos");
    expect(CAMPO_LABEL.telefono).toBe("Teléfono");
  });
});

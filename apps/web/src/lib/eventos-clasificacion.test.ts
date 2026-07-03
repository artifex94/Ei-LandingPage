import { describe, it, expect } from "vitest";
import { clasificarCodigo, protocoloParaClasificacion, type TipoDia } from "./eventos-clasificacion";

describe("clasificarCodigo", () => {
  it("clasifica los códigos Contact ID por rango", () => {
    expect(clasificarCodigo("E100")).toBe("medica");
    expect(clasificarCodigo("E120")).toBe("violencia");
    expect(clasificarCodigo("E110")).toBe("fuego");
    expect(clasificarCodigo("E130")).toBe("intrusion");
    expect(clasificarCodigo("E300")).toBe("tecnico");
    expect(clasificarCodigo("E401")).toBe("normal");
  });
});

describe("protocoloParaClasificacion", () => {
  it("médica: llamar contactos y luego emergencias", () => {
    expect(protocoloParaClasificacion("medica")).toEqual([
      { tipo: "LLAMADA_CONTACTO", etiqueta: "Llamar contactos en orden" },
      { tipo: "AVISO_POLICIA", etiqueta: "Llamar emergencias 107/911" },
    ]);
  });

  it("violencia: avisar policía primero, después contactos", () => {
    expect(protocoloParaClasificacion("violencia")).toEqual([
      { tipo: "AVISO_POLICIA", etiqueta: "Avisar policía 101" },
      { tipo: "LLAMADA_CONTACTO", etiqueta: "Llamar contactos" },
    ]);
  });

  it("fuego: contactos y luego bomberos", () => {
    expect(protocoloParaClasificacion("fuego")).toEqual([
      { tipo: "LLAMADA_CONTACTO", etiqueta: "Llamar contactos en orden" },
      { tipo: "AVISO_POLICIA", etiqueta: "Bomberos 100" },
    ]);
  });

  it("intrusión: contactos, cámaras y aviso condicional a policía", () => {
    expect(protocoloParaClasificacion("intrusion")).toEqual([
      { tipo: "LLAMADA_CONTACTO", etiqueta: "Llamar contactos en orden" },
      { tipo: "VERIFICACION_CAMARA", etiqueta: "Verificar cámaras si tiene" },
      { tipo: "AVISO_POLICIA", etiqueta: "Si se confirma, avisar 101" },
    ]);
  });

  it("técnico y normal: un solo paso genérico de registro", () => {
    expect(protocoloParaClasificacion("tecnico")).toEqual([
      { tipo: "OTRO", etiqueta: "Registrar gestión si corresponde" },
    ]);
    expect(protocoloParaClasificacion("normal")).toEqual([
      { tipo: "OTRO", etiqueta: "Registrar gestión si corresponde" },
    ]);
  });

  it("vacío: sin pasos (no hay evento que gestionar)", () => {
    expect(protocoloParaClasificacion("vacio")).toEqual([]);
  });

  it("cubre las 7 clasificaciones posibles sin lanzar", () => {
    const todas: TipoDia[] = ["medica", "violencia", "fuego", "intrusion", "tecnico", "normal", "vacio"];
    for (const t of todas) {
      expect(() => protocoloParaClasificacion(t)).not.toThrow();
    }
  });
});

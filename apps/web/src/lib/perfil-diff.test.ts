import { describe, it, expect } from "vitest";
import { difCamposPerfil } from "./perfil-diff";

describe("difCamposPerfil", () => {
  it("sin cambios → objeto vacío", () => {
    const perfil = { nombre: "Juan", dni: "12345678", telefono: "+549111", email: "j@x.com" };
    expect(difCamposPerfil(perfil, { ...perfil })).toEqual({});
  });

  it("detecta cambio de nombre con antes/después visibles", () => {
    const diff = difCamposPerfil(
      { nombre: "Juan", dni: null, telefono: null, email: null },
      { nombre: "Juan Pérez", dni: null, telefono: null, email: null }
    );
    expect(diff).toEqual({ nombre: { antes: "Juan", despues: "Juan Pérez" } });
  });

  it("enmascara el DNI: nunca expone el valor viejo ni el nuevo", () => {
    const diff = difCamposPerfil(
      { nombre: "Juan", dni: "12345678", telefono: null, email: null },
      { nombre: "Juan", dni: "87654321", telefono: null, email: null }
    );
    expect(diff).toEqual({ dni: "modificado" });
    expect(JSON.stringify(diff)).not.toContain("12345678");
    expect(JSON.stringify(diff)).not.toContain("87654321");
  });

  it("detecta múltiples campos cambiados a la vez", () => {
    const diff = difCamposPerfil(
      { nombre: "Juan", dni: "12345678", telefono: "+5491111111", email: "a@x.com" },
      { nombre: "Juan", dni: "12345678", telefono: "+5492222222", email: "b@x.com" }
    );
    expect(diff).toEqual({
      telefono: { antes: "+5491111111", despues: "+5492222222" },
      email: { antes: "a@x.com", despues: "b@x.com" },
    });
  });

  it("trata undefined y null como equivalentes (sin cambio)", () => {
    const diff = difCamposPerfil(
      { nombre: "Juan", dni: undefined, telefono: null, email: undefined },
      { nombre: "Juan", dni: null, telefono: undefined, email: null }
    );
    expect(diff).toEqual({});
  });

  it("detecta alta de un campo antes vacío", () => {
    const diff = difCamposPerfil(
      { nombre: "Juan", telefono: null },
      { nombre: "Juan", telefono: "+5491111111" }
    );
    expect(diff).toEqual({ telefono: { antes: null, despues: "+5491111111" } });
  });
});

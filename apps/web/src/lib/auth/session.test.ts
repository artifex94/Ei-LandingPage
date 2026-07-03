import { describe, it, expect } from "vitest";
import { debeAplicarImpersonacion } from "./session";
import type { PayloadImpersonacion } from "./impersonacion";

const AHORA = Date.now();
const ADMIN_ID = "22222222-2222-2222-2222-222222222222";
const OTRO_ADMIN_ID = "33333333-3333-3333-3333-333333333333";

function payload(overrides: Partial<PayloadImpersonacion> = {}): PayloadImpersonacion {
  return {
    perfilId: "11111111-1111-1111-1111-111111111111",
    adminId: ADMIN_ID,
    adminNombre: "Ramiro",
    exp: AHORA + 45 * 60 * 1000,
    ...overrides,
  };
}

const CLIENTE = { rol: "CLIENTE" as const };

describe("debeAplicarImpersonacion", () => {
  it("rechaza cuando el token fue firmado para OTRO admin (token migra entre admins)", () => {
    const resultado = debeAplicarImpersonacion({
      realPerfil: { id: OTRO_ADMIN_ID },
      payload: payload({ adminId: ADMIN_ID }),
      target: CLIENTE,
      ahora: AHORA,
    });
    expect(resultado).toBe(false);
  });

  it("acepta cuando el admin real coincide con el que firmó el token y el target es CLIENTE vigente", () => {
    const resultado = debeAplicarImpersonacion({
      realPerfil: { id: ADMIN_ID },
      payload: payload({ adminId: ADMIN_ID }),
      target: CLIENTE,
      ahora: AHORA,
    });
    expect(resultado).toBe(true);
  });

  it("rechaza cuando el target ya no existe o no es CLIENTE", () => {
    expect(
      debeAplicarImpersonacion({
        realPerfil: { id: ADMIN_ID },
        payload: payload({ adminId: ADMIN_ID }),
        target: null,
        ahora: AHORA,
      }),
    ).toBe(false);

    expect(
      debeAplicarImpersonacion({
        realPerfil: { id: ADMIN_ID },
        payload: payload({ adminId: ADMIN_ID }),
        target: { rol: "ADMIN" },
        ahora: AHORA,
      }),
    ).toBe(false);
  });

  it("rechaza cuando el token ya venció", () => {
    const resultado = debeAplicarImpersonacion({
      realPerfil: { id: ADMIN_ID },
      payload: payload({ adminId: ADMIN_ID, exp: AHORA - 1 }),
      target: CLIENTE,
      ahora: AHORA,
    });
    expect(resultado).toBe(false);
  });
});

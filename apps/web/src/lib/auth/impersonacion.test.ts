import { describe, it, expect } from "vitest";
import {
  derivarSecretImpersonacion,
  firmarTokenImpersonacionPuro,
  verificarTokenImpersonacionPuro,
  type PayloadImpersonacion,
} from "./impersonacion";

const SECRET = derivarSecretImpersonacion("secreto-de-prueba-super-largo-1234567890");
const OTRO_SECRET = derivarSecretImpersonacion("otro-secreto-completamente-distinto");

function payload(overrides: Partial<PayloadImpersonacion> = {}): PayloadImpersonacion {
  return {
    perfilId: "11111111-1111-1111-1111-111111111111",
    adminId: "22222222-2222-2222-2222-222222222222",
    adminNombre: "Ramiro",
    exp: Date.now() + 45 * 60 * 1000,
    ...overrides,
  };
}

describe("impersonacion — token firmado", () => {
  it("roundtrip: firma y verifica correctamente", () => {
    const p = payload();
    const token = firmarTokenImpersonacionPuro(p, SECRET);
    const verificado = verificarTokenImpersonacionPuro(token, SECRET);
    expect(verificado).toEqual(p);
  });

  it("rechaza un token firmado con un secret distinto", () => {
    const token = firmarTokenImpersonacionPuro(payload(), SECRET);
    expect(verificarTokenImpersonacionPuro(token, OTRO_SECRET)).toBeNull();
  });

  it("rechaza un token expirado", () => {
    const token = firmarTokenImpersonacionPuro(payload({ exp: Date.now() - 1000 }), SECRET);
    expect(verificarTokenImpersonacionPuro(token, SECRET)).toBeNull();
  });

  it("rechaza un payload adulterado (mismo formato, distinto contenido)", () => {
    const token = firmarTokenImpersonacionPuro(payload(), SECRET);
    const [payloadB64, firma] = token.split(".");
    const payloadAdulterado = Buffer.from(
      JSON.stringify(payload({ perfilId: "99999999-9999-9999-9999-999999999999" })),
      "utf8",
    ).toString("base64url");
    expect(payloadAdulterado).not.toBe(payloadB64);
    const tokenAdulterado = `${payloadAdulterado}.${firma}`;
    expect(verificarTokenImpersonacionPuro(tokenAdulterado, SECRET)).toBeNull();
  });

  it("rechaza tokens con formato inválido", () => {
    expect(verificarTokenImpersonacionPuro("no-es-un-token", SECRET)).toBeNull();
    expect(verificarTokenImpersonacionPuro("a.b.c", SECRET)).toBeNull();
    expect(verificarTokenImpersonacionPuro("", SECRET)).toBeNull();
  });

  it("rechaza una firma de largo distinto sin lanzar excepción", () => {
    const token = firmarTokenImpersonacionPuro(payload(), SECRET);
    const [payloadB64] = token.split(".");
    expect(() =>
      verificarTokenImpersonacionPuro(`${payloadB64}.corta`, SECRET),
    ).not.toThrow();
    expect(verificarTokenImpersonacionPuro(`${payloadB64}.corta`, SECRET)).toBeNull();
  });

  it("derivarSecretImpersonacion produce claves distintas para secrets distintos", () => {
    expect(derivarSecretImpersonacion("a").equals(derivarSecretImpersonacion("b"))).toBe(false);
  });

  it("derivarSecretImpersonacion es determinística", () => {
    expect(derivarSecretImpersonacion("x").equals(derivarSecretImpersonacion("x"))).toBe(true);
  });
});

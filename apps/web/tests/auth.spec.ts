/**
 * Tests unitarios para la política de autorización (src/lib/auth/policy.ts).
 * Funciones puras — no necesitan servidor ni DB.
 */
import { test, expect } from "@playwright/test";
import {
  puedeAcceder,
  rutaInicio,
  RUTA_INICIO_POR_ROL,
  type Rol,
} from "../src/lib/auth/policy";

const TODOS: Rol[] = ["ADMIN", "TECNICO", "CLIENTE"];

test.describe("puedeAcceder", () => {
  test("rol permitido → true", () => {
    expect(puedeAcceder("ADMIN", ["ADMIN"])).toBe(true);
  });

  test("rol no permitido → false", () => {
    expect(puedeAcceder("CLIENTE", ["ADMIN"])).toBe(false);
  });

  test("uno de varios roles permitidos → true", () => {
    expect(puedeAcceder("TECNICO", ["ADMIN", "TECNICO"])).toBe(true);
  });

  test("rol null → false (fail-closed)", () => {
    expect(puedeAcceder(null, TODOS)).toBe(false);
  });

  test("rol undefined → false (fail-closed)", () => {
    expect(puedeAcceder(undefined, ["ADMIN"])).toBe(false);
  });

  test("lista de permitidos vacía → siempre false (fail-closed)", () => {
    expect(puedeAcceder("ADMIN", [])).toBe(false);
  });
});

test.describe("rutaInicio", () => {
  test("cada rol tiene una ruta de inicio definida", () => {
    for (const rol of TODOS) {
      expect(RUTA_INICIO_POR_ROL[rol]).toBeTruthy();
      expect(rutaInicio(rol)).toBe(RUTA_INICIO_POR_ROL[rol]);
    }
  });

  test("rol ausente cae en /login (fail-closed)", () => {
    expect(rutaInicio(null)).toBe("/login");
    expect(rutaInicio(undefined)).toBe("/login");
  });

  test("admin y cliente no comparten landing", () => {
    expect(rutaInicio("ADMIN")).not.toBe(rutaInicio("CLIENTE"));
  });
});

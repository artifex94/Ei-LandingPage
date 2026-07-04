import { describe, expect, it } from "vitest";
import { puedeSolicitarCambio, validarMotivoCambio, MOTIVO_MAX } from "./turnos-cambio";

const ahora = new Date("2026-07-04T15:30:00"); // TZ America/Argentina/Buenos_Aires (vitest.config)

describe("puedeSolicitarCambio", () => {
  it("acepta un turno PROGRAMADO de hoy", () => {
    const r = puedeSolicitarCambio({ fecha: new Date("2026-07-04T00:00:00"), estado: "PROGRAMADO" }, ahora);
    expect(r.ok).toBe(true);
  });

  it("acepta un turno PROGRAMADO futuro", () => {
    const r = puedeSolicitarCambio({ fecha: new Date("2026-07-20T00:00:00"), estado: "PROGRAMADO" }, ahora);
    expect(r.ok).toBe(true);
  });

  it("rechaza un turno de ayer", () => {
    const r = puedeSolicitarCambio({ fecha: new Date("2026-07-03T00:00:00"), estado: "PROGRAMADO" }, ahora);
    expect(r).toEqual({ ok: false, motivo: "El turno ya pasó." });
  });

  it.each(["EN_CURSO", "COMPLETADO", "AUSENTE", "REEMPLAZADO"])(
    "rechaza un turno en estado %s",
    (estado) => {
      const r = puedeSolicitarCambio({ fecha: new Date("2026-07-20T00:00:00"), estado }, ahora);
      expect(r.ok).toBe(false);
    },
  );
});

describe("validarMotivoCambio", () => {
  it("rechaza motivos vacíos o demasiado cortos (incluso con espacios)", () => {
    expect(validarMotivoCambio("").ok).toBe(false);
    expect(validarMotivoCambio("   x   ").ok).toBe(false);
  });

  it("acepta un motivo razonable", () => {
    expect(validarMotivoCambio("Tengo turno médico ese día").ok).toBe(true);
  });

  it("rechaza motivos que exceden el máximo", () => {
    expect(validarMotivoCambio("a".repeat(MOTIVO_MAX + 1)).ok).toBe(false);
  });
});

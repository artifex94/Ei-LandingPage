import { describe, it, expect } from "vitest";
import { decidirCandidatoSuspension } from "./candidato-suspension";

describe("decidirCandidatoSuspension", () => {
  it("sin candidato abierto y DPD por debajo del umbral: SIN_CAMBIOS", () => {
    const decision = decidirCandidatoSuspension(10, 15000, 15, null);
    expect(decision).toEqual({ tipo: "SIN_CAMBIOS" });
  });

  it("sin candidato abierto y DPD >= umbral con deuda: CREAR", () => {
    const decision = decidirCandidatoSuspension(20, 15000, 15, null);
    expect(decision).toEqual({ tipo: "CREAR", dpd: 20, deuda_total: 15000 });
  });

  it("DPD >= umbral pero sin deuda (0): no crea (deuda es requisito)", () => {
    const decision = decidirCandidatoSuspension(20, 0, 15, null);
    expect(decision).toEqual({ tipo: "SIN_CAMBIOS" });
  });

  it("con candidato abierto y mismos valores: SIN_CAMBIOS (idempotente)", () => {
    const decision = decidirCandidatoSuspension(20, 15000, 15, {
      id: "cand-1",
      dpd: 20,
      deuda_total: 15000,
    });
    expect(decision).toEqual({ tipo: "SIN_CAMBIOS" });
  });

  it("con candidato abierto y el DPD avanzó: ACTUALIZAR", () => {
    const decision = decidirCandidatoSuspension(35, 15000, 15, {
      id: "cand-1",
      dpd: 20,
      deuda_total: 15000,
    });
    expect(decision).toEqual({ tipo: "ACTUALIZAR", id: "cand-1", dpd: 35, deuda_total: 15000 });
  });

  it("con candidato abierto y la deuda aumentó (nuevo mes vencido): ACTUALIZAR", () => {
    const decision = decidirCandidatoSuspension(20, 30000, 15, {
      id: "cand-1",
      dpd: 20,
      deuda_total: 15000,
    });
    expect(decision).toEqual({ tipo: "ACTUALIZAR", id: "cand-1", dpd: 20, deuda_total: 30000 });
  });

  it("con candidato abierto y la cuenta saldó toda la deuda: CERRAR_PAGO_RECIBIDO", () => {
    const decision = decidirCandidatoSuspension(0, 0, 15, {
      id: "cand-1",
      dpd: 20,
      deuda_total: 15000,
    });
    expect(decision).toEqual({ tipo: "CERRAR_PAGO_RECIBIDO", id: "cand-1" });
  });

  it("con candidato abierto, DPD bajo el umbral pero deuda residual: no cierra (queda para condonar a mano)", () => {
    const decision = decidirCandidatoSuspension(5, 5000, 15, {
      id: "cand-1",
      dpd: 20,
      deuda_total: 15000,
    });
    expect(decision).toEqual({ tipo: "SIN_CAMBIOS" });
  });
});

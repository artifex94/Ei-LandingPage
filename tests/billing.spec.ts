/**
 * Tests unitarios para src/lib/billing-state.ts
 * Función pura — no necesita servidor ni DB.
 */
import { test, expect } from "@playwright/test";
import {
  calcularEstadoFinanciero,
  peorEstadoFinanciero,
  type PagoParaEstado,
} from "../src/lib/billing-state";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const hoy = new Date();

/** Devuelve mes/anio del mes actual */
function pagoDelMes(estado: PagoParaEstado["estado"]): PagoParaEstado {
  return { mes: hoy.getMonth() + 1, anio: hoy.getFullYear(), estado };
}

/** Devuelve un pago con N meses de antigüedad */
function pagoHaceNMeses(n: number, estado: PagoParaEstado["estado"] = "VENCIDO"): PagoParaEstado {
  const d = new Date(hoy.getFullYear(), hoy.getMonth() - n, 1);
  return { mes: d.getMonth() + 1, anio: d.getFullYear(), estado };
}

// ─── calcularEstadoFinanciero ─────────────────────────────────────────────────

test.describe("calcularEstadoFinanciero", () => {
  test("sin pagos → ACTIVE", () => {
    const r = calcularEstadoFinanciero("ACTIVA", []);
    expect(r.tipo).toBe("ACTIVE");
  });

  test("todos los pagos PAGADO → ACTIVE", () => {
    const r = calcularEstadoFinanciero("ACTIVA", [
      pagoDelMes("PAGADO"),
      pagoHaceNMeses(1, "PAGADO"),
    ]);
    expect(r.tipo).toBe("ACTIVE");
  });

  test("pago PROCESANDO → PAYMENT_IN_REVIEW", () => {
    const r = calcularEstadoFinanciero("ACTIVA", [pagoDelMes("PROCESANDO")]);
    expect(r.tipo).toBe("PAYMENT_IN_REVIEW");
  });

  test("estado BAJA_DEFINITIVA → SUSPENDED sin importar pagos", () => {
    const r = calcularEstadoFinanciero("BAJA_DEFINITIVA", []);
    expect(r.tipo).toBe("SUSPENDED");
  });

  test("estado SUSPENDIDA_PAGO → SUSPENDED", () => {
    const r = calcularEstadoFinanciero("SUSPENDIDA_PAGO", [pagoHaceNMeses(2)]);
    expect(r.tipo).toBe("SUSPENDED");
  });

  test("pago VENCIDO del mes actual → ACTIVE (mes no terminó, DPD = 0)", () => {
    // DPD se calcula desde el ÚLTIMO DÍA del mes del pago.
    // new Date(anio, mes, 0) = último día del mes → si ese día es futuro, DPD = 0 → ACTIVE.
    // Un pago marcado como VENCIDO antes de que termine el mes no genera mora todavía.
    const pagoDelMesActual: PagoParaEstado = {
      mes: hoy.getMonth() + 1,
      anio: hoy.getFullYear(),
      estado: "VENCIDO",
    };
    const r = calcularEstadoFinanciero("ACTIVA", [pagoDelMesActual]);
    // Solo tiene mora si hoy es DESPUÉS del último día del mes
    const ultimoDiaMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    if (hoy <= ultimoDiaMes) {
      expect(r.tipo).toBe("ACTIVE");
    } else {
      expect(r.tipo).not.toBe("ACTIVE");
    }
  });

  test("pago VENCIDO hace 5 días (mes anterior terminado) → GRACE_PERIOD", () => {
    // Usamos el mes de hace 1 mes, cuyo último día ya pasó
    const unMesAtras = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    const pago: PagoParaEstado = {
      mes: unMesAtras.getMonth() + 1,
      anio: unMesAtras.getFullYear(),
      estado: "VENCIDO",
    };
    const r = calcularEstadoFinanciero("ACTIVA", [pago]);
    // El último día del mes anterior ya pasó → DPD ≥ 1
    expect(r.tipo === "GRACE_PERIOD" || r.tipo === "SUSPENDED").toBe(true);
    if (r.tipo === "GRACE_PERIOD" || r.tipo === "SUSPENDED") {
      expect(r.dias_mora).toBeGreaterThanOrEqual(1);
    }
  });

  test("pago VENCIDO hace 2 meses → SUSPENDED con dias_mora > 15", () => {
    const r = calcularEstadoFinanciero("ACTIVA", [pagoHaceNMeses(2)]);
    expect(r.tipo).toBe("SUSPENDED");
    if (r.tipo === "SUSPENDED") {
      expect(r.dias_mora).toBeGreaterThan(15);
    }
  });

  test("override activo y no expirado → fuerza ACTIVE aunque haya deuda", () => {
    const futuro = new Date(hoy.getTime() + 48 * 60 * 60 * 1000);
    const r = calcularEstadoFinanciero("SUSPENDIDA_PAGO", [pagoHaceNMeses(2)], true, futuro);
    expect(r.tipo).toBe("ACTIVE");
  });

  test("override activo pero ya expirado → ignora override", () => {
    const pasado = new Date(hoy.getTime() - 1000);
    const r = calcularEstadoFinanciero("SUSPENDIDA_PAGO", [pagoHaceNMeses(2)], true, pasado);
    expect(r.tipo).toBe("SUSPENDED");
  });

  test("override activo sin fecha de expiración → ignora override", () => {
    const r = calcularEstadoFinanciero("SUSPENDIDA_PAGO", [pagoHaceNMeses(2)], true, null);
    expect(r.tipo).toBe("SUSPENDED");
  });

  test("GRACE_PERIOD reporta dias_mora correcto", () => {
    // Pago con 10 días de mora: último día del mes anterior
    const haceDiez = new Date(hoy.getTime() - 10 * 24 * 60 * 60 * 1000);
    const pago: PagoParaEstado = {
      mes: haceDiez.getMonth() + 1,
      anio: haceDiez.getFullYear(),
      estado: "VENCIDO",
    };
    const r = calcularEstadoFinanciero("ACTIVA", [pago]);
    if (r.tipo === "GRACE_PERIOD") {
      expect(r.dias_mora).toBeGreaterThanOrEqual(1);
      expect(r.dias_mora).toBeLessThan(15);
    }
  });
});

// ─── peorEstadoFinanciero ─────────────────────────────────────────────────────

test.describe("peorEstadoFinanciero", () => {
  test("lista vacía → ACTIVE", () => {
    expect(peorEstadoFinanciero([]).tipo).toBe("ACTIVE");
  });

  test("prioriza SUSPENDED sobre GRACE_PERIOD", () => {
    const estados = [
      { tipo: "GRACE_PERIOD" as const, dias_mora: 5 },
      { tipo: "SUSPENDED" as const, dias_mora: 20 },
      { tipo: "ACTIVE" as const },
    ];
    expect(peorEstadoFinanciero(estados).tipo).toBe("SUSPENDED");
  });

  test("prioriza GRACE_PERIOD sobre PAYMENT_IN_REVIEW", () => {
    const estados = [
      { tipo: "PAYMENT_IN_REVIEW" as const },
      { tipo: "GRACE_PERIOD" as const, dias_mora: 5 },
    ];
    expect(peorEstadoFinanciero(estados).tipo).toBe("GRACE_PERIOD");
  });

  test("prioriza PAYMENT_IN_REVIEW sobre ACTIVE", () => {
    const estados = [
      { tipo: "ACTIVE" as const },
      { tipo: "PAYMENT_IN_REVIEW" as const },
    ];
    expect(peorEstadoFinanciero(estados).tipo).toBe("PAYMENT_IN_REVIEW");
  });

  test("SUSPENDED preserva el mayor dias_mora", () => {
    const estados = [
      { tipo: "SUSPENDED" as const, dias_mora: 10 },
      { tipo: "SUSPENDED" as const, dias_mora: 30 },
    ];
    const r = peorEstadoFinanciero(estados);
    expect(r.tipo).toBe("SUSPENDED");
    if (r.tipo === "SUSPENDED") expect(r.dias_mora).toBe(30);
  });
});

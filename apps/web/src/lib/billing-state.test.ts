import { describe, it, expect, afterEach, vi } from "vitest";
import { calcularEstadoFinanciero } from "./billing-state";

describe("calcularEstadoFinanciero", () => {
  afterEach(() => vi.useRealTimers());

  it("sin config: se comporta igual que antes (DIAS_GRACIA=1, DIAS_SUSPENSION=15)", () => {
    vi.useFakeTimers().setSystemTime(new Date(2026, 5, 20)); // 20/06/2026

    // Pago vencido de mayo (vence 31/05) → 20 días de atraso → SUSPENDED (>= 15)
    const suspendido = calcularEstadoFinanciero("ACTIVA", [{ estado: "VENCIDO", mes: 5, anio: 2026 }]);
    expect(suspendido).toEqual({ tipo: "SUSPENDED", dias_mora: 20 });

    // Pago vencido de junio (vence 30/06) → sin atraso todavía → ACTIVE
    const alDia = calcularEstadoFinanciero("ACTIVA", [{ estado: "PENDIENTE", mes: 6, anio: 2026 }]);
    expect(alDia).toEqual({ tipo: "ACTIVE" });
  });

  it("con config custom: los umbrales pasados por parámetro reemplazan el default", () => {
    vi.useFakeTimers().setSystemTime(new Date(2026, 5, 20)); // 20/06/2026

    // 20 días de atraso: con diasSuspension=25 NO debería suspender (default 15 sí lo haría).
    const config = { diasGracia: 5, diasSuspension: 25 };
    const estado = calcularEstadoFinanciero("ACTIVA", [{ estado: "VENCIDO", mes: 5, anio: 2026 }], false, null, config);
    expect(estado).toEqual({ tipo: "GRACE_PERIOD", dias_mora: 20 });
  });

  it("con config parcial (solo diasGracia): diasSuspension sigue usando el default", () => {
    vi.useFakeTimers().setSystemTime(new Date(2026, 5, 20));

    const estado = calcularEstadoFinanciero(
      "ACTIVA",
      [{ estado: "VENCIDO", mes: 5, anio: 2026 }],
      false,
      null,
      { diasGracia: 10 },
    );
    // 20 días de atraso >= DIAS_SUSPENSION default (15) → sigue suspendiendo igual.
    expect(estado).toEqual({ tipo: "SUSPENDED", dias_mora: 20 });
  });
});

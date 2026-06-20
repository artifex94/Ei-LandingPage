import { describe, it, expect } from "vitest";
import { resumenDeudaCuentas } from "./billing-deuda";

describe("resumenDeudaCuentas", () => {
  it("suma la deuda, ordena los meses y calcula el próximo vencimiento", () => {
    const r = resumenDeudaCuentas([
      { mes: 5, anio: 2026, importe: 15000, estado: "VENCIDO" },
      { mes: 4, anio: 2026, importe: 15000, estado: "VENCIDO" },
      { mes: 6, anio: 2026, importe: 12000, estado: "PAGADO" }, // se ignora
    ]);

    expect(r.deudaTotal).toBe(30000);
    expect(r.mesesAdeudados).toEqual([
      { mes: 4, anio: 2026, importe: 15000 },
      { mes: 5, anio: 2026, importe: 15000 },
    ]);
    // próximo vto = último día de abril 2026 (impago más antiguo)
    expect(r.proximoVtoISO).not.toBeNull();
    expect(new Date(r.proximoVtoISO!).getMonth()).toBe(3); // abril (0-indexed)
    expect(r.diasMora).toBeGreaterThan(0); // abril 2026 ya venció
  });

  it("sin impagos → todo en cero / al día", () => {
    const r = resumenDeudaCuentas([{ mes: 6, anio: 2026, importe: 15000, estado: "PAGADO" }]);
    expect(r).toEqual({ deudaTotal: 0, mesesAdeudados: [], proximoVtoISO: null, diasMora: 0 });
  });

  it("ignora PROCESANDO y PAGADO; cuenta PENDIENTE y VENCIDO", () => {
    const r = resumenDeudaCuentas([
      { mes: 6, anio: 2026, importe: 15000, estado: "PROCESANDO" },
      { mes: 5, anio: 2026, importe: 15000, estado: "PENDIENTE" },
    ]);
    expect(r.deudaTotal).toBe(15000);
    expect(r.mesesAdeudados).toHaveLength(1);
  });
});

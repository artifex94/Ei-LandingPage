import { describe, it, expect } from "vitest";
import {
  calcularLiquidez,
  calcularAging,
  calcularTasaCobranza,
  type PagoParaLiquidez,
  type PagoImpagoParaAging,
} from "./metricas-financieras";

describe("calcularTasaCobranza", () => {
  it("calcula % pagado sobre generado por mes", () => {
    const r = calcularTasaCobranza([
      {
        mes: 5,
        anio: 2026,
        pagos: [
          { estado: "PAGADO", importe: 15000 },
          { estado: "PAGADO", importe: 15000 },
          { estado: "VENCIDO", importe: 10000 },
        ],
      },
    ]);
    expect(r).toHaveLength(1);
    expect(r[0].generado).toBe(40000);
    expect(r[0].pagado).toBe(30000);
    expect(r[0].tasaPct).toBe(75);
  });

  it("mes sin pagos generados → tasaPct 0, no NaN ni división por cero", () => {
    const r = calcularTasaCobranza([{ mes: 3, anio: 2026, pagos: [] }]);
    expect(r[0].generado).toBe(0);
    expect(r[0].pagado).toBe(0);
    expect(r[0].tasaPct).toBe(0);
    expect(Number.isNaN(r[0].tasaPct)).toBe(false);
  });

  it("preserva mes/anio y procesa varios meses en orden", () => {
    const r = calcularTasaCobranza([
      { mes: 1, anio: 2026, pagos: [{ estado: "PAGADO", importe: 100 }] },
      { mes: 2, anio: 2026, pagos: [] },
    ]);
    expect(r.map((m) => `${m.mes}/${m.anio}`)).toEqual(["1/2026", "2/2026"]);
    expect(r[0].tasaPct).toBe(100);
    expect(r[1].tasaPct).toBe(0);
  });
});

describe("calcularLiquidez", () => {
  // "ahora" fijo: martes 2 de julio 2026 (coincide con la fecha real de referencia del proyecto).
  const ahora = new Date(2026, 6, 2, 15, 0, 0);

  const pagoBase: Omit<PagoParaLiquidez, "acreditado_en" | "estado" | "importe"> = {
    mes: 7,
    anio: 2026,
  };

  it("cobradoSemana suma solo lo acreditado en los últimos 7 días", () => {
    const pagos: PagoParaLiquidez[] = [
      { ...pagoBase, estado: "PAGADO", importe: 15000, acreditado_en: new Date(2026, 6, 1) }, // ayer, dentro
      { ...pagoBase, estado: "PAGADO", importe: 20000, acreditado_en: new Date(2026, 5, 26) }, // hace 7 días, borde inclusive
      { ...pagoBase, estado: "PAGADO", importe: 99999, acreditado_en: new Date(2026, 5, 20) }, // hace 13 días, fuera
    ];
    const r = calcularLiquidez(pagos, ahora);
    expect(r.cobradoSemana).toBe(35000);
  });

  it("cobradoMes suma lo acreditado en el mes calendario de 'ahora', sin importar el período que salda", () => {
    const pagos: PagoParaLiquidez[] = [
      { mes: 6, anio: 2026, estado: "PAGADO", importe: 15000, acreditado_en: new Date(2026, 6, 1) }, // salda junio, entró en julio
      { mes: 7, anio: 2026, estado: "PAGADO", importe: 15000, acreditado_en: new Date(2026, 5, 30) }, // entró en junio → no cuenta
    ];
    const r = calcularLiquidez(pagos, ahora);
    expect(r.cobradoMes).toBe(15000);
  });

  it("pendienteMes suma solo PENDIENTE/VENCIDO/PROCESANDO del período del mes actual", () => {
    const pagos: PagoParaLiquidez[] = [
      { mes: 7, anio: 2026, estado: "PENDIENTE", importe: 10000, acreditado_en: null },
      { mes: 7, anio: 2026, estado: "VENCIDO", importe: 5000, acreditado_en: null },
      { mes: 7, anio: 2026, estado: "PROCESANDO", importe: 3000, acreditado_en: null },
      { mes: 7, anio: 2026, estado: "PAGADO", importe: 15000, acreditado_en: new Date(2026, 6, 1) },
      { mes: 6, anio: 2026, estado: "VENCIDO", importe: 8000, acreditado_en: null }, // mes anterior, no cuenta acá
    ];
    const r = calcularLiquidez(pagos, ahora);
    expect(r.pendienteMes).toBe(18000);
  });

  it("proyeccionMes = cobradoMes + pendienteMes × tasa de cobranza del trimestre previo", () => {
    // Trimestre previo a julio 2026: abril, mayo, junio 2026.
    const pagos: PagoParaLiquidez[] = [
      // Trimestre previo: 30000 generado, 15000 pagado → tasa 50%.
      { mes: 4, anio: 2026, estado: "PAGADO", importe: 15000, acreditado_en: new Date(2026, 3, 15) },
      { mes: 4, anio: 2026, estado: "VENCIDO", importe: 15000, acreditado_en: null },
      // Mes actual (julio): 20000 cobrado, 10000 pendiente.
      { mes: 7, anio: 2026, estado: "PAGADO", importe: 20000, acreditado_en: new Date(2026, 6, 1) },
      { mes: 7, anio: 2026, estado: "PENDIENTE", importe: 10000, acreditado_en: null },
    ];
    const r = calcularLiquidez(pagos, ahora);
    expect(r.cobradoMes).toBe(20000);
    expect(r.pendienteMes).toBe(10000);
    expect(r.proyeccionMes).toBe(20000 + 10000 * 0.5);
  });

  it("sin historial en el trimestre previo → tasa 0, proyección = cobradoMes (conservador, sin NaN)", () => {
    const pagos: PagoParaLiquidez[] = [
      { mes: 7, anio: 2026, estado: "PAGADO", importe: 20000, acreditado_en: new Date(2026, 6, 1) },
      { mes: 7, anio: 2026, estado: "PENDIENTE", importe: 10000, acreditado_en: null },
    ];
    const r = calcularLiquidez(pagos, ahora);
    expect(r.proyeccionMes).toBe(20000);
    expect(Number.isNaN(r.proyeccionMes)).toBe(false);
  });
});

describe("calcularAging", () => {
  // Todos los pagos vencen el último día de abril 2026 (mes=4 → new Date(2026,4,0) = 30/04/2026).
  const pagoAbril = (importe: number): PagoImpagoParaAging => ({ mes: 4, anio: 2026, importe });

  it("30 días exactos → hasta30 (borde inclusive)", () => {
    const ahora = new Date(2026, 4, 30); // 30/05/2026
    const r = calcularAging([pagoAbril(1000)], ahora);
    expect(r.hasta30).toEqual({ monto: 1000, cantidad: 1 });
    expect(r.de31a60).toEqual({ monto: 0, cantidad: 0 });
  });

  it("31 días → de31a60 (primer día del siguiente bucket)", () => {
    const ahora = new Date(2026, 4, 31); // 31/05/2026
    const r = calcularAging([pagoAbril(1000)], ahora);
    expect(r.de31a60).toEqual({ monto: 1000, cantidad: 1 });
    expect(r.hasta30).toEqual({ monto: 0, cantidad: 0 });
  });

  it("60 días exactos → de31a60 (borde inclusive)", () => {
    const ahora = new Date(2026, 5, 29); // 29/06/2026
    const r = calcularAging([pagoAbril(1000)], ahora);
    expect(r.de31a60).toEqual({ monto: 1000, cantidad: 1 });
  });

  it("61 días → de61a90", () => {
    const ahora = new Date(2026, 5, 30); // 30/06/2026
    const r = calcularAging([pagoAbril(1000)], ahora);
    expect(r.de61a90).toEqual({ monto: 1000, cantidad: 1 });
  });

  it("90 días exactos → de61a90 (borde inclusive)", () => {
    const ahora = new Date(2026, 6, 29); // 29/07/2026
    const r = calcularAging([pagoAbril(1000)], ahora);
    expect(r.de61a90).toEqual({ monto: 1000, cantidad: 1 });
  });

  it("91 días → mas90", () => {
    const ahora = new Date(2026, 6, 30); // 30/07/2026
    const r = calcularAging([pagoAbril(1000)], ahora);
    expect(r.mas90).toEqual({ monto: 1000, cantidad: 1 });
  });

  it("suma monto y cantidad de varios pagos en el mismo bucket", () => {
    const ahora = new Date(2026, 4, 30); // 30 días → hasta30
    const r = calcularAging([pagoAbril(1000), pagoAbril(2000)], ahora);
    expect(r.hasta30).toEqual({ monto: 3000, cantidad: 2 });
  });

  it("sin impagos → todos los buckets en cero", () => {
    const r = calcularAging([], new Date(2026, 6, 2));
    expect(r).toEqual({
      hasta30: { monto: 0, cantidad: 0 },
      de31a60: { monto: 0, cantidad: 0 },
      de61a90: { monto: 0, cantidad: 0 },
      mas90: { monto: 0, cantidad: 0 },
    });
  });
});

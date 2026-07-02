import { describe, it, expect } from "vitest";
import {
  parsearExtractoCSV,
  proponerMatches,
  calcularHashMovimiento,
  type PagoCandidato,
  type MovimientoConciliable,
} from "./conciliacion-bancaria";

describe("parsearExtractoCSV", () => {
  it("parsea CSV con separador coma y formato de fecha dd/mm/yyyy", () => {
    const csv = ["Fecha,Descripcion,Importe", "01/07/2026,Transferencia recibida,15000.00"].join("\n");
    const { movimientos, errores } = parsearExtractoCSV(csv);
    expect(errores).toHaveLength(0);
    expect(movimientos).toHaveLength(1);
    expect(movimientos[0].importe).toBe(15000);
    expect(movimientos[0].descripcion).toBe("Transferencia recibida");
    expect(movimientos[0].fecha.toISOString().slice(0, 10)).toBe("2026-07-01");
  });

  it("parsea CSV con separador punto y coma, columnas Crédito/Débito e importe formato AR", () => {
    const csv = [
      "Fecha;Concepto;Débito;Crédito",
      "02/07/2026;Transferencia EI-ABCDEF123456;;15.000,50",
      "03/07/2026;Pago de servicio;500,00;",
    ].join("\n");
    const { movimientos, errores } = parsearExtractoCSV(csv);
    expect(errores).toHaveLength(0);
    // La fila de débito (columna Crédito vacía → importe 0) se descarta sin error.
    expect(movimientos).toHaveLength(1);
    expect(movimientos[0].importe).toBe(15000.5);
    expect(movimientos[0].descripcion).toBe("Transferencia EI-ABCDEF123456");
  });

  it("acepta headers flexibles (Fecha Valor / Detalle / Monto) y fecha ISO yyyy-mm-dd", () => {
    const csv = ["Fecha Valor,Detalle,Monto", "2026-07-05,Transferencia,20000"].join("\n");
    const { movimientos, errores } = parsearExtractoCSV(csv);
    expect(errores).toHaveLength(0);
    expect(movimientos).toHaveLength(1);
    expect(movimientos[0].fecha.toISOString().slice(0, 10)).toBe("2026-07-05");
    expect(movimientos[0].importe).toBe(20000);
  });

  it("filtra débitos (importe <= 0) sin generar error", () => {
    const csv = [
      "Fecha,Descripcion,Importe",
      "01/07/2026,Débito varios,-500",
      "01/07/2026,Cobro tarjeta,0",
      "01/07/2026,Transferencia recibida,10000",
    ].join("\n");
    const { movimientos, errores } = parsearExtractoCSV(csv);
    expect(errores).toHaveLength(0);
    expect(movimientos).toHaveLength(1);
    expect(movimientos[0].descripcion).toBe("Transferencia recibida");
  });

  it("reporta filas rotas (fecha inválida, importe inválido, columnas insuficientes) sin abortar el resto", () => {
    const csv = [
      "Fecha,Descripcion,Importe",
      "31/02/2026,Fecha inexistente,1000",
      "01/07/2026,Importe roto,abc",
      "01/07/2026,Sin columnas",
      "01/07/2026,Transferencia OK,5000",
    ].join("\n");
    const { movimientos, errores } = parsearExtractoCSV(csv);
    expect(movimientos).toHaveLength(1);
    expect(movimientos[0].descripcion).toBe("Transferencia OK");
    expect(errores).toHaveLength(3);
  });

  it("sin columnas detectables devuelve error y ningún movimiento", () => {
    const csv = ["A,B,C", "1,2,3"].join("\n");
    const { movimientos, errores } = parsearExtractoCSV(csv);
    expect(movimientos).toHaveLength(0);
    expect(errores.length).toBeGreaterThan(0);
  });

  it("calcularHashMovimiento es determinístico para la misma fecha/importe/descripción", () => {
    const fecha = new Date(Date.UTC(2026, 6, 1));
    const h1 = calcularHashMovimiento(fecha, 15000, "Transferencia recibida");
    const h2 = calcularHashMovimiento(fecha, 15000, "Transferencia recibida");
    const h3 = calcularHashMovimiento(fecha, 15000.01, "Transferencia recibida");
    expect(h1).toBe(h2);
    expect(h1).not.toBe(h3);
  });

  it("calcularHashMovimiento con distinta 'ocurrencia' da hashes distintos (desambigua duplicados)", () => {
    const fecha = new Date(Date.UTC(2026, 6, 1));
    const h0 = calcularHashMovimiento(fecha, 15000, "Transferencia recibida", 0);
    const h1 = calcularHashMovimiento(fecha, 15000, "Transferencia recibida", 1);
    expect(h0).not.toBe(h1);
  });

  it("respeta comillas dobles: un separador dentro de un campo entrecomillado no parte la fila", () => {
    const csv = [
      "Fecha,Descripcion,Importe",
      '01/07/2026,"Transferencia, ref. varios",15000.00',
    ].join("\n");
    const { movimientos, errores } = parsearExtractoCSV(csv);
    expect(errores).toHaveLength(0);
    expect(movimientos).toHaveLength(1);
    expect(movimientos[0].descripcion).toBe("Transferencia, ref. varios");
    expect(movimientos[0].importe).toBe(15000);
  });

  it("respeta comillas escapadas (\"\") dentro de un campo entrecomillado", () => {
    const csv = [
      "Fecha,Descripcion,Importe",
      '01/07/2026,"Pago, ref. ""EI-ABCDEF123456""",15000.00',
    ].join("\n");
    const { movimientos, errores } = parsearExtractoCSV(csv);
    expect(errores).toHaveLength(0);
    expect(movimientos).toHaveLength(1);
    expect(movimientos[0].descripcion).toBe('Pago, ref. "EI-ABCDEF123456"');
  });

  it("dos filas idénticas (mismo día, importe y descripción) generan hashes distintos y no se pierden por idempotencia", () => {
    const csv = [
      "Fecha,Descripcion,Importe",
      "01/07/2026,Transferencia recibida,15000.00",
      "01/07/2026,Transferencia recibida,15000.00",
    ].join("\n");
    const { movimientos, errores } = parsearExtractoCSV(csv);
    expect(errores).toHaveLength(0);
    expect(movimientos).toHaveLength(2);
    expect(movimientos[0].hash).not.toBe(movimientos[1].hash);
  });

  it("re-parsear el mismo texto produce exactamente los mismos hashes (idempotencia estable entre re-imports)", () => {
    const csv = [
      "Fecha,Descripcion,Importe",
      "01/07/2026,Transferencia recibida,15000.00",
      "01/07/2026,Transferencia recibida,15000.00",
      "01/07/2026,Otra transferencia,5000.00",
    ].join("\n");
    const r1 = parsearExtractoCSV(csv);
    const r2 = parsearExtractoCSV(csv);
    expect(r2.movimientos.map((m) => m.hash)).toEqual(r1.movimientos.map((m) => m.hash));
  });
});

describe("proponerMatches", () => {
  const movimiento = (over: Partial<MovimientoConciliable> = {}): MovimientoConciliable => ({
    id: "mov-1",
    fecha: new Date(Date.UTC(2026, 6, 1)),
    importe: 15000,
    descripcion: "Transferencia recibida",
    ...over,
  });

  const pago = (over: Partial<PagoCandidato> = {}): PagoCandidato => ({
    id: "pago-1",
    importe: 15000,
    ref_externa: null,
    updated_at: new Date(Date.UTC(2026, 6, 1)),
    ...over,
  });

  it("clasifica confiable por ref_externa cuando el importe SÍ coincide, aunque la fecha esté lejana", () => {
    const mov = movimiento({ descripcion: "Transferencia EI-ABCDEF123456 recibida" });
    const p = pago({ id: "pago-ref", ref_externa: "EI-ABCDEF123456", updated_at: new Date(Date.UTC(2020, 0, 1)) });

    const [resultado] = proponerMatches([mov], [p]);
    expect(resultado.clasificacion).toBe("confiable");
    expect(resultado.motivo).toBe("ref_externa");
    expect(resultado.pago_id).toBe("pago-ref");
  });

  it("ref_externa coincide pero el importe difiere: ambiguo con detalle, NO se pre-tilda como confiable", () => {
    const mov = movimiento({ descripcion: "Transferencia EI-ABCDEF123456 recibida", importe: 15000 });
    const p = pago({ id: "pago-ref", ref_externa: "EI-ABCDEF123456", importe: 12000 });

    const [resultado] = proponerMatches([mov], [p]);
    expect(resultado.clasificacion).toBe("ambiguo");
    expect(resultado.motivo).toBe("ref_externa_importe_distinto");
    expect(resultado.pago_id).toBeNull();
    expect(resultado.candidatos).toEqual([{ pago_id: "pago-ref", importe: 12000 }]);
    expect(resultado.detalle).toContain("$15000.00");
    expect(resultado.detalle).toContain("$12000.00");
  });

  it("clasifica confiable por importe exacto cuando hay un único candidato en la ventana de ±2 días", () => {
    const mov = movimiento();
    const p = pago({ id: "pago-unico", updated_at: new Date(Date.UTC(2026, 6, 2)) }); // 1 día de diferencia

    const [resultado] = proponerMatches([mov], [p]);
    expect(resultado.clasificacion).toBe("confiable");
    expect(resultado.motivo).toBe("importe_unico");
    expect(resultado.pago_id).toBe("pago-unico");
  });

  it("clasifica ambiguo cuando hay 2+ candidatos con el mismo importe en la ventana", () => {
    const mov = movimiento();
    const p1 = pago({ id: "pago-a" });
    const p2 = pago({ id: "pago-b" });

    const [resultado] = proponerMatches([mov], [p1, p2]);
    expect(resultado.clasificacion).toBe("ambiguo");
    expect(resultado.pago_id).toBeNull();
    expect(resultado.candidatos.map((c) => c.pago_id).sort()).toEqual(["pago-a", "pago-b"]);
  });

  it("clasifica sin_match cuando no hay candidatos por importe ni por ref_externa", () => {
    const mov = movimiento({ importe: 99999 });
    const p = pago();

    const [resultado] = proponerMatches([mov], [p]);
    expect(resultado.clasificacion).toBe("sin_match");
    expect(resultado.candidatos).toHaveLength(0);
  });

  it("descarta candidatos fuera de la ventana de ±2 días aunque el importe coincida", () => {
    const mov = movimiento();
    const pFueraDeVentana = pago({ id: "pago-lejos", updated_at: new Date(Date.UTC(2026, 5, 1)) }); // 30 días antes

    const [resultado] = proponerMatches([mov], [pFueraDeVentana]);
    expect(resultado.clasificacion).toBe("sin_match");
  });
});

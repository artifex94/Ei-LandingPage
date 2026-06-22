import { describe, it, expect, afterEach, vi } from "vitest";
import { motivosDeCobranza, motivosGenerales } from "./mensajeria-motivos";

const motivos = (...args: Parameters<typeof motivosDeCobranza>) =>
  motivosDeCobranza(...args).map((m) => m.motivo);

describe("motivosDeCobranza", () => {
  afterEach(() => vi.useRealTimers());

  it("ofrece RECORDATORIO con deuda y NO ofrece VENCIMIENTO pasado el día de vto", () => {
    vi.useFakeTimers().setSystemTime(new Date(2026, 5, 20)); // 20/06, pasado el 10
    const ms = motivos("Juan", [
      { mes: 4, anio: 2026, importe: 15000, estado: "VENCIDO" },
      { mes: 6, anio: 2026, importe: 15000, estado: "PENDIENTE" }, // corriente, pero ya pasó el 10
    ]);
    expect(ms).toContain("RECORDATORIO_PAGO");
    expect(ms).not.toContain("VENCIMIENTO_PROXIMO");
    expect(ms).toContain("LIBRE");
  });

  it("ofrece VENCIMIENTO_PROXIMO solo si todavía no llegó el día de vto", () => {
    vi.useFakeTimers().setSystemTime(new Date(2026, 5, 5)); // 05/06, antes del 10
    expect(motivos("Ana", [{ mes: 6, anio: 2026, importe: 15000, estado: "PENDIENTE" }])).toContain(
      "VENCIMIENTO_PROXIMO",
    );
  });

  it("ofrece CONFIRMACION solo si está al día y el pago es reciente", () => {
    vi.useFakeTimers().setSystemTime(new Date(2026, 5, 20));
    const reciente = new Date(2026, 5, 18).toISOString();

    expect(
      motivos("Ana", [{ mes: 6, anio: 2026, importe: 15000, estado: "PAGADO", acreditadoEnISO: reciente }]),
    ).toContain("CONFIRMACION_PAGO");

    // con deuda activa NO debe ofrecer confirmación
    expect(
      motivos("Ana", [
        { mes: 6, anio: 2026, importe: 15000, estado: "PAGADO", acreditadoEnISO: reciente },
        { mes: 5, anio: 2026, importe: 15000, estado: "VENCIDO" },
      ]),
    ).not.toContain("CONFIRMACION_PAGO");
  });

  it("NO ofrece CONFIRMACION si el pago acreditado es viejo", () => {
    vi.useFakeTimers().setSystemTime(new Date(2026, 5, 20));
    const viejo = new Date(2026, 2, 1).toISOString(); // marzo, > 10 días
    expect(
      motivos("Ana", [{ mes: 3, anio: 2026, importe: 15000, estado: "PAGADO", acreditadoEnISO: viejo }]),
    ).not.toContain("CONFIRMACION_PAGO");
  });

  it("ofrece MORA_SUSPENSION (además del recordatorio) con 3+ períodos impagos", () => {
    vi.useFakeTimers().setSystemTime(new Date(2026, 5, 20));
    const ms = motivos("Juan", [
      { mes: 3, anio: 2026, importe: 15000, estado: "VENCIDO" },
      { mes: 4, anio: 2026, importe: 15000, estado: "VENCIDO" },
      { mes: 5, anio: 2026, importe: 15000, estado: "VENCIDO" },
    ]);
    expect(ms).toContain("RECORDATORIO_PAGO");
    expect(ms).toContain("MORA_SUSPENSION");
  });

  it("NO ofrece MORA_SUSPENSION con menos de 3 períodos impagos", () => {
    vi.useFakeTimers().setSystemTime(new Date(2026, 5, 20));
    const ms = motivos("Juan", [
      { mes: 4, anio: 2026, importe: 15000, estado: "VENCIDO" },
      { mes: 5, anio: 2026, importe: 15000, estado: "VENCIDO" },
    ]);
    expect(ms).toContain("RECORDATORIO_PAGO");
    expect(ms).not.toContain("MORA_SUSPENSION");
  });
});

describe("motivosGenerales (catálogo manual, no dependiente del pago)", () => {
  it("expone los mensajes de operación/relación con texto y etiqueta", () => {
    const ms = motivosGenerales("Juan");
    expect(ms.map((m) => m.motivo)).toEqual([
      "BIENVENIDA",
      "VISITA_TECNICA",
      "PRUEBA_ALARMA",
      "SIN_COMUNICACION",
      "CAMBIO_TARIFA",
      "REACTIVACION_SERVICIO",
      "ACTUALIZAR_DATOS",
      "AVISO_GENERAL",
    ]);
    expect(ms.every((m) => m.mensaje.length > 0 && m.label.length > 0)).toBe(true);
  });

  it("NO incluye motivos de cobranza ni LIBRE", () => {
    const keys = motivosGenerales("Juan").map((m) => m.motivo);
    expect(keys).not.toContain("RECORDATORIO_PAGO");
    expect(keys).not.toContain("LIBRE");
  });
});

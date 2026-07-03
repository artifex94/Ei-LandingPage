import { describe, it, expect, afterEach, vi } from "vitest";
import { motivosDeCobranza, motivosGenerales, agruparPagosPorCuenta } from "./mensajeria-motivos";

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

  it("con umbralMora custom (2) ofrece MORA_SUSPENSION antes que el default (3)", () => {
    vi.useFakeTimers().setSystemTime(new Date(2026, 5, 20));
    const pagos = [
      { mes: 4, anio: 2026, importe: 15000, estado: "VENCIDO" },
      { mes: 5, anio: 2026, importe: 15000, estado: "VENCIDO" },
    ];
    // Con el default (3) todavía no dispara (caso ya cubierto arriba).
    expect(motivosDeCobranza("Juan", pagos).map((m) => m.motivo)).not.toContain("MORA_SUSPENSION");
    // Con umbralMora=2 (parámetro configurable) sí dispara con los mismos 2 meses.
    expect(
      motivosDeCobranza("Juan", pagos, undefined, 2).map((m) => m.motivo),
    ).toContain("MORA_SUSPENSION");
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

describe("motivosDeCobranza con pagosPorCuenta (desglose multi-cuenta)", () => {
  afterEach(() => vi.useRealTimers());

  const pagosCasa = [
    { mes: 3, anio: 2026, importe: 15000, estado: "VENCIDO" },
    { mes: 4, anio: 2026, importe: 15000, estado: "VENCIDO" },
  ];
  const pagosLocal = [{ mes: 4, anio: 2026, importe: 15000, estado: "VENCIDO" }];
  const agregado = [...pagosCasa, ...pagosLocal];
  const porCuenta = [
    { etiqueta: "*Casa* (Rawson 255)", pagos: pagosCasa },
    { etiqueta: "*Local*", pagos: pagosLocal },
  ];

  it("arma el desglose por cuenta y el total del mensaje coincide con la suma del desglose", () => {
    vi.useFakeTimers().setSystemTime(new Date(2026, 5, 20));
    const recordatorio = motivosDeCobranza("Juan", agregado, porCuenta).find(
      (m) => m.motivo === "RECORDATORIO_PAGO",
    );
    expect(recordatorio).toBeDefined();
    // total agregado (45.000) == 30.000 (Casa) + 15.000 (Local)
    expect(recordatorio!.mensaje).toContain("*$45.000*");
    expect(recordatorio!.mensaje).toContain("· *Casa* (Rawson 255): $30.000 (marzo 2026, abril 2026)");
    expect(recordatorio!.mensaje).toContain("· *Local*: $15.000 (abril 2026)");
  });

  it("el desglose también viaja al aviso de mora (3+ períodos impagos)", () => {
    vi.useFakeTimers().setSystemTime(new Date(2026, 5, 20));
    const mora = motivosDeCobranza("Juan", agregado, porCuenta).find((m) => m.motivo === "MORA_SUSPENSION");
    expect(mora).toBeDefined();
    expect(mora!.mensaje).toContain("· *Casa* (Rawson 255): $30.000");
    expect(mora!.mensaje).toContain("· *Local*: $15.000");
  });

  it("una cuenta al día (solo pagos acreditados) NO aparece en el desglose", () => {
    vi.useFakeTimers().setSystemTime(new Date(2026, 5, 20));
    const alDia = {
      etiqueta: "*Local*",
      pagos: [{ mes: 5, anio: 2026, importe: 15000, estado: "PAGADO", acreditadoEnISO: new Date(2026, 5, 18).toISOString() }],
    };
    const recordatorio = motivosDeCobranza("Juan", pagosCasa, [porCuenta[0], alDia]).find(
      (m) => m.motivo === "RECORDATORIO_PAGO",
    );
    // con una sola cuenta CON deuda, el desglose queda de 1 → formato clásico sin viñetas
    expect(recordatorio!.mensaje).toBe(motivosDeCobranza("Juan", pagosCasa).find((m) => m.motivo === "RECORDATORIO_PAGO")!.mensaje);
    expect(recordatorio!.mensaje).not.toContain("*Local*");
  });

  it("sin pagosPorCuenta el mensaje es idéntico al de siempre (retrocompatibilidad)", () => {
    vi.useFakeTimers().setSystemTime(new Date(2026, 5, 20));
    const con = motivosDeCobranza("Juan", agregado, undefined);
    const sin = motivosDeCobranza("Juan", agregado);
    expect(con.map((m) => m.mensaje)).toEqual(sin.map((m) => m.mensaje));
  });

  it("el agregado sale del desglose, no del parámetro `pagos`: aunque venga desactualizado, el total refleja pagosPorCuenta", () => {
    vi.useFakeTimers().setSystemTime(new Date(2026, 5, 20));
    // `pagos` a propósito desalineado del desglose (simula un caller que se desincroniza):
    // el total del mensaje debe salir de `porCuenta`, no de este agregado viejo.
    const pagosDesactualizados = [pagosCasa[0]];
    const recordatorio = motivosDeCobranza("Juan", pagosDesactualizados, porCuenta).find(
      (m) => m.motivo === "RECORDATORIO_PAGO",
    );
    expect(recordatorio!.mensaje).toContain("*$45.000*");
  });
});

describe("agruparPagosPorCuenta", () => {
  it("agrupa SIEMPRE, sin gate por cantidad de cuentas (incluso con una sola)", () => {
    const grupos = agruparPagosPorCuenta([
      { descripcion: "Casa", calle: "Rawson 255", softguard_ref: "ESI-0175", pagos: [{ mes: 4, anio: 2026, importe: 15000, estado: "VENCIDO" }] },
    ]);
    expect(grupos).toEqual([
      { etiqueta: "*Casa* (Rawson 255)", pagos: [{ mes: 4, anio: 2026, importe: 15000, estado: "VENCIDO" }] },
    ]);
  });

  it("arma la etiqueta con etiquetaCuenta (incluye softguard_ref como fallback)", () => {
    const grupos = agruparPagosPorCuenta([
      { descripcion: null, calle: null, softguard_ref: "ESI-0175", pagos: [] },
    ]);
    expect(grupos[0].etiqueta).toBe("*ESI-0175*");
  });

  it("preserva el orden y los pagos de cada cuenta sin mutarlos", () => {
    const pagosA = [{ mes: 1, anio: 2026, importe: 1000, estado: "VENCIDO" }];
    const pagosB = [{ mes: 2, anio: 2026, importe: 2000, estado: "VENCIDO" }];
    const grupos = agruparPagosPorCuenta([
      { descripcion: "A", pagos: pagosA },
      { descripcion: "B", pagos: pagosB },
    ]);
    expect(grupos.map((g) => g.pagos)).toEqual([pagosA, pagosB]);
  });
});

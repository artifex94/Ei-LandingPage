import { describe, it, expect } from "vitest";
import { calcularMetricasDia, formatDuracion, type EventoMetrica } from "./metricas-monitoreo";

function evento(overrides: Partial<EventoMetrica>): EventoMetrica {
  return {
    estado: "NUEVO",
    fecha_evento: new Date("2026-07-02T10:00:00Z"),
    tomado_en: null,
    resuelto_en: null,
    ...overrides,
  };
}

describe("calcularMetricasDia", () => {
  it("con datos completos: cuenta atendidos/pendientes y promedia ambos tiempos", () => {
    const eventos: EventoMetrica[] = [
      evento({
        estado: "PROCESADO",
        fecha_evento: new Date("2026-07-02T10:00:00Z"),
        tomado_en: new Date("2026-07-02T10:02:00Z"), // +2 min
        resuelto_en: new Date("2026-07-02T10:12:00Z"), // +10 min
      }),
      evento({
        estado: "PROCESADO_NO_ALERTA",
        fecha_evento: new Date("2026-07-02T11:00:00Z"),
        tomado_en: new Date("2026-07-02T11:04:00Z"), // +4 min
        resuelto_en: new Date("2026-07-02T11:10:00Z"), // +6 min
      }),
    ];

    const metricas = calcularMetricasDia(eventos);

    expect(metricas.atendidos).toBe(2);
    expect(metricas.pendientes).toBe(0);
    expect(metricas.tiempoMedioTomaMs).toBe(3 * 60_000); // media de 2 y 4 min
    expect(metricas.tiempoMedioResolucionMs).toBe(8 * 60_000); // media de 10 y 6 min
  });

  it("sin timestamps (pre-migración o eventos sin tomar): medias null, todo pendiente", () => {
    const eventos: EventoMetrica[] = [
      evento({ estado: "NUEVO" }),
      evento({ estado: "EN_ESPERA" }),
    ];

    const metricas = calcularMetricasDia(eventos);

    expect(metricas.atendidos).toBe(0);
    expect(metricas.pendientes).toBe(2);
    expect(metricas.tiempoMedioTomaMs).toBeNull();
    expect(metricas.tiempoMedioResolucionMs).toBeNull();
  });

  it("mezcla: solo promedia sobre eventos con ambos timestamps presentes", () => {
    const eventos: EventoMetrica[] = [
      evento({
        estado: "PROCESADO",
        fecha_evento: new Date("2026-07-02T10:00:00Z"),
        tomado_en: new Date("2026-07-02T10:05:00Z"), // +5 min
        resuelto_en: new Date("2026-07-02T10:15:00Z"), // +10 min
      }),
      evento({
        estado: "EN_PROCESO",
        fecha_evento: new Date("2026-07-02T11:00:00Z"),
        tomado_en: new Date("2026-07-02T11:03:00Z"), // +3 min, todavía sin resolver
        resuelto_en: null,
      }),
      evento({ estado: "NUEVO" }), // sin ningún timestamp
    ];

    const metricas = calcularMetricasDia(eventos);

    expect(metricas.atendidos).toBe(1);
    expect(metricas.pendientes).toBe(2);
    expect(metricas.tiempoMedioTomaMs).toBe(4 * 60_000); // media de 5 y 3 min
    expect(metricas.tiempoMedioResolucionMs).toBe(10 * 60_000); // solo el evento resuelto
  });

  it("array vacío: no rompe, todo en 0/null", () => {
    const metricas = calcularMetricasDia([]);
    expect(metricas).toEqual({
      atendidos: 0,
      pendientes: 0,
      tiempoMedioTomaMs: null,
      tiempoMedioResolucionMs: null,
    });
  });
});

describe("formatDuracion", () => {
  it("null → '—'", () => {
    expect(formatDuracion(null)).toBe("—");
  });

  it("negativo → '—'", () => {
    expect(formatDuracion(-1000)).toBe("—");
  });

  it("menos de un minuto → segundos", () => {
    expect(formatDuracion(45_000)).toBe("45s");
  });

  it("minutos exactos", () => {
    expect(formatDuracion(4 * 60_000)).toBe("4m");
  });

  it("horas y minutos", () => {
    expect(formatDuracion(80 * 60_000)).toBe("1h 20m");
  });

  it("horas exactas sin minutos", () => {
    expect(formatDuracion(120 * 60_000)).toBe("2h");
  });
});

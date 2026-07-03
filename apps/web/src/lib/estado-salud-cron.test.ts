import { describe, it, expect } from "vitest";
import { estadoSaludCron } from "./estado-salud-cron";

describe("estadoSaludCron", () => {
  const ahora = new Date("2026-07-02T12:00:00.000Z");
  const umbralMs = 10 * 60 * 1000; // 10 min

  it("sin corridas registradas: sin_datos", () => {
    expect(estadoSaludCron(null, umbralMs, ahora)).toBe("sin_datos");
  });

  it("última corrida en ERROR (finalizada): error, incluso si fue reciente", () => {
    const ultimaCorrida = {
      estado: "ERROR" as const,
      started_at: new Date("2026-07-02T11:59:00.000Z"),
      finished_at: new Date("2026-07-02T11:59:05.000Z"),
    };
    expect(estadoSaludCron(ultimaCorrida, umbralMs, ahora)).toBe("error");
  });

  it("última corrida OK (finalizada) y dentro del umbral: ok", () => {
    const ultimaCorrida = {
      estado: "OK" as const,
      started_at: new Date("2026-07-02T11:55:00.000Z"),
      finished_at: new Date("2026-07-02T11:55:05.000Z"),
    };
    expect(estadoSaludCron(ultimaCorrida, umbralMs, ahora)).toBe("ok");
  });

  it("última corrida OK (finalizada) pero más vieja que el umbral: atrasado", () => {
    const ultimaCorrida = {
      estado: "OK" as const,
      started_at: new Date("2026-07-02T11:45:00.000Z"),
      finished_at: new Date("2026-07-02T11:45:05.000Z"),
    };
    expect(estadoSaludCron(ultimaCorrida, umbralMs, ahora)).toBe("atrasado");
  });

  it("borde exacto del umbral (antigüedad === umbralMs): todavía ok", () => {
    const ultimaCorrida = {
      estado: "OK" as const,
      started_at: new Date(ahora.getTime() - umbralMs),
      finished_at: new Date(ahora.getTime() - umbralMs + 5000),
    };
    expect(estadoSaludCron(ultimaCorrida, umbralMs, ahora)).toBe("ok");
  });

  it("borde exacto + 1 ms: pasa a atrasado", () => {
    const ultimaCorrida = {
      estado: "OK" as const,
      started_at: new Date(ahora.getTime() - umbralMs - 1),
      finished_at: new Date(ahora.getTime() - umbralMs - 1 + 5000),
    };
    expect(estadoSaludCron(ultimaCorrida, umbralMs, ahora)).toBe("atrasado");
  });

  describe("corrida en curso / colgada (finished_at null)", () => {
    // umbralMs = 10 min → umbral de colgado = max(15 min, 10min/4=2.5min) = 15 min.
    const umbralColgadoMs = 15 * 60 * 1000;

    it("en curso hace poco (sin finished_at): ok, no error — todavía puede estar corriendo", () => {
      const ultimaCorrida = { estado: "OK" as const, started_at: new Date(ahora.getTime() - 60_000), finished_at: null };
      expect(estadoSaludCron(ultimaCorrida, umbralMs, ahora)).toBe("ok");
    });

    it("arrancó hace más del umbral de colgado y nunca terminó: error (Corrida incompleta)", () => {
      const ultimaCorrida = {
        estado: "OK" as const,
        started_at: new Date(ahora.getTime() - umbralColgadoMs - 1),
        finished_at: null,
      };
      expect(estadoSaludCron(ultimaCorrida, umbralMs, ahora)).toBe("error");
    });

    it("borde exacto del umbral de colgado: todavía ok", () => {
      const ultimaCorrida = {
        estado: "OK" as const,
        started_at: new Date(ahora.getTime() - umbralColgadoMs),
        finished_at: null,
      };
      expect(estadoSaludCron(ultimaCorrida, umbralMs, ahora)).toBe("ok");
    });

    it("umbral de atraso pequeño (< 1h): el piso de 15 min rige por sobre umbralMs/4", () => {
      // umbralMs = 10 min → umbralMs/4 = 2.5 min, pero el piso de 15 min gana.
      const reciente = { estado: "OK" as const, started_at: new Date(ahora.getTime() - 10 * 60 * 1000), finished_at: null };
      // 10 min < 15 min (piso) → todavía "ok" aunque ya superó el umbralMs/4 de 2.5 min.
      expect(estadoSaludCron(reciente, umbralMs, ahora)).toBe("ok");
    });

    it("umbral de atraso grande (ej. cierre mensual, 32 días): rige umbralMs/4, no el piso de 15 min", () => {
      const umbralGrande = 32 * 24 * 60 * 60 * 1000; // 32 días → umbralMs/4 = 8 días
      const dentroDelCuarto = { estado: "OK" as const, started_at: new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000), finished_at: null };
      expect(estadoSaludCron(dentroDelCuarto, umbralGrande, ahora)).toBe("ok");

      const masAllaDelCuarto = { estado: "OK" as const, started_at: new Date(ahora.getTime() - 9 * 24 * 60 * 60 * 1000), finished_at: null };
      expect(estadoSaludCron(masAllaDelCuarto, umbralGrande, ahora)).toBe("error");
    });
  });
});

import { describe, it, expect } from "vitest";
import { estadoSaludCron } from "./estado-salud-cron";

describe("estadoSaludCron", () => {
  const ahora = new Date("2026-07-02T12:00:00.000Z");
  const umbralMs = 10 * 60 * 1000; // 10 min

  it("sin corridas registradas: sin_datos", () => {
    expect(estadoSaludCron(null, umbralMs, ahora)).toBe("sin_datos");
  });

  it("última corrida en ERROR: error, incluso si fue reciente", () => {
    const ultimaCorrida = { estado: "ERROR" as const, started_at: new Date("2026-07-02T11:59:00.000Z") };
    expect(estadoSaludCron(ultimaCorrida, umbralMs, ahora)).toBe("error");
  });

  it("última corrida OK y dentro del umbral: ok", () => {
    const ultimaCorrida = { estado: "OK" as const, started_at: new Date("2026-07-02T11:55:00.000Z") };
    expect(estadoSaludCron(ultimaCorrida, umbralMs, ahora)).toBe("ok");
  });

  it("última corrida OK pero más vieja que el umbral: atrasado", () => {
    const ultimaCorrida = { estado: "OK" as const, started_at: new Date("2026-07-02T11:45:00.000Z") };
    expect(estadoSaludCron(ultimaCorrida, umbralMs, ahora)).toBe("atrasado");
  });

  it("borde exacto del umbral (antigüedad === umbralMs): todavía ok", () => {
    const ultimaCorrida = { estado: "OK" as const, started_at: new Date(ahora.getTime() - umbralMs) };
    expect(estadoSaludCron(ultimaCorrida, umbralMs, ahora)).toBe("ok");
  });

  it("borde exacto + 1 ms: pasa a atrasado", () => {
    const ultimaCorrida = { estado: "OK" as const, started_at: new Date(ahora.getTime() - umbralMs - 1) };
    expect(estadoSaludCron(ultimaCorrida, umbralMs, ahora)).toBe("atrasado");
  });
});

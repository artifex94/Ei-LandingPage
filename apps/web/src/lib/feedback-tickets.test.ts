import { describe, it, expect } from "vitest";
import { ordenarTickets, type TicketOrdenable } from "./feedback-tickets";

function ticket(overrides: Partial<TicketOrdenable>): TicketOrdenable {
  return {
    estado: "NUEVO",
    prioridad: "MEDIA",
    creado_en: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("ordenarTickets", () => {
  it("pone los tickets abiertos (NUEVO/EN_REVISION) antes que los cerrados", () => {
    const cerrado = ticket({ estado: "RESUELTO", prioridad: "CRITICA", creado_en: "2026-07-02T00:00:00.000Z" });
    const abierto = ticket({ estado: "NUEVO", prioridad: "BAJA", creado_en: "2026-07-01T00:00:00.000Z" });
    const resultado = ordenarTickets([cerrado, abierto]);
    expect(resultado[0]).toBe(abierto);
    expect(resultado[1]).toBe(cerrado);
  });

  it("ordena por prioridad descendente (CRITICA→BAJA) dentro del mismo grupo de estado", () => {
    const baja = ticket({ prioridad: "BAJA" });
    const critica = ticket({ prioridad: "CRITICA" });
    const media = ticket({ prioridad: "MEDIA" });
    const alta = ticket({ prioridad: "ALTA" });
    const resultado = ordenarTickets([baja, critica, media, alta]);
    expect(resultado).toEqual([critica, alta, media, baja]);
  });

  it("con misma prioridad y estado, ordena por fecha de creación descendente", () => {
    const viejo = ticket({ creado_en: "2026-06-01T00:00:00.000Z" });
    const nuevo = ticket({ creado_en: "2026-07-01T00:00:00.000Z" });
    const resultado = ordenarTickets([viejo, nuevo]);
    expect(resultado).toEqual([nuevo, viejo]);
  });

  it("no muta el array de entrada", () => {
    const original = [ticket({ prioridad: "BAJA" }), ticket({ prioridad: "ALTA" })];
    const copia = [...original];
    ordenarTickets(original);
    expect(original).toEqual(copia);
  });
});

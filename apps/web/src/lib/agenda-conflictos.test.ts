import { describe, it, expect } from "vitest";
import { evaluarConflictosAgenda, type TareaDelDia } from "./agenda-conflictos";

// La visita dura 4h fijas (DURACION_VISITA_HORAS) — mismo criterio que la
// auto-reserva de vehículo en asignarTecnico.
function fecha(hora: string): Date {
  const [h, m] = hora.split(":").map(Number);
  const d = new Date(2026, 6, 6); // lunes cualquiera
  d.setHours(h, m, 0, 0);
  return d;
}

describe("evaluarConflictosAgenda", () => {
  it("libre: dentro de la disponibilidad y sin tareas que choquen", () => {
    const resultado = evaluarConflictosAgenda({
      fechaVisita: fecha("09:00"),
      disponibilidad: [{ desde: "06:00", hasta: "22:00" }],
      tareasDelDia: [],
    });
    expect(resultado).toEqual({ nivel: "libre", detalles: [] });
  });

  it("fuera de disponibilidad: sin registro se asume default 06:00-22:00", () => {
    // Visita a las 23:00 (dura hasta las 03:00 del día siguiente) queda fuera del default.
    const resultado = evaluarConflictosAgenda({
      fechaVisita: fecha("23:00"),
      disponibilidad: [],
      tareasDelDia: [],
    });
    expect(resultado.nivel).toBe("fuera_disponibilidad");
    expect(resultado.detalles).toHaveLength(1);
    expect(resultado.detalles[0]).toMatch(/06:00–22:00/);
  });

  it("fuera de disponibilidad: franja explícita más angosta que el default", () => {
    const resultado = evaluarConflictosAgenda({
      fechaVisita: fecha("07:00"),
      disponibilidad: [{ desde: "14:00", hasta: "22:00" }],
      tareasDelDia: [],
    });
    expect(resultado.nivel).toBe("fuera_disponibilidad");
  });

  it("choque parcial: la visita se solapa a la mitad con una tarea existente", () => {
    const tareas: TareaDelDia[] = [
      { id: "t1", titulo: "Instalación García", hora_inicio: "12:00", hora_fin: "16:00" },
    ];
    // Visita 10:00-14:00 (4h) se solapa con 12:00-16:00 entre 12:00 y 14:00.
    const resultado = evaluarConflictosAgenda({
      fechaVisita: fecha("10:00"),
      disponibilidad: [{ desde: "06:00", hasta: "22:00" }],
      tareasDelDia: tareas,
    });
    expect(resultado.nivel).toBe("choque");
    expect(resultado.detalles).toEqual(["Choca con 'Instalación García' 12:00-16:00."]);
  });

  it("choque exacto: la visita ocupa el mismo rango horario que la tarea", () => {
    const tareas: TareaDelDia[] = [
      { id: "t1", titulo: "Mantenimiento Pérez", hora_inicio: "10:00", hora_fin: "14:00" },
    ];
    const resultado = evaluarConflictosAgenda({
      fechaVisita: fecha("10:00"),
      disponibilidad: [{ desde: "06:00", hasta: "22:00" }],
      tareasDelDia: tareas,
    });
    expect(resultado.nivel).toBe("choque");
    expect(resultado.detalles).toEqual(["Choca con 'Mantenimiento Pérez' 10:00-14:00."]);
  });

  it("choque con tarea sin horas: ocupa todo el día", () => {
    const tareas: TareaDelDia[] = [
      { id: "t1", titulo: "Capacitación", hora_inicio: null, hora_fin: null },
    ];
    const resultado = evaluarConflictosAgenda({
      fechaVisita: fecha("09:00"),
      disponibilidad: [{ desde: "06:00", hasta: "22:00" }],
      tareasDelDia: tareas,
    });
    expect(resultado.nivel).toBe("choque");
    expect(resultado.detalles).toEqual(["Choca con 'Capacitación' todo el día."]);
  });

  it("múltiples conflictos: fuera de disponibilidad y choque a la vez, gana 'choque'", () => {
    const tareas: TareaDelDia[] = [
      { id: "t1", titulo: "Retiro Suárez", hora_inicio: "07:00", hora_fin: "09:00" },
    ];
    // Visita a las 07:30 (fuera de la franja 14:00-22:00) y choca con la tarea 07:00-09:00.
    const resultado = evaluarConflictosAgenda({
      fechaVisita: fecha("07:30"),
      disponibilidad: [{ desde: "14:00", hasta: "22:00" }],
      tareasDelDia: tareas,
    });
    expect(resultado.nivel).toBe("choque");
    expect(resultado.detalles).toHaveLength(2);
    expect(resultado.detalles[0]).toMatch(/Fuera del horario disponible/);
    expect(resultado.detalles[1]).toBe("Choca con 'Retiro Suárez' 07:00-09:00.");
  });

  it("no choca cuando las tareas terminan justo cuando empieza la visita (bordes)", () => {
    const tareas: TareaDelDia[] = [
      { id: "t1", titulo: "Anterior", hora_inicio: "06:00", hora_fin: "10:00" },
    ];
    const resultado = evaluarConflictosAgenda({
      fechaVisita: fecha("10:00"),
      disponibilidad: [{ desde: "06:00", hasta: "22:00" }],
      tareasDelDia: tareas,
    });
    expect(resultado.nivel).toBe("libre");
  });
});

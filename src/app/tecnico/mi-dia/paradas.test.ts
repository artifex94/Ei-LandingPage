import { describe, it, expect } from "vitest";
import {
  fusionarParadas,
  seleccionarHero,
  horaAMinutos,
  type TareaDia,
  type OTDia,
} from "./paradas";

function tarea(over: Partial<TareaDia> = {}): TareaDia {
  return {
    id: "t1",
    titulo: "Revisar sensor",
    hora_inicio: "09:00",
    hora_fin: "10:00",
    prioridad: "MEDIA",
    estado: "PENDIENTE",
    ot_id: null,
    direccion: "Calle Falsa 123, Paraná",
    clienteTelefono: "3434111111",
    ...over,
  };
}

function ot(over: Partial<OTDia> = {}): OTDia {
  return {
    id: "ot1",
    numero: 42,
    tipo: "CORRECTIVO",
    descripcion: "Cambiar batería del panel",
    prioridad: "ALTA",
    estado: "ASIGNADA",
    hora: "11:00",
    direccion: "Av. Siempreviva 742",
    clienteTelefono: "3434222222",
    ...over,
  };
}

describe("horaAMinutos", () => {
  it("convierte HH:MM a minutos", () => {
    expect(horaAMinutos("09:30")).toBe(570);
    expect(horaAMinutos("00:00")).toBe(0);
  });

  it("null o inválida → Infinity (va al final)", () => {
    expect(horaAMinutos(null)).toBe(Infinity);
    expect(horaAMinutos("zz")).toBe(Infinity);
  });
});

describe("fusionarParadas", () => {
  it("una tarea con ot_id no duplica la OT vinculada", () => {
    const paradas = fusionarParadas(
      [tarea({ ot_id: "ot1" })],
      [ot({ id: "ot1" })]
    );
    expect(paradas).toHaveLength(1);
    expect(paradas[0].origen).toBe("TAREA");
    expect(paradas[0].href).toBe("/tecnico/ot/ot1");
  });

  it("la tarea vinculada hereda estado y metadatos de campo de la OT", () => {
    const paradas = fusionarParadas(
      [tarea({ ot_id: "ot1", estado: "PENDIENTE" })],
      [ot({ id: "ot1", estado: "EN_RUTA", tipo: "INSTALACION", numero: 7 })]
    );
    expect(paradas[0].estado).toBe("EN_RUTA");
    expect(paradas[0].activa).toBe(true);
    expect(paradas[0].tipoOT).toBe("INSTALACION");
    expect(paradas[0].numeroOT).toBe(7);
  });

  it("una OT huérfana (sin tarea espejo) aparece como parada propia", () => {
    const paradas = fusionarParadas([tarea()], [ot()]);
    expect(paradas).toHaveLength(2);
    expect(paradas.find((p) => p.origen === "OT")?.href).toBe("/tecnico/ot/ot1");
  });

  it("ordena por hora y manda las sin hora al final", () => {
    const paradas = fusionarParadas(
      [
        tarea({ id: "sinHora", hora_inicio: null }),
        tarea({ id: "tarde", hora_inicio: "15:00" }),
      ],
      [ot({ hora: "08:00" })]
    );
    expect(paradas.map((p) => p.id)).toEqual(["ot1", "tarde", "sinHora"]);
  });

  it("la tarea sin OT linkea a su detalle de tarea", () => {
    const [p] = fusionarParadas([tarea()], []);
    expect(p.href).toBe("/tecnico/tareas/t1");
  });

  it("tarea EN_CURSO con OT completada hereda COMPLETADA (no es falso 'Ahora')", () => {
    const paradas = fusionarParadas(
      [tarea({ ot_id: "ot1", estado: "EN_CURSO" })],
      [ot({ id: "ot1", estado: "COMPLETADA" })]
    );
    expect(paradas).toHaveLength(1);
    expect(paradas[0].completada).toBe(true);
    expect(paradas[0].activa).toBe(false);
    expect(seleccionarHero(paradas).parada).toBeNull();
  });

  it("una OT cancelada hereda estado a su tarea pero no aparece como parada propia", () => {
    const paradas = fusionarParadas(
      [tarea({ ot_id: "ot1", estado: "PENDIENTE" })],
      [ot({ id: "ot1", estado: "CANCELADA" }), ot({ id: "ot2", estado: "CANCELADA" })]
    );
    expect(paradas).toHaveLength(1);
    expect(paradas[0].completada).toBe(true);
    expect(paradas.find((p) => p.id === "ot2")).toBeUndefined();
  });

  it("una OT completada huérfana sí aparece (es parte de la jornada hecha)", () => {
    const paradas = fusionarParadas([], [ot({ estado: "COMPLETADA" })]);
    expect(paradas).toHaveLength(1);
    expect(paradas[0].completada).toBe(true);
  });
});

describe("seleccionarHero", () => {
  it("prioriza la parada activa aunque haya una pendiente más temprana", () => {
    const paradas = fusionarParadas(
      [
        tarea({ id: "a", hora_inicio: "08:00", estado: "PENDIENTE" }),
        tarea({ id: "b", hora_inicio: "10:00", estado: "EN_CURSO" }),
      ],
      []
    );
    const hero = seleccionarHero(paradas);
    expect(hero.esAhora).toBe(true);
    expect(hero.parada?.id).toBe("b");
  });

  it("sin activa, elige la primera no completada por hora", () => {
    const paradas = fusionarParadas(
      [
        tarea({ id: "hecha", hora_inicio: "08:00", estado: "COMPLETADA" }),
        tarea({ id: "proxima", hora_inicio: "11:00", estado: "PENDIENTE" }),
      ],
      []
    );
    const hero = seleccionarHero(paradas);
    expect(hero.esAhora).toBe(false);
    expect(hero.parada?.id).toBe("proxima");
  });

  it("todas completadas → parada null (jornada completa)", () => {
    const paradas = fusionarParadas(
      [tarea({ estado: "COMPLETADA" })],
      []
    );
    expect(seleccionarHero(paradas).parada).toBeNull();
  });

  it("sin paradas → parada null", () => {
    expect(seleccionarHero([]).parada).toBeNull();
  });
});

import { describe, it, expect } from "vitest";
import { construirDatosOTDesdeSolicitud, type SolicitudParaOT } from "./ot-desde-solicitud";

const solicitud: SolicitudParaOT = {
  cuenta_id: "cuenta-1",
  descripcion: "Sensor de puerta no responde",
  prioridad: "ALTA",
};

describe("construirDatosOTDesdeSolicitud", () => {
  it("hereda cuenta, descripción y prioridad de la solicitud sin overrides", () => {
    const datos = construirDatosOTDesdeSolicitud(solicitud);
    expect(datos).toEqual({
      cuenta_id: "cuenta-1",
      descripcion: "Sensor de puerta no responde",
      prioridad: "ALTA",
      tipo: "CORRECTIVO",
    });
  });

  it("el tipo por default es CORRECTIVO independientemente de la prioridad", () => {
    expect(construirDatosOTDesdeSolicitud({ ...solicitud, prioridad: "BAJA" }).tipo).toBe("CORRECTIVO");
    expect(construirDatosOTDesdeSolicitud({ ...solicitud, prioridad: "MEDIA" }).tipo).toBe("CORRECTIVO");
  });

  it("permite overridear tipo, prioridad y descripción desde el modal", () => {
    const datos = construirDatosOTDesdeSolicitud(solicitud, {
      tipo: "PREVENTIVO",
      prioridad: "MEDIA",
      descripcion: "Revisión preventiva completa",
    });
    expect(datos).toEqual({
      cuenta_id: "cuenta-1",
      descripcion: "Revisión preventiva completa",
      prioridad: "MEDIA",
      tipo: "PREVENTIVO",
    });
  });

  it("ignora una descripción override vacía o solo espacios y conserva la original", () => {
    expect(construirDatosOTDesdeSolicitud(solicitud, { descripcion: "   " }).descripcion).toBe(
      solicitud.descripcion,
    );
    expect(construirDatosOTDesdeSolicitud(solicitud, { descripcion: "" }).descripcion).toBe(
      solicitud.descripcion,
    );
  });

  it("recorta espacios en la descripción override", () => {
    expect(
      construirDatosOTDesdeSolicitud(solicitud, { descripcion: "  Cambio de batería  " }).descripcion,
    ).toBe("Cambio de batería");
  });
});

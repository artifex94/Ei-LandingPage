import type { TipoOT, Prioridad } from "@/generated/prisma/client";

/** Tipo de OT por default al convertir una solicitud: un pedido de
 * mantenimiento entrante es casi siempre un arreglo puntual, no una
 * instalación ni una visita preventiva programada. Overrideable en el modal. */
const TIPO_OT_DEFAULT: TipoOT = "CORRECTIVO";

export interface SolicitudParaOT {
  cuenta_id: string;
  descripcion: string;
  prioridad: Prioridad;
}

export interface OverridesOT {
  tipo?: TipoOT;
  prioridad?: Prioridad;
  descripcion?: string;
}

export interface DatosOTDesdeSolicitud {
  cuenta_id: string;
  descripcion: string;
  prioridad: Prioridad;
  tipo: TipoOT;
}

/**
 * Mapeo puro (sin Prisma) de los campos de una `SolicitudMantenimiento` a los
 * de la `OrdenTrabajo` que se crea al convertirla. Hereda cuenta, descripción
 * y prioridad de la solicitud; el tipo por default es CORRECTIVO. Todo
 * overrideable desde el modal de conversión ("Convertir en OT").
 */
export function construirDatosOTDesdeSolicitud(
  solicitud: SolicitudParaOT,
  overrides: OverridesOT = {},
): DatosOTDesdeSolicitud {
  const descripcionOverride = overrides.descripcion?.trim();
  return {
    cuenta_id: solicitud.cuenta_id,
    descripcion: descripcionOverride || solicitud.descripcion,
    prioridad: overrides.prioridad ?? solicitud.prioridad,
    tipo: overrides.tipo ?? TIPO_OT_DEFAULT,
  };
}

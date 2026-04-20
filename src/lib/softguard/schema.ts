// Tipos TypeScript que reflejan las vistas read-only vw_ei_* creadas en SoftGuard SQL Server.
// Los nombres de campo siguen snake_case del portal; se mapean desde los aliases SQL de la vista.
// Ver scripts/seed-vista-cuentas.sql para el DDL real.

export interface SgCuentaResumen {
  softguard_ref: string;          // CHAR(4), ej: "0042"
  nombre_titular: string;
  direccion: string | null;
  localidad: string | null;
  telefono: string | null;
  situacion: string;              // "Habilitada" | "No habilitada" | etc.
  acceso_web: boolean;            // campo "Acceso Web" — switch de autorización AWCC
  dealer_id: number;
  org_id: number | null;          // FK a organización MoneyGuard
  ultimo_evento_fecha: Date | null;
  ultimo_evento_codigo: string | null;
  activa: boolean;
}

export interface SgEventoReciente {
  id_evento: number;
  softguard_ref: string;
  fecha_evento: Date;
  codigo: string;                 // ej: "E130"
  descripcion: string;
  zona: string | null;
  prioridad: number | null;
  operador: string | null;
  estado_nativo: string;          // estado textual de SoftGuard (los 9 posibles)
  resolucion: string | null;
}

export interface SgOTEstado {
  ot_numero: number;
  softguard_ref: string;
  tipo: string;
  descripcion: string;
  estado: string;
  tecnico: string | null;
  fecha_creacion: Date;
  fecha_cierre: Date | null;
}

// Mapeo de estado nativo SoftGuard → enum del portal
export const ESTADO_SG_MAP: Record<string, string> = {
  "Nuevo":                     "NUEVO",
  "Pendiente":                 "NUEVO",
  "En Proceso":                "EN_PROCESO",
  "Espera":                    "EN_ESPERA",
  "En Proceso desde Espera":   "EN_PROCESO_DESDE_ESPERA",
  "En proceso multiple":       "EN_PROCESO_MULTIPLE",
  "Procesado":                 "PROCESADO",
  "Procesado (No Alerta)":     "PROCESADO_NO_ALERTA",
  "Procesado (Modo prueba)":   "PROCESADO_MODO_PRUEBA",
  "Procesado (Modo off)":      "PROCESADO_MODO_OFF",
};

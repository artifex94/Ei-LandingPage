// Tipos TypeScript que reflejan las vistas read-only vw_ei_* en SoftGuard SQL Server (_Datos).
// Generados a partir del schema real — ver scripts/seed-vista-cuentas.sql para el DDL.

export interface SgCuentaResumen {
  iid: number;                         // m_cuentas.cue_iid — PK interna para JOINs
  linea: string;                        // cue_clinea CHAR(3), ej: "001"
  softguard_ref: string;               // RTRIM(cue_ncuenta), ej: "0042"
  nombre_titular: string;
  direccion: string;
  localidad: string;
  provincia: string;
  telefono: string;
  email: string;
  fecha_alta: Date;
  fecha_servicio: Date;
  activa: number;                       // cue_nEfectiva: 1=activa, 0=inactiva
  engine_status: number;               // 0=inactivo, 1=activo, 2=prueba
  ultima_alarma_codigo: string;        // última alarma recibida por DSS
  ultima_alarma_fecha: Date | null;
  estado_panel: number;                // m_status.sta_nestado
  estado_panel_fecha: Date | null;
}

export interface SgEventoReciente {
  id_evento: number;
  iid_cuenta: number;                  // FK a m_cuentas.cue_iid
  softguard_ref: string;               // RTRIM(cue_ncuenta)
  fecha_evento: Date;
  accion: string;                      // etl_cAccion — descripción textual
  observacion: string | null;          // etl_cObservacion — detalle del operador
  accion_code: number;                 // etl_iAccionCode — código numérico de acción
  operador_id: number | null;
}

export interface SgOTEstado {
  ot_id: number;                       // stc_iid — PK
  iid_cuenta: number;                  // FK a m_cuentas.cue_iid
  softguard_ref: string;
  ot_numero: number;
  tipo_servicio: string;               // stc_ctipo_servicio CHAR(3)
  descripcion: string;
  estado: number;                      // stc_nestado: 0=pendiente, 1=en curso, 2=cerrada
  tecnico_1: string;
  tecnico_2: string;
  fecha_creacion: Date;
  fecha_cierre: Date | null;
  fecha_programada: Date;
  valor: number;
  fecha_modificacion: Date;
}

// Mapeo de accion_code → etiqueta legible (completar según datos reales del sistema)
// Los códigos varían por instalación; estos son valores comunes de SoftGuard.
export const ACCION_CODE_MAP: Record<number, string> = {
  1:   "Alarma",
  2:   "Restauración",
  3:   "Test",
  4:   "Apertura",
  5:   "Cierre",
  6:   "Falla AC",
  7:   "Batería baja",
  99:  "Otro",
};

// Estados numéricos de OT en m_st_cabecera.stc_nestado
export const OT_ESTADO_MAP: Record<number, string> = {
  0: "PENDIENTE",
  1: "EN_CURSO",
  2: "CERRADA",
};

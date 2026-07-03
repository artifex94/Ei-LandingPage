/**
 * Clasificación de eventos de alarma por código Contact ID / SIA (SoftGuard).
 *
 * Módulo puro (sin "use server" ni imports de React/Prisma) para poder
 * compartir `clasificarCodigo` entre Server Actions (`lib/actions/eventos.ts`)
 * y helpers de datos (`lib/notificaciones-feed.ts`). Un archivo "use server"
 * no puede exportar funciones síncronas, por eso esta lógica vive acá.
 */

export type TipoDia =
  | "medica"
  | "violencia"
  | "fuego"
  | "intrusion"
  | "tecnico"
  | "normal"
  | "vacio";

// Prioridad de severidad (mayor número = más crítico)
export const PRIORIDAD: Record<TipoDia, number> = {
  vacio:     0,
  normal:    1,
  tecnico:   2,
  intrusion: 3,
  fuego:     4,
  violencia: 5,
  medica:    6,
};

// ── Clasificación Contact ID ───────────────────────────────────────────────────
// Protocolo Contact ID / SIA usado por SoftGuard (campo EventoAlarma.codigo)
//   E100-E101 → Emergencia médica / personal
//   E110-E119 → Incendio / Humo / Combustión
//   E120-E122 → Pánico / Coacción / Hold-up
//   E130-E159 → Intrusión / Zona / Perímetro
//   E300-E399 → Problemas técnicos (tamper, AC, batería)
//   E4xx-E6xx → Operaciones normales (apertura, cierre, test, periódico)

export function clasificarCodigo(codigo: string): TipoDia {
  const c = codigo.trim().toUpperCase();

  if (/^[ER]10[01]/.test(c))       return "medica";
  if (/^[ER]12[012]/.test(c))      return "violencia";
  if (/^[ER]11[0-9]/.test(c))      return "fuego";
  if (/^[ER]1[3-5][0-9]/.test(c))  return "intrusion";
  if (/^[ER]3[0-9]{2}/.test(c))    return "tecnico";

  // Apertura, cierre, test, heartbeat, restauraciones → actividad normal
  return "normal";
}

// ── Protocolo guiado de actuación (Fase 7b) ─────────────────────────────────────
//
// El operador decidía de memoria a quién llamar y en qué orden ante un evento.
// Esta lista ordenada de pasos guía esa decisión; cada paso se registra como
// una fila en `GestionEvento` (ver `registrarGestionEvento` en
// `lib/actions/eventos.ts`), que complementa `EventoAlarma.resolucion` (texto
// libre) sin reemplazarlo.
//
// Hardcodeado a propósito: a esta escala (5 personas, ~100 cuentas) editar el
// orden o el texto de un paso es un cambio de código + deploy aceptable.
// Migrar a una tabla (patrón `ParametroNegocio`) solo si en la práctica hace
// falta editarlo sin pasar por deploy.

export type TipoGestionEvento =
  | "LLAMADA_CONTACTO"
  | "WHATSAPP_CONTACTO"
  | "VERIFICACION_CAMARA"
  | "AVISO_POLICIA"
  | "OTRO";

export interface PasoProtocolo {
  tipo: TipoGestionEvento;
  etiqueta: string;
}

const PROTOCOLOS: Record<TipoDia, PasoProtocolo[]> = {
  medica: [
    { tipo: "LLAMADA_CONTACTO", etiqueta: "Llamar contactos en orden" },
    { tipo: "AVISO_POLICIA", etiqueta: "Llamar emergencias 107/911" },
  ],
  violencia: [
    { tipo: "AVISO_POLICIA", etiqueta: "Avisar policía 101" },
    { tipo: "LLAMADA_CONTACTO", etiqueta: "Llamar contactos" },
  ],
  fuego: [
    { tipo: "LLAMADA_CONTACTO", etiqueta: "Llamar contactos en orden" },
    { tipo: "AVISO_POLICIA", etiqueta: "Bomberos 100" },
  ],
  intrusion: [
    { tipo: "LLAMADA_CONTACTO", etiqueta: "Llamar contactos en orden" },
    { tipo: "VERIFICACION_CAMARA", etiqueta: "Verificar cámaras si tiene" },
    { tipo: "AVISO_POLICIA", etiqueta: "Si se confirma, avisar 101" },
  ],
  tecnico: [
    { tipo: "OTRO", etiqueta: "Registrar gestión si corresponde" },
  ],
  normal: [
    { tipo: "OTRO", etiqueta: "Registrar gestión si corresponde" },
  ],
  vacio: [],
};

export function protocoloParaClasificacion(clasificacion: TipoDia): PasoProtocolo[] {
  return PROTOCOLOS[clasificacion];
}

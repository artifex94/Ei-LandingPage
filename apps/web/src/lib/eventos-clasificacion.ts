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

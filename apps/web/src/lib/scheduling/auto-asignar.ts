/**
 * Planificador automático de turnos de monitoreo.
 *
 * Reparte las franjas no cubiertas de un rango de fechas entre los monitores
 * disponibles, de forma lógica y equitativa. Es una función PURA (sin acceso a
 * base de datos): recibe el estado actual y devuelve las asignaciones a crear.
 * Esto la hace determinística y testeable.
 *
 * Reglas (en orden de prioridad):
 *  1. DURA  — nunca asignar a un monitor ausente ese día.
 *  2. DURA  — no duplicar cobertura: si la franja ya tiene un turno, se respeta.
 *  3. BLANDA — evitar que un monitor tenga más de una franja el mismo día.
 *  4. BLANDA — descanso post-noche: quien hizo NOCHE no entra en MAÑANA del día
 *              siguiente (evita 16 h corridas).
 *  5. BALANCE — repartir la carga total pareja entre todos los monitores.
 *  6. BALANCE — repartir las NOCHES (franja menos deseada) de forma equitativa.
 */

export type FranjaTurno = "MANANA" | "TARDE" | "NOCHE";

export const FRANJAS: FranjaTurno[] = ["MANANA", "TARDE", "NOCHE"];

/**
 * Orden en que se procesan las franjas al asignar. La NOCHE va PRIMERO a
 * propósito: es la franja menos deseada y debe rotar de forma equitativa. Si se
 * asignara al final, quien quede "libre" ese día cargaría siempre la noche
 * (los demás ya tendrían turno y la regla de una-franja-por-día los excluye),
 * concentrando todas las noches en una persona.
 */
const ORDEN_PROCESO: FranjaTurno[] = ["NOCHE", "MANANA", "TARDE"];

export interface MonitorInput {
  id: string;
  nombre: string;
}

export interface AusenciaInput {
  empleado_id: string;
  desde: Date;
  hasta: Date;
}

export interface TurnoExistenteInput {
  empleado_id: string;
  fecha: Date;
  franja: FranjaTurno;
}

export interface AsignacionPropuesta {
  empleado_id: string;
  fecha: Date;
  franja: FranjaTurno;
}

/** Clave de día estable en UTC — los Date de Prisma (@db.Date) son medianoche UTC. */
function diaKey(d: Date): string {
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
}

/** Timestamp de medianoche UTC, para comparar rangos de ausencia sin desfase. */
function diaTs(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function estaAusente(empId: string, fecha: Date, ausencias: AusenciaInput[]): boolean {
  const t = diaTs(fecha);
  return ausencias.some(
    (a) => a.empleado_id === empId && t >= diaTs(a.desde) && t <= diaTs(a.hasta)
  );
}

// Penalizaciones del scoring. Ordenadas para que las reglas blandas pesen más
// que el balance, pero nunca tanto como para violar una regla dura (esas se
// filtran antes del scoring).
const PEN_SEGUNDA_FRANJA_DIA = 1000; // tener ya un turno ese día
const PEN_SIN_DESCANSO_NOCHE = 400;  // noche ayer → mañana hoy
const PESO_CARGA            = 10;    // por cada turno ya acumulado
const PESO_NOCHES           = 6;     // por cada noche ya acumulada (solo en franja NOCHE)

export function planificarSemana(input: {
  monitores: MonitorInput[];
  ausencias: AusenciaInput[];
  turnosExistentes: TurnoExistenteInput[];
  /** Fechas a cubrir, en orden cronológico (medianoche UTC). */
  fechas: Date[];
}): AsignacionPropuesta[] {
  const { monitores, ausencias, turnosExistentes, fechas } = input;
  if (monitores.length === 0 || fechas.length === 0) return [];

  // Estado mutable del reparto ────────────────────────────────────────────────
  const carga = new Map<string, number>();   // total de turnos por monitor
  const noches = new Map<string, number>();   // total de noches por monitor
  for (const m of monitores) {
    carga.set(m.id, 0);
    noches.set(m.id, 0);
  }

  const cubierto = new Set<string>();              // `${dia}|${franja}` ya tiene turno
  const turnoEnDia = new Set<string>();            // `${dia}|${empId}` ya trabaja ese día
  const hizoNochePorDia = new Map<string, Set<string>>(); // dia → empIds que hicieron noche

  // Sembrar el estado con los turnos ya existentes (cuentan para el balance).
  for (const t of turnosExistentes) {
    const dia = diaKey(t.fecha);
    cubierto.add(`${dia}|${t.franja}`);
    turnoEnDia.add(`${dia}|${t.empleado_id}`);
    if (carga.has(t.empleado_id)) {
      carga.set(t.empleado_id, (carga.get(t.empleado_id) ?? 0) + 1);
      if (t.franja === "NOCHE") {
        noches.set(t.empleado_id, (noches.get(t.empleado_id) ?? 0) + 1);
      }
    }
    if (t.franja === "NOCHE") {
      if (!hizoNochePorDia.has(dia)) hizoNochePorDia.set(dia, new Set());
      hizoNochePorDia.get(dia)!.add(t.empleado_id);
    }
  }

  const propuestas: AsignacionPropuesta[] = [];

  for (let di = 0; di < fechas.length; di++) {
    const fecha = fechas[di];
    const dia = diaKey(fecha);
    const diaPrevio = di > 0 ? diaKey(fechas[di - 1]) : null;

    for (const franja of ORDEN_PROCESO) {
      if (cubierto.has(`${dia}|${franja}`)) continue;

      // Regla dura: descartar ausentes.
      const candidatos = monitores.filter((m) => !estaAusente(m.id, fecha, ausencias));
      if (candidatos.length === 0) continue; // hueco insalvable: sin monitores ese día

      // Scoring: menor penalización gana.
      let elegido = candidatos[0];
      let mejorScore = Infinity;
      for (const m of candidatos) {
        let score = (carga.get(m.id) ?? 0) * PESO_CARGA;
        if (turnoEnDia.has(`${dia}|${m.id}`)) score += PEN_SEGUNDA_FRANJA_DIA;
        if (
          franja === "MANANA" &&
          diaPrevio &&
          hizoNochePorDia.get(diaPrevio)?.has(m.id)
        ) {
          score += PEN_SIN_DESCANSO_NOCHE;
        }
        if (franja === "NOCHE") score += (noches.get(m.id) ?? 0) * PESO_NOCHES;

        // Desempate estable por id para que el reparto sea determinístico.
        if (score < mejorScore || (score === mejorScore && m.id < elegido.id)) {
          mejorScore = score;
          elegido = m;
        }
      }

      // Registrar la asignación y actualizar el estado.
      propuestas.push({ empleado_id: elegido.id, fecha, franja });
      cubierto.add(`${dia}|${franja}`);
      turnoEnDia.add(`${dia}|${elegido.id}`);
      carga.set(elegido.id, (carga.get(elegido.id) ?? 0) + 1);
      if (franja === "NOCHE") {
        noches.set(elegido.id, (noches.get(elegido.id) ?? 0) + 1);
        if (!hizoNochePorDia.has(dia)) hizoNochePorDia.set(dia, new Set());
        hizoNochePorDia.get(dia)!.add(elegido.id);
      }
    }
  }

  return propuestas;
}

/** Genera N fechas consecutivas (medianoche UTC) desde una fecha de inicio. */
export function generarFechasUTC(desde: Date, dias: number): Date[] {
  const y = desde.getUTCFullYear();
  const m = desde.getUTCMonth();
  const d = desde.getUTCDate();
  return Array.from({ length: dias }, (_, i) => new Date(Date.UTC(y, m, d + i)));
}

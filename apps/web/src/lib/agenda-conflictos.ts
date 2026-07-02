// Lógica pura de validación de agenda al asignar un técnico a una OT.
// Sin dependencias de Prisma/DB: recibe la disponibilidad y las tareas del
// día ya resueltas y devuelve un veredicto legible. Se testea sin mocks.

import { disponibilidadDefault, normalizarRangos, type Rango } from "@/lib/disponibilidad-utils";

/** Duración asumida de una visita técnica — misma constante que usa la
 *  auto-reserva de vehículo en asignarTecnico (apps/web/src/lib/actions/ot.ts). */
export const DURACION_VISITA_HORAS = 4;

export interface TareaDelDia {
  id: string;
  titulo: string;
  hora_inicio: string | null; // "HH:MM"; null = sin horario (tarea de todo el día)
  hora_fin: string | null;
}

export type NivelConflictoAgenda = "libre" | "fuera_disponibilidad" | "choque";

export interface ResultadoConflictosAgenda {
  nivel: NivelConflictoAgenda;
  detalles: string[];
}

export interface EvaluarConflictosAgendaParams {
  fechaVisita: Date;
  /** Franjas de DisponibilidadTecnico del día; array vacío = sin registro (default 06:00–22:00). */
  disponibilidad: Rango[];
  tareasDelDia: TareaDelDia[];
}

function horaAMinutos(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Evalúa si asignar una visita en `fechaVisita` (duración fija DURACION_VISITA_HORAS)
 * choca con la disponibilidad cargada o con otras tareas ya agendadas ese día.
 *
 * Prioridad de nivel: "choque" > "fuera_disponibilidad" > "libre" — un choque
 * con una tarea real es más grave que estar fuera del horario preferido.
 */
export function evaluarConflictosAgenda({
  fechaVisita,
  disponibilidad,
  tareasDelDia,
}: EvaluarConflictosAgendaParams): ResultadoConflictosAgenda {
  const inicioVisita = fechaVisita.getHours() * 60 + fechaVisita.getMinutes();
  const finVisita = inicioVisita + DURACION_VISITA_HORAS * 60;

  const detalles: string[] = [];
  let nivel: NivelConflictoAgenda = "libre";

  // 1. Disponibilidad del día — sin registros se asume el default 06:00–22:00
  //    (mismo criterio que /tecnico/mi-dia, ver DisponibilidadTecnico en schema.prisma).
  const rangos = normalizarRangos(
    disponibilidad.length > 0 ? disponibilidad : disponibilidadDefault()
  );
  const dentroDeFranja = rangos.some((r) => {
    const desde = horaAMinutos(r.desde);
    const hasta = horaAMinutos(r.hasta);
    return inicioVisita >= desde && finVisita <= hasta;
  });

  if (!dentroDeFranja) {
    nivel = "fuera_disponibilidad";
    detalles.push(
      rangos.length > 0
        ? `Fuera del horario disponible del técnico (${rangos.map((r) => `${r.desde}–${r.hasta}`).join(" · ")}).`
        : "El técnico no tiene disponibilidad cargada ese día."
    );
  }

  // 2. Choques con tareas ya agendadas ese día (sin horario = ocupa todo el día).
  for (const tarea of tareasDelDia) {
    const desde = tarea.hora_inicio ? horaAMinutos(tarea.hora_inicio) : 0;
    const hasta = tarea.hora_fin ? horaAMinutos(tarea.hora_fin) : 24 * 60;
    const solapa = inicioVisita < hasta && finVisita > desde;
    if (!solapa) continue;

    nivel = "choque";
    const rango = tarea.hora_inicio && tarea.hora_fin
      ? `${tarea.hora_inicio}-${tarea.hora_fin}`
      : "todo el día";
    detalles.push(`Choca con '${tarea.titulo}' ${rango}.`);
  }

  return { nivel, detalles };
}

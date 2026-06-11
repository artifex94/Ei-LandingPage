/**
 * Modelo de "paradas" de la jornada del técnico: fusiona tareas agendadas
 * y órdenes de trabajo del día en una cronología única, sin duplicar las
 * tareas que ya están vinculadas a una OT (TareaAgendada.ot_id es 1:1).
 *
 * Lógica pura y serializable: se ejecuta en el servidor y se testea sin React.
 */

export interface TareaDia {
  id: string;
  titulo: string;
  hora_inicio: string | null; // "HH:MM"
  hora_fin: string | null;
  prioridad: string;
  estado: string; // PENDIENTE | EN_CURSO | COMPLETADA | CANCELADA
  ot_id: string | null;
  direccion: string | null;
  clienteTelefono: string | null;
}

export interface OTDia {
  id: string;
  numero: number;
  tipo: string; // INSTALACION | CORRECTIVO | PREVENTIVO | RETIRO
  descripcion: string;
  prioridad: string;
  estado: string; // ASIGNADA | EN_RUTA | EN_SITIO | COMPLETADA | CANCELADA
  hora: string | null; // "HH:MM" derivada de fecha_visita; null si 00:00
  direccion: string | null;
  clienteTelefono: string | null;
}

export interface Parada {
  origen: "TAREA" | "OT";
  id: string;
  href: string;
  hora: string | null;
  orden: number; // minutos desde medianoche; Infinity si sin hora
  titulo: string;
  estado: string;
  activa: boolean;
  completada: boolean;
  prioridad: string;
  direccion: string | null;
  telefono: string | null;
  tipoOT: string | null;
  numeroOT: number | null;
}

const ESTADOS_ACTIVOS = new Set(["EN_CURSO", "EN_RUTA", "EN_SITIO"]);
const ESTADOS_CERRADOS = new Set(["COMPLETADA", "CANCELADA"]);

export function horaAMinutos(hora: string | null): number {
  if (!hora) return Infinity;
  const [h, m] = hora.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return Infinity;
  return h * 60 + m;
}

export function fusionarParadas(tareas: TareaDia[], ots: OTDia[]): Parada[] {
  const otsPorId = new Map(ots.map((o) => [o.id, o]));
  const otsVinculadas = new Set(
    tareas.map((t) => t.ot_id).filter((id): id is string => id !== null)
  );

  const deTareas: Parada[] = tareas.map((t) => {
    // Si la tarea está ligada a una OT activa, el estado de campo real es el
    // de la OT y el destino es el flujo de campo (/tecnico/ot/[id]).
    const ot = t.ot_id ? otsPorId.get(t.ot_id) : undefined;
    const estado = ot?.estado ?? t.estado;
    return {
      origen: "TAREA",
      id: t.id,
      href: t.ot_id ? `/tecnico/ot/${t.ot_id}` : `/tecnico/tareas/${t.id}`,
      hora: t.hora_inicio,
      orden: horaAMinutos(t.hora_inicio),
      titulo: t.titulo,
      estado,
      activa: ESTADOS_ACTIVOS.has(estado),
      completada: ESTADOS_CERRADOS.has(estado),
      prioridad: t.prioridad,
      direccion: t.direccion,
      telefono: t.clienteTelefono,
      tipoOT: ot?.tipo ?? null,
      numeroOT: ot?.numero ?? null,
    };
  });

  const deOTs: Parada[] = ots
    .filter((o) => !otsVinculadas.has(o.id))
    .map((o) => ({
      origen: "OT",
      id: o.id,
      href: `/tecnico/ot/${o.id}`,
      hora: o.hora,
      orden: horaAMinutos(o.hora),
      titulo: o.descripcion,
      estado: o.estado,
      activa: ESTADOS_ACTIVOS.has(o.estado),
      completada: ESTADOS_CERRADOS.has(o.estado),
      prioridad: o.prioridad,
      direccion: o.direccion,
      telefono: o.clienteTelefono,
      tipoOT: o.tipo,
      numeroOT: o.numero,
    }));

  // sort es estable: las sin hora (Infinity) conservan su orden de llegada
  return [...deTareas, ...deOTs].sort((a, b) => a.orden - b.orden);
}

export interface HeroSeleccion {
  parada: Parada | null;
  esAhora: boolean;
}

export function seleccionarHero(paradas: Parada[]): HeroSeleccion {
  const activa = paradas.find((p) => p.activa);
  if (activa) return { parada: activa, esAhora: true };

  const siguiente = paradas.find((p) => !p.completada);
  return { parada: siguiente ?? null, esAhora: false };
}

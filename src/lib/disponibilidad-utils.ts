// Utilidades de disponibilidad de técnico (sin "use server" — importable desde cliente)

export interface Rango { desde: string; hasta: string }

export const HORA_INICIO_DEFAULT = "06:00";
export const HORA_FIN_DEFAULT    = "22:00";
export const TOTAL_SLOTS         = 32; // 06:00–22:00 en bloques de 30 min

export function slotAHora(slot: number): string {
  const mins = 6 * 60 + slot * 30;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

export function horaASlot(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return Math.floor((h * 60 + m - 6 * 60) / 30);
}

export function rangosASlots(rangos: Rango[]): boolean[] {
  const slots = new Array<boolean>(TOTAL_SLOTS).fill(false);
  for (const r of rangos) {
    const inicio = Math.max(0, horaASlot(r.desde));
    const fin    = Math.min(TOTAL_SLOTS, horaASlot(r.hasta));
    for (let i = inicio; i < fin; i++) slots[i] = true;
  }
  return slots;
}

export function slotsARangos(slots: boolean[]): Rango[] {
  const rangos: Rango[] = [];
  let i = 0;
  while (i < slots.length) {
    if (slots[i]) {
      const start = i;
      while (i < slots.length && slots[i]) i++;
      rangos.push({ desde: slotAHora(start), hasta: slotAHora(i) });
    } else {
      i++;
    }
  }
  return rangos;
}

export function disponibilidadDefault(): Rango[] {
  return [{ desde: HORA_INICIO_DEFAULT, hasta: HORA_FIN_DEFAULT }];
}

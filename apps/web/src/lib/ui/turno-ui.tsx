/**
 * Iconografía y código de color de turnos de monitoreo.
 * Fuente única de verdad: franjas y estados se renderizan igual en todo el panel.
 */

import { Sunrise, Sun, Moon, Clock, PlayCircle, CheckCircle2, UserX, RefreshCw } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type Franja = "MANANA" | "TARDE" | "NOCHE";

export interface FranjaMeta {
  label: string;
  horario: string;
  Icon: LucideIcon;
  /** color del punto/acento (hex para usar en style o como referencia) */
  accent: string;
  /** clases del ícono y acento de la fila */
  iconCls: string;
  /** borde de acento izquierdo de la fila */
  rowAccent: string;
}

export const FRANJA_META: Record<Franja, FranjaMeta> = {
  MANANA: {
    label: "Mañana",
    horario: "06 – 14 hs",
    Icon: Sunrise,
    accent: "rgb(250 204 21)",       // yellow-400
    iconCls: "text-yellow-400",
    rowAccent: "rgba(250,204,21,0.5)",
  },
  TARDE: {
    label: "Tarde",
    horario: "14 – 22 hs",
    Icon: Sun,
    accent: "rgb(249 115 22)",       // orange-500
    iconCls: "text-orange-400",
    rowAccent: "rgba(249,115,22,0.5)",
  },
  NOCHE: {
    label: "Noche",
    horario: "22 – 06 hs",
    Icon: Moon,
    accent: "rgb(129 140 248)",      // indigo-400
    iconCls: "text-indigo-400",
    rowAccent: "rgba(129,140,248,0.5)",
  },
};

export type EstadoTurnoUI = "PROGRAMADO" | "EN_CURSO" | "COMPLETADO" | "AUSENTE" | "REEMPLAZADO";

export interface EstadoTurnoMeta {
  label: string;
  Icon: LucideIcon;
  /** clases para el chip (bg + text + ring) */
  chip: string;
}

export const ESTADO_TURNO_META: Record<EstadoTurnoUI, EstadoTurnoMeta> = {
  PROGRAMADO: {
    label: "Programado",
    Icon: Clock,
    chip: "bg-slate-700/80 text-slate-200",
  },
  EN_CURSO: {
    label: "En curso",
    Icon: PlayCircle,
    chip: "bg-emerald-900/60 text-emerald-200 ring-1 ring-emerald-500/50",
  },
  COMPLETADO: {
    label: "Completado",
    Icon: CheckCircle2,
    chip: "bg-slate-800/80 text-slate-500",
  },
  AUSENTE: {
    label: "Ausente",
    Icon: UserX,
    chip: "bg-red-900/50 text-red-300 ring-1 ring-red-700/40",
  },
  REEMPLAZADO: {
    label: "Reemplazado",
    Icon: RefreshCw,
    chip: "bg-amber-900/50 text-amber-300",
  },
};

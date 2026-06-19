"use client";

import { createContext } from "react";

/**
 * Puente entre el tablero optimista y los botones de acción (RF-B2).
 *
 * KanbanBoard provee `aplicarOptimista`; los botones de AccionesForm lo
 * consumen y lo disparan DENTRO de su transition, antes de la Server Action:
 * la tarjeta se mueve de columna al instante y, si el server falla, React
 * revierte solo al estado real (las props no cambiaron) y el toast avisa.
 *
 * Archivo separado para evitar el ciclo KanbanBoard ↔ AccionesForm.
 */

export interface AccionOptimista {
  id: string;
  estado: "PENDIENTE" | "EN_PROCESO" | "RESUELTA";
}

export const KanbanOptimisticContext = createContext<((a: AccionOptimista) => void) | null>(null);

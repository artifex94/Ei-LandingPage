import type { BadgeVariant } from "@/components/ui/Badge";

/** Labels y estilos compartidos entre ParadaHero y ParadaCard. */

export const ESTADO_PARADA_LABEL: Record<string, string> = {
  PENDIENTE:  "Pendiente",
  ASIGNADA:   "Asignada",
  EN_CURSO:   "En curso",
  EN_RUTA:    "En camino",
  EN_SITIO:   "En el sitio",
  COMPLETADA: "Completada",
  CANCELADA:  "Cancelada",
};

export const ESTADO_PARADA_VARIANT: Record<string, BadgeVariant> = {
  PENDIENTE:  "neutral",
  ASIGNADA:   "neutral",
  EN_CURSO:   "info",
  EN_RUTA:    "info",
  EN_SITIO:   "info",
  COMPLETADA: "success",
  CANCELADA:  "danger",
};

export const TIPO_OT_LABEL: Record<string, string> = {
  INSTALACION: "Instalación",
  CORRECTIVO:  "Correctivo",
  PREVENTIVO:  "Preventivo",
  RETIRO:      "Retiro",
};

export const PRIORIDAD_BORDE: Record<string, string> = {
  ALTA:  "border-l-red-500",
  MEDIA: "border-l-amber-500",
  BAJA:  "border-l-slate-600",
};

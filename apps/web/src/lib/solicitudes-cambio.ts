/**
 * Helpers compartidos del flujo de solicitudes de cambio (`SolicitudCambioInfo`).
 *
 * El modelo cubre dos familias de `campo`:
 *   - "nombre" | "telefono" | "email" → se auto-aplican a `Perfil` al aprobar.
 *   - "orden_avisos"                  → reordenamiento de los contactos de aviso de una cuenta.
 *     SoftGuard es solo-lectura: NO se auto-aplica; el admin lo aplica a mano en la central y
 *     aprobar solo marca la solicitud como resuelta. `valor_nuevo` guarda el orden propuesto legible.
 */

export const CAMPO_ORDEN_AVISOS = "orden_avisos";

/** Etiqueta legible del `campo` de una solicitud (admin + historial del portal). */
export const CAMPO_LABEL: Record<string, string> = {
  nombre: "Nombre",
  telefono: "Teléfono",
  email: "Email",
  [CAMPO_ORDEN_AVISOS]: "Orden de avisos",
};

/** ¿El campo se auto-aplica en `Perfil` al aprobar? (true para nombre/telefono/email). */
export function esCampoPerfil(campo: string): boolean {
  return campo === "nombre" || campo === "telefono" || campo === "email";
}

export interface ContactoOrden {
  nombre: string;
  telefono?: string | null;
  rol?: string | null;
}

/**
 * Orden propuesto en texto legible y numerado, para que el admin lo aplique en SoftGuard.
 * Ej.: "1. Juan Pérez · 3436575372 · Titular".
 */
export function formatOrdenLegible(contactos: ContactoOrden[]): string {
  return contactos
    .map((c, i) => {
      const nombre = (c.nombre ?? "").trim() || "Sin nombre";
      const extra = [(c.telefono ?? "").trim(), (c.rol ?? "").trim()].filter(Boolean).join(" · ");
      return `${i + 1}. ${nombre}${extra ? ` · ${extra}` : ""}`;
    })
    .join("\n");
}

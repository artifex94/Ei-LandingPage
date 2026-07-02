/**
 * Diff puro de campos de Perfil para el detalle de AuditLog.
 *
 * Solo incluye los campos que efectivamente cambiaron. Los campos sensibles
 * (DNI) nunca viajan con su valor real en el audit — se marca "modificado"
 * para dejar rastro del cambio sin persistir el dato viejo/nuevo.
 */

export interface PerfilCampos {
  nombre?: string | null;
  dni?: string | null;
  telefono?: string | null;
  email?: string | null;
}

const CAMPOS_COMPARADOS = ["nombre", "dni", "telefono", "email"] as const;

const CAMPOS_SENSIBLES = new Set<(typeof CAMPOS_COMPARADOS)[number]>(["dni"]);

export type DiffCampoPerfil =
  | { antes: string | null; despues: string | null }
  | "modificado";

/** Devuelve solo los campos que cambiaron entre `antes` y `despues`. */
export function difCamposPerfil(
  antes: PerfilCampos,
  despues: PerfilCampos
): Record<string, DiffCampoPerfil> {
  const diff: Record<string, DiffCampoPerfil> = {};

  for (const campo of CAMPOS_COMPARADOS) {
    const valorAntes = antes[campo] ?? null;
    const valorDespues = despues[campo] ?? null;
    if (valorAntes === valorDespues) continue;

    diff[campo] = CAMPOS_SENSIBLES.has(campo)
      ? "modificado"
      : { antes: valorAntes, despues: valorDespues };
  }

  return diff;
}

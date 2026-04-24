import { withSoftguardConnection } from "./client";
import type { SgCuentaResumen, SgEventoReciente, SgOTEstado } from "./schema";

// ── Queries ────────────────────────────────────────────────────────────────────

export async function getCuentaCount() {
  return withSoftguardConnection(
    async (pool) => {
      const result = await pool
        .request()
        .query<{ count: number }>("SELECT COUNT(*) AS count FROM dbo.vw_ei_cuentas_resumen");
      return result.recordset[0].count;
    },
    () => 0
  );
}

export async function getCuentaBySoftguardRef(ref: string) {
  return withSoftguardConnection(
    async (pool) => {
      const result = await pool
        .request()
        .input("ref", ref)
        .query<SgCuentaResumen>(
          "SELECT * FROM dbo.vw_ei_cuentas_resumen WHERE softguard_ref = @ref"
        );
      return result.recordset[0] ?? null;
    },
    () => null
  );
}

export async function getCuentasResumen(limit = 200) {
  return withSoftguardConnection(
    async (pool) => {
      const result = await pool
        .request()
        .input("top", limit)
        .query<SgCuentaResumen>(
          "SELECT TOP (@top) * FROM dbo.vw_ei_cuentas_resumen ORDER BY softguard_ref"
        );
      return result.recordset;
    },
    () => [] as SgCuentaResumen[]
  );
}

export async function getUltimosEventos(softguard_ref: string, limit = 50) {
  return withSoftguardConnection(
    async (pool) => {
      const result = await pool
        .request()
        .input("ref", softguard_ref)
        .input("top", limit)
        .query<SgEventoReciente>(
          `SELECT TOP (@top) *
           FROM dbo.vw_ei_eventos_recientes
           WHERE softguard_ref = @ref
           ORDER BY fecha_evento DESC`
        );
      return result.recordset;
    },
    () => [] as SgEventoReciente[]
  );
}

export async function getOTsByCuenta(softguard_ref: string) {
  return withSoftguardConnection(
    async (pool) => {
      const result = await pool
        .request()
        .input("ref", softguard_ref)
        .query<SgOTEstado>(
          `SELECT *
           FROM dbo.vw_ei_ot_estado
           WHERE softguard_ref = @ref
           ORDER BY fecha_creacion DESC`
        );
      return result.recordset;
    },
    () => [] as SgOTEstado[]
  );
}

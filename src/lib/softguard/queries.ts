import { withSoftguardConnection } from "./client";
import type { SgCuentaResumen, SgEventoReciente, SgOTEstado } from "./schema";

// ── Mock data ──────────────────────────────────────────────────────────────────

const MOCK_CUENTAS: SgCuentaResumen[] = [
  {
    softguard_ref: "0001",
    nombre_titular: "MOCK — García Juan",
    direccion: "San Martín 100",
    localidad: "Victoria",
    telefono: "3436-123456",
    situacion: "Habilitada",
    acceso_web: true,
    dealer_id: 1,
    org_id: 1,
    ultimo_evento_fecha: new Date("2026-01-15T03:22:00Z"),
    ultimo_evento_codigo: "E130",
    activa: true,
  },
  {
    softguard_ref: "0002",
    nombre_titular: "MOCK — López María",
    direccion: "Belgrano 200",
    localidad: "Victoria",
    telefono: "3436-654321",
    situacion: "Habilitada",
    acceso_web: false,
    dealer_id: 1,
    org_id: null,
    ultimo_evento_fecha: null,
    ultimo_evento_codigo: null,
    activa: true,
  },
];

// ── Queries ────────────────────────────────────────────────────────────────────

export async function getCuentaCount() {
  return withSoftguardConnection(
    async (pool) => {
      const result = await pool.request().query<{ count: number }>(
        "SELECT COUNT(*) AS count FROM vw_ei_cuentas_resumen"
      );
      return result.recordset[0].count;
    },
    () => MOCK_CUENTAS.length
  );
}

export async function getCuentaBySoftguardRef(ref: string) {
  return withSoftguardConnection(
    async (pool) => {
      const result = await pool
        .request()
        .input("ref", ref)
        .query<SgCuentaResumen>(
          "SELECT * FROM vw_ei_cuentas_resumen WHERE softguard_ref = @ref"
        );
      return result.recordset[0] ?? null;
    },
    () => MOCK_CUENTAS.find((c) => c.softguard_ref === ref) ?? null
  );
}

export async function getCuentasResumen(limit = 200) {
  return withSoftguardConnection(
    async (pool) => {
      const result = await pool
        .request()
        .input("top", limit)
        .query<SgCuentaResumen>(
          "SELECT TOP (@top) * FROM vw_ei_cuentas_resumen ORDER BY softguard_ref"
        );
      return result.recordset;
    },
    () => MOCK_CUENTAS.slice(0, limit)
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
          `SELECT TOP (@top) * FROM vw_ei_eventos_recientes
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
          `SELECT * FROM vw_ei_ot_estado
           WHERE softguard_ref = @ref
           ORDER BY fecha_creacion DESC`
        );
      return result.recordset;
    },
    () => [] as SgOTEstado[]
  );
}

import { withSoftguardConnection } from "./client";
import type { SgCuentaResumen, SgEventoReciente, SgOTEstado } from "./schema";

// ── Mock data ──────────────────────────────────────────────────────────────────

const MOCK_CUENTAS: SgCuentaResumen[] = [
  {
    iid: 1,
    linea: "001",
    softguard_ref: "0001",
    nombre_titular: "MOCK — García Juan",
    direccion: "San Martín 100",
    localidad: "Victoria",
    provincia: "ER",
    telefono: "3436-123456",
    email: "",
    fecha_alta: new Date("2022-01-15"),
    fecha_servicio: new Date("2022-01-15"),
    activa: 1,
    engine_status: 1,
    ultima_alarma_codigo: "E130",
    ultima_alarma_fecha: new Date("2026-01-15T03:22:00Z"),
    estado_panel: 1,
    estado_panel_fecha: new Date("2026-01-15T03:22:00Z"),
  },
  {
    iid: 2,
    linea: "001",
    softguard_ref: "0002",
    nombre_titular: "MOCK — López María",
    direccion: "Belgrano 200",
    localidad: "Victoria",
    provincia: "ER",
    telefono: "3436-654321",
    email: "",
    fecha_alta: new Date("2023-03-10"),
    fecha_servicio: new Date("2023-03-10"),
    activa: 1,
    engine_status: 1,
    ultima_alarma_codigo: "",
    ultima_alarma_fecha: null,
    estado_panel: 0,
    estado_panel_fecha: null,
  },
];

// ── Queries ────────────────────────────────────────────────────────────────────

export async function getCuentaCount() {
  return withSoftguardConnection(
    async (pool) => {
      const result = await pool
        .request()
        .query<{ count: number }>("SELECT COUNT(*) AS count FROM dbo.vw_ei_cuentas_resumen");
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
          "SELECT * FROM dbo.vw_ei_cuentas_resumen WHERE softguard_ref = @ref"
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
          "SELECT TOP (@top) * FROM dbo.vw_ei_cuentas_resumen ORDER BY softguard_ref"
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

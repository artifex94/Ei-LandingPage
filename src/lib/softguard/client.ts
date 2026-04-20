import sql from "mssql";

// Modo mock: activo cuando SOFTGUARD_MOCK=true o cuando faltan las credenciales.
// Permite desarrollar y correr CI sin acceso real al servidor SQL Server.
export function isMockMode(): boolean {
  return (
    process.env.SOFTGUARD_MOCK === "true" ||
    !process.env.SOFTGUARD_DB_HOST ||
    !process.env.SOFTGUARD_DB_PASS
  );
}

const poolConfig: sql.config = {
  server: process.env.SOFTGUARD_DB_HOST ?? "localhost",
  port: parseInt(process.env.SOFTGUARD_DB_PORT ?? "1433", 10),
  user: process.env.SOFTGUARD_DB_USER ?? "EI_PORTAL_RO",
  password: process.env.SOFTGUARD_DB_PASS ?? "",
  database: process.env.SOFTGUARD_DB_NAME ?? "SoftGuard",
  options: {
    trustServerCertificate: true,
    encrypt: true,
    connectTimeout: 8000,
    requestTimeout: 10000,
  },
  pool: {
    max: 5,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

// Pool singleton — reutilizado entre invocaciones en el mismo proceso.
const globalForSg = globalThis as unknown as { _sgPool: sql.ConnectionPool | undefined };

async function getPool(): Promise<sql.ConnectionPool> {
  if (globalForSg._sgPool?.connected) return globalForSg._sgPool;

  const pool = new sql.ConnectionPool(poolConfig);
  await pool.connect();
  globalForSg._sgPool = pool;
  return pool;
}

export type SoftGuardResult<T> =
  | { ok: true; data: T; mock: false }
  | { ok: false; error: string; mock: false }
  | { ok: true; data: T; mock: true };

// Wrapper principal. Toda query del portal pasa por acá.
// Si SoftGuard no está disponible → devuelve error sin romper la app.
export async function withSoftguardConnection<T>(
  fn: (pool: sql.ConnectionPool) => Promise<T>,
  mockFallback: () => T
): Promise<SoftGuardResult<T>> {
  if (isMockMode()) {
    return { ok: true, data: mockFallback(), mock: true };
  }

  try {
    const pool = await getPool();
    const data = await fn(pool);
    return { ok: true, data, mock: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Reset pool para que el siguiente intento reconecte
    if (globalForSg._sgPool) {
      try { await globalForSg._sgPool.close(); } catch { /* ignore */ }
      globalForSg._sgPool = undefined;
    }
    return { ok: false, error: message, mock: false };
  }
}

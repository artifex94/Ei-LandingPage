/**
 * Aplica las policies RLS de Fase 3 contra Supabase.
 * Uso: npx tsx --env-file=.env.local scripts/aplicar-rls.ts
 */
import { readFileSync } from "fs";
import { join } from "path";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL no encontrada en .env.local");
  process.exit(1);
}

// Usamos la URL directa (no Supavisor) para DDL + RLS
const sql = postgres(url, { max: 1, onnotice: () => {} });

async function main() {
  const sqlPath = join(process.cwd(), "../../database/rls-fase3.sql");
  const query = readFileSync(sqlPath, "utf8");

  console.log("── Aplicando RLS Fase 3 ─────────────────────────────────────\n");

  try {
    await sql.unsafe(query);
    console.log("  ✓ Policies aplicadas correctamente");
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("  ✗ Error:", err.message ?? e);
    process.exit(1);
  } finally {
    await sql.end();
  }

  console.log("\n── Listo ────────────────────────────────────────────────────");
}

main();

-- ─────────────────────────────────────────────────────────────────────────────
-- Alta ADITIVA de `ParametroNegocio` (Fase 1 — parámetros de negocio sin deploy)
--
-- Contexto: `npx prisma db push` no se pudo correr contra la DB de Supabase
-- porque el schema tiene drift preexistente y NO relacionado con este cambio
-- (ver prisma/sql-manual/2026-06-24_drift-aditivos.sql) que dispara warnings
-- de pérdida de datos (DROP de zonas_actividad con 265 filas, columnas con
-- datos reales, etc.). Correr `db push` a secas hubiera exigido
-- --accept-data-loss, lo cual habría intentado aplicar TAMBIÉN esos drops
-- ajenos a esta feature. Este script aplica SOLO lo aditivo de esta fase.
--
-- Es seguro: solo CREATE TYPE / CREATE TABLE, nada existente se toca.
-- Idempotente (se puede correr más de una vez sin error).
--
-- Cómo correrlo: Supabase → SQL Editor → pegar y ejecutar. (O psql con la
-- connection string del proyecto.) Hasta que se corra, `getParam()` sigue
-- devolviendo los fallbacks hardcodeados (la tabla no existe todavía) — cero
-- impacto funcional.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Enum TipoParametro
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TipoParametro') THEN
    CREATE TYPE "TipoParametro" AS ENUM ('INT', 'DECIMAL', 'STRING', 'JSON');
  END IF;
END$$;

-- 2) Tabla parametros_negocio
CREATE TABLE IF NOT EXISTS "parametros_negocio" (
  "clave"       TEXT NOT NULL,
  "valor"       TEXT NOT NULL,
  "tipo"        "TipoParametro" NOT NULL,
  "categoria"   TEXT NOT NULL,
  "descripcion" TEXT NOT NULL,
  "updated_por" TEXT,
  "updated_at"  TIMESTAMP(3) NOT NULL,

  CONSTRAINT "parametros_negocio_pkey" PRIMARY KEY ("clave")
);

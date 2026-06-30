-- ─────────────────────────────────────────────────────────────────────────────
-- Sincronización ADITIVA del drift schema ↔ DB (2026-06-24)
--
-- Contexto: el commit 4a4e709 ("contactos de aviso por prioridad") agregó al
-- schema columnas que nunca se migraron a la DB de Supabase. Esto rompe TODO
-- query de cuentas (ej. /portal/dashboard) con:
--   "The column cuentas.iid_softguard does not exist in the current database"
--
-- Este script aplica SOLO los cambios ADITIVOS (ADD COLUMN / INDEX / FK).
-- Es seguro: no borra ni modifica datos existentes. Idempotente (se puede
-- correr más de una vez sin error).
--
-- NO incluye los DROPs del diff de Prisma (zonas_actividad = 265 filas,
-- eventos_alarma.zona_codigo = 5477 filas, sensores.pendiente_aprobacion = 27,
-- enum TipoSensor con valor extra 'OTRO'). Esos objetos tienen DATOS REALES y
-- su limpieza/migración debe decidirse aparte, conscientemente.
--
-- Cómo correrlo: Supabase → SQL Editor → pegar y ejecutar. (O psql con la
-- connection string del proyecto.) Tras correrlo, recargá /portal/dashboard.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) cuentas.iid_softguard — id interno de la cuenta en la central (rec_iidcuenta)
ALTER TABLE "cuentas"
  ADD COLUMN IF NOT EXISTS "iid_softguard" INTEGER;

-- 2) solicitudes_cambio_info.cuenta_id — relación opcional con la cuenta
ALTER TABLE "solicitudes_cambio_info"
  ADD COLUMN IF NOT EXISTS "cuenta_id" TEXT;

-- 3) Índice del nuevo FK
CREATE INDEX IF NOT EXISTS "solicitudes_cambio_info_cuenta_id_idx"
  ON "solicitudes_cambio_info" ("cuenta_id");

-- 4) Foreign key (con guard para idempotencia: ADD CONSTRAINT no soporta IF NOT EXISTS)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'solicitudes_cambio_info_cuenta_id_fkey'
  ) THEN
    ALTER TABLE "solicitudes_cambio_info"
      ADD CONSTRAINT "solicitudes_cambio_info_cuenta_id_fkey"
      FOREIGN KEY ("cuenta_id") REFERENCES "cuentas" ("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;

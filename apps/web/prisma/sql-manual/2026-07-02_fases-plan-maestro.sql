-- ─────────────────────────────────────────────────────────────────────────────
-- Alta ADITIVA — Fase 2 del plan maestro: conversión Solicitud→OT
--
-- Contexto: igual que en 2026-07-02_parametro-negocio.sql, `npx prisma db
-- push` no se puede correr a secas contra la DB de Supabase porque el schema
-- tiene drift preexistente y no relacionado (ver
-- prisma/sql-manual/2026-06-24_drift-aditivos.sql) que dispararía
-- --accept-data-loss y arrastraría esos drops ajenos. Este script aplica SOLO
-- lo aditivo de esta fase.
--
-- Es seguro: solo ADD COLUMN (nullable) + UNIQUE index, nada existente se
-- toca ni se borra. Idempotente (se puede correr más de una vez sin error).
--
-- Cómo correrlo: Supabase → SQL Editor → pegar y ejecutar. (O psql con la
-- connection string del proyecto.) Hasta que se corra, `crearOTDesdeSolicitud`
-- fallaría al intentar escribir `ot_id` — correr ANTES de habilitar el botón
-- "Convertir en OT" en producción.
-- ─────────────────────────────────────────────────────────────────────────────

-- Fase 2: link 1:1 SolicitudMantenimiento -> OrdenTrabajo
ALTER TABLE "solicitudes_mantenimiento"
  ADD COLUMN IF NOT EXISTS "ot_id" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'solicitudes_mantenimiento' AND indexname = 'solicitudes_mantenimiento_ot_id_key'
  ) THEN
    CREATE UNIQUE INDEX "solicitudes_mantenimiento_ot_id_key" ON "solicitudes_mantenimiento"("ot_id");
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'solicitudes_mantenimiento_ot_id_fkey'
  ) THEN
    ALTER TABLE "solicitudes_mantenimiento"
      ADD CONSTRAINT "solicitudes_mantenimiento_ot_id_fkey"
      FOREIGN KEY ("ot_id") REFERENCES "ordenes_trabajo"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;

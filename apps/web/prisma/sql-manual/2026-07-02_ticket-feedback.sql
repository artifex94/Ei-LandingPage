-- ─────────────────────────────────────────────────────────────────────────────
-- Alta ADITIVA — Tickets de feedback (bucle cerrado portal → admin)
--
-- Contexto: igual que en 2026-07-02_parametro-negocio.sql, `npx prisma db
-- push` no se puede correr a secas contra la DB de Supabase por el drift
-- preexistente y no relacionado (ver prisma/sql-manual/2026-06-24_drift-aditivos.sql).
-- Este script aplica SOLO lo aditivo de esta feature.
--
-- Es seguro: solo CREATE TYPE / CREATE TABLE, nada existente se toca.
-- Idempotente (se puede correr más de una vez sin error).
--
-- Cómo correrlo: Supabase → SQL Editor → pegar y ejecutar. Hasta que se
-- corra, las queries de TicketFeedback fallan — por eso la bandeja
-- /admin/feedback y el conteo del sidebar usan `.catch(() => [])` / `.catch(() => 0)`.
--
-- Pendiente operativo (fuera de este script): crear el bucket de Storage
-- "feedback-adjuntos" en Supabase (Dashboard → Storage → New bucket, público
-- para lectura) — los buckets no se crean por código en este proyecto (ver
-- "ot-fotos"/"ot-firmas"/"facturas", todos creados a mano).
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TipoTicketFeedback') THEN
    CREATE TYPE "TipoTicketFeedback" AS ENUM ('BUG', 'MEJORA');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PrioridadTicket') THEN
    CREATE TYPE "PrioridadTicket" AS ENUM ('BAJA', 'MEDIA', 'ALTA', 'CRITICA');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EstadoTicketFeedback') THEN
    CREATE TYPE "EstadoTicketFeedback" AS ENUM ('NUEVO', 'EN_REVISION', 'RESUELTO', 'DESCARTADO');
  END IF;
END$$;

-- 2) Tabla tickets_feedback
CREATE TABLE IF NOT EXISTS "tickets_feedback" (
  "id"             TEXT NOT NULL,
  "perfil_id"      TEXT NOT NULL,
  "tipo"           "TipoTicketFeedback" NOT NULL,
  "descripcion"    TEXT NOT NULL,
  "prioridad"      "PrioridadTicket" NOT NULL,
  "estado"         "EstadoTicketFeedback" NOT NULL DEFAULT 'NUEVO',
  "adjunto_url"    TEXT,
  "adjunto_mime"   TEXT,
  "creado_en"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizado_en" TIMESTAMP(3) NOT NULL,
  "resuelto_en"    TIMESTAMP(3),
  "nota_admin"     TEXT,

  CONSTRAINT "tickets_feedback_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'tickets_feedback' AND indexname = 'tickets_feedback_estado_creado_en_idx'
  ) THEN
    CREATE INDEX "tickets_feedback_estado_creado_en_idx" ON "tickets_feedback"("estado", "creado_en");
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'tickets_feedback' AND indexname = 'tickets_feedback_perfil_id_idx'
  ) THEN
    CREATE INDEX "tickets_feedback_perfil_id_idx" ON "tickets_feedback"("perfil_id");
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tickets_feedback_perfil_id_fkey'
  ) THEN
    ALTER TABLE "tickets_feedback"
      ADD CONSTRAINT "tickets_feedback_perfil_id_fkey"
      FOREIGN KEY ("perfil_id") REFERENCES "perfiles"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END$$;

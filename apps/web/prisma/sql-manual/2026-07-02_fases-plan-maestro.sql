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

-- ─────────────────────────────────────────────────────────────────────────────
-- Fase 3: cola "A suspender hoy" — tabla candidatos_suspension
--
-- El cron mensual detecta cuentas ACTIVA con DPD >= DIAS_SUSPENSION y genera/
-- actualiza un candidato ABIERTO (resuelto_en IS NULL) por cuenta; el tesorero
-- decide manualmente desde /cobros si suspende (escribe cuentas.estado =
-- SUSPENDIDA_PAGO) o condona. La suspensión NUNCA es automática.
--
-- Un candidato ABIERTO por cuenta es la regla de unicidad real (no por
-- generado_en): el índice único parcial de abajo lo refuerza a nivel de DB
-- además del check a nivel de aplicación (findFirst con resuelto_en: null).
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AccionSuspension') THEN
    CREATE TYPE "AccionSuspension" AS ENUM ('SUSPENDIDA', 'CONDONADA', 'PAGO_RECIBIDO');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS "candidatos_suspension" (
  "id"          TEXT NOT NULL,
  "cuenta_id"   TEXT NOT NULL,
  "dpd"         INTEGER NOT NULL,
  "deuda_total" DECIMAL(10,2) NOT NULL,
  "generado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resuelto_en" TIMESTAMP(3),
  "accion"      "AccionSuspension",

  CONSTRAINT "candidatos_suspension_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'candidatos_suspension' AND indexname = 'candidatos_suspension_cuenta_id_resuelto_en_idx'
  ) THEN
    CREATE INDEX "candidatos_suspension_cuenta_id_resuelto_en_idx" ON "candidatos_suspension"("cuenta_id", "resuelto_en");
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'candidatos_suspension' AND indexname = 'candidatos_suspension_resuelto_en_idx'
  ) THEN
    CREATE INDEX "candidatos_suspension_resuelto_en_idx" ON "candidatos_suspension"("resuelto_en");
  END IF;
END$$;

-- Índice único parcial: un solo candidato ABIERTO por cuenta (no representable
-- en schema.prisma sin preview feature de índices parciales).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'candidatos_suspension' AND indexname = 'candidatos_suspension_cuenta_id_abierto_key'
  ) THEN
    CREATE UNIQUE INDEX "candidatos_suspension_cuenta_id_abierto_key"
      ON "candidatos_suspension"("cuenta_id")
      WHERE "resuelto_en" IS NULL;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'candidatos_suspension_cuenta_id_fkey'
  ) THEN
    ALTER TABLE "candidatos_suspension"
      ADD CONSTRAINT "candidatos_suspension_cuenta_id_fkey"
      FOREIGN KEY ("cuenta_id") REFERENCES "cuentas"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Fase 5: panel de salud de crons — tabla cron_runs
--
-- Historial de corridas de los 3 crons (cierre mensual, sync SoftGuard,
-- auto-turnos), escrito por el wrapper `conRegistroCronRun`
-- (src/lib/cron-run.ts). Sin esto un cron caído (ej. sync SoftGuard muerto)
-- es invisible hasta que reclama un cliente — ver /admin/sync-softguard.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EstadoCronRun') THEN
    CREATE TYPE "EstadoCronRun" AS ENUM ('OK', 'ERROR');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS "cron_runs" (
  "id"          TEXT NOT NULL,
  "cron"        TEXT NOT NULL,
  "estado"      "EstadoCronRun" NOT NULL,
  "started_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finished_at" TIMESTAMP(3),
  "duracion_ms" INTEGER,
  "resumen"     TEXT,

  CONSTRAINT "cron_runs_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'cron_runs' AND indexname = 'cron_runs_cron_started_at_idx'
  ) THEN
    CREATE INDEX "cron_runs_cron_started_at_idx" ON "cron_runs"("cron", "started_at" DESC);
  END IF;
END$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Fase 6: conciliación bancaria — tabla movimientos_bancarios
--
-- Hoy las transferencias avisadas (`avisarTransferencia`, Pago PROCESANDO con
-- ref_externa "EI-{12hex}") se buscan a ojo en el homebanking. Esta tabla
-- persiste el extracto CSV importado (solo créditos) para proponer matches
-- contra `Pago` por ref_externa o por importe; conciliar es siempre decisión
-- del tesorero (ver src/lib/actions/conciliacion.ts). `hash` es la clave de
-- idempotencia del import (createMany + skipDuplicates).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "movimientos_bancarios" (
  "id"            TEXT NOT NULL,
  "hash"          TEXT NOT NULL,
  "fecha"         DATE NOT NULL,
  "importe"       DECIMAL(10,2) NOT NULL,
  "descripcion"   TEXT NOT NULL,
  "pago_id"       TEXT,
  "conciliado_en" TIMESTAMP(3),
  "importado_en"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "importado_por" TEXT NOT NULL,

  CONSTRAINT "movimientos_bancarios_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'movimientos_bancarios' AND indexname = 'movimientos_bancarios_hash_key'
  ) THEN
    CREATE UNIQUE INDEX "movimientos_bancarios_hash_key" ON "movimientos_bancarios"("hash");
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'movimientos_bancarios' AND indexname = 'movimientos_bancarios_fecha_idx'
  ) THEN
    CREATE INDEX "movimientos_bancarios_fecha_idx" ON "movimientos_bancarios"("fecha");
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'movimientos_bancarios' AND indexname = 'movimientos_bancarios_conciliado_en_idx'
  ) THEN
    CREATE INDEX "movimientos_bancarios_conciliado_en_idx" ON "movimientos_bancarios"("conciliado_en");
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'movimientos_bancarios_pago_id_fkey'
  ) THEN
    ALTER TABLE "movimientos_bancarios"
      ADD CONSTRAINT "movimientos_bancarios_pago_id_fkey"
      FOREIGN KEY ("pago_id") REFERENCES "pagos"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Fase 7a: timestamps de gestión — eventos_alarma
--
-- EventoAlarma no registraba CUÁNDO se tomó ni se resolvió un evento ni por
-- quién, así que era imposible medir tiempos de atención. `actualizarEstadoEvento`
-- (src/lib/actions/eventos.ts) los pobla al pasar a EN_PROCESO (tomado_en/
-- tomado_por) y al resolver (resuelto_en), solo si estaban NULL — no se pisan
-- en re-tomas ni re-resoluciones. El índice (estado, fecha_evento) acelera la
-- query de métricas del día en /monitoreo.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE "eventos_alarma"
  ADD COLUMN IF NOT EXISTS "tomado_en" TIMESTAMP(3);

ALTER TABLE "eventos_alarma"
  ADD COLUMN IF NOT EXISTS "tomado_por" TEXT;

ALTER TABLE "eventos_alarma"
  ADD COLUMN IF NOT EXISTS "resuelto_en" TIMESTAMP(3);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'eventos_alarma' AND indexname = 'eventos_alarma_estado_fecha_evento_idx'
  ) THEN
    CREATE INDEX "eventos_alarma_estado_fecha_evento_idx" ON "eventos_alarma"("estado", "fecha_evento");
  END IF;
END$$;

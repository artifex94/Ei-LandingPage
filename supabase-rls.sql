-- ═══════════════════════════════════════════════════════════════════════
-- RLS — Row Level Security para EscobarInstalaciones
-- Ejecutar en: Supabase Dashboard → SQL Editor → Run
-- ═══════════════════════════════════════════════════════════════════════

-- Habilitar RLS en todas las tablas
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cuentas ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensores ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitudes_mantenimiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarifas_historico ENABLE ROW LEVEL SECURITY;

-- ─── PERFILES ────────────────────────────────────────────────────────────────

CREATE POLICY "perfil_propio_select" ON perfiles
  FOR SELECT USING (auth.uid()::text = id);

CREATE POLICY "perfil_propio_update" ON perfiles
  FOR UPDATE USING (auth.uid()::text = id);

-- ─── CUENTAS ─────────────────────────────────────────────────────────────────

CREATE POLICY "cuentas_propias_select" ON cuentas
  FOR SELECT USING (perfil_id = auth.uid()::text);

-- ─── SENSORES ────────────────────────────────────────────────────────────────

CREATE POLICY "sensores_propios_select" ON sensores
  FOR SELECT USING (
    cuenta_id IN (
      SELECT id FROM cuentas WHERE perfil_id = auth.uid()::text
    )
  );

-- ─── PAGOS ───────────────────────────────────────────────────────────────────

CREATE POLICY "pagos_propios_select" ON pagos
  FOR SELECT USING (
    cuenta_id IN (
      SELECT id FROM cuentas WHERE perfil_id = auth.uid()::text
    )
  );

-- ─── SOLICITUDES DE MANTENIMIENTO ────────────────────────────────────────────

CREATE POLICY "solicitudes_propias_select" ON solicitudes_mantenimiento
  FOR SELECT USING (
    cuenta_id IN (
      SELECT id FROM cuentas WHERE perfil_id = auth.uid()::text
    )
  );

CREATE POLICY "solicitudes_propias_insert" ON solicitudes_mantenimiento
  FOR INSERT WITH CHECK (
    cuenta_id IN (
      SELECT id FROM cuentas WHERE perfil_id = auth.uid()::text
    )
  );

-- ─── TARIFAS (solo lectura para autenticados) ─────────────────────────────────

CREATE POLICY "tarifas_select_autenticados" ON tarifas_historico
  FOR SELECT USING (auth.uid()::text IS NOT NULL);

-- ═══════════════════════════════════════════════════════════════════════
-- NOTA: Los Server Actions del admin usan service_role key que bypasea
-- RLS por diseño de Supabase. No hace falta política ADMIN específica.
-- ═══════════════════════════════════════════════════════════════════════

-- ─── SOLICITUDES DE CAMBIO DE INFO ───────────────────────────────────────────

ALTER TABLE solicitudes_cambio_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cambio_info_propio_select" ON solicitudes_cambio_info
  FOR SELECT USING (auth.uid()::text = perfil_id);

CREATE POLICY "cambio_info_propio_insert" ON solicitudes_cambio_info
  FOR INSERT WITH CHECK (auth.uid()::text = perfil_id);

-- No UPDATE / DELETE para clientes. Admins usan service_role que bypasea RLS.

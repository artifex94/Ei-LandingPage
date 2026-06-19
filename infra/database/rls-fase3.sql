-- ═══════════════════════════════════════════════════════════════════════════════
-- RLS — Fase 3: ordenes_trabajo + tablas de soporte
-- Ejecutar en Supabase Dashboard → SQL Editor
--   o via: npx tsx --env-file=.env.local scripts/aplicar-rls.ts
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. Habilitar RLS en tablas nuevas ────────────────────────────────────────

ALTER TABLE ordenes_trabajo    ENABLE ROW LEVEL SECURITY;
ALTER TABLE empleados          ENABLE ROW LEVEL SECURITY;
ALTER TABLE turnos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehiculos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservas_vehiculo  ENABLE ROW LEVEL SECURITY;
ALTER TABLE facturas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE factura_items      ENABLE ROW LEVEL SECURITY;

-- ── 2. Limpiar policies anteriores (idempotente) ─────────────────────────────

DROP POLICY IF EXISTS "admin_select_ot"              ON ordenes_trabajo;
DROP POLICY IF EXISTS "admin_insert_ot"              ON ordenes_trabajo;
DROP POLICY IF EXISTS "admin_update_ot"              ON ordenes_trabajo;
DROP POLICY IF EXISTS "admin_delete_ot"              ON ordenes_trabajo;
DROP POLICY IF EXISTS "tecnico_select_ot"            ON ordenes_trabajo;
DROP POLICY IF EXISTS "tecnico_update_ot"            ON ordenes_trabajo;
DROP POLICY IF EXISTS "cliente_select_ot"            ON ordenes_trabajo;
DROP POLICY IF EXISTS "cliente_insert_ot"            ON ordenes_trabajo;

DROP POLICY IF EXISTS "admin_all_empleado"           ON empleados;
DROP POLICY IF EXISTS "empleado_ver_propio"          ON empleados;

DROP POLICY IF EXISTS "admin_all_turno"              ON turnos;
DROP POLICY IF EXISTS "empleado_ver_propios_turnos"  ON turnos;

DROP POLICY IF EXISTS "admin_all_vehiculo"           ON vehiculos;

DROP POLICY IF EXISTS "admin_all_reserva"            ON reservas_vehiculo;
DROP POLICY IF EXISTS "empleado_ver_reservas"        ON reservas_vehiculo;

DROP POLICY IF EXISTS "admin_all_factura"            ON facturas;
DROP POLICY IF EXISTS "cliente_ver_factura"          ON facturas;
DROP POLICY IF EXISTS "admin_all_factura_item"       ON factura_items;

-- ═══════════════════════════════════════════════════════════════════════════════
-- ORDENES_TRABAJO
-- ═══════════════════════════════════════════════════════════════════════════════

-- Admin: acceso total
CREATE POLICY "admin_select_ot" ON ordenes_trabajo FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid()::text AND rol = 'ADMIN'));

CREATE POLICY "admin_insert_ot" ON ordenes_trabajo FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid()::text AND rol = 'ADMIN'));

CREATE POLICY "admin_update_ot" ON ordenes_trabajo FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid()::text AND rol = 'ADMIN'));

CREATE POLICY "admin_delete_ot" ON ordenes_trabajo FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid()::text AND rol = 'ADMIN'));

-- Técnico: ver y actualizar sus OTs asignadas
CREATE POLICY "tecnico_select_ot" ON ordenes_trabajo FOR SELECT TO authenticated
USING (
  tecnico_id IN (SELECT id FROM empleados WHERE perfil_id = auth.uid()::text)
);

CREATE POLICY "tecnico_update_ot" ON ordenes_trabajo FOR UPDATE TO authenticated
USING (
  tecnico_id IN (SELECT id FROM empleados WHERE perfil_id = auth.uid()::text)
)
WITH CHECK (
  tecnico_id IN (SELECT id FROM empleados WHERE perfil_id = auth.uid()::text)
);

-- Cliente: ver sus propias OTs (vinculadas por perfil directo o por cuenta)
CREATE POLICY "cliente_select_ot" ON ordenes_trabajo FOR SELECT TO authenticated
USING (
  perfil_id = auth.uid()::text
  OR cuenta_id IN (SELECT id FROM cuentas WHERE perfil_id = auth.uid()::text)
);

-- Cliente: crear OT (solicitar servicio desde el portal)
CREATE POLICY "cliente_insert_ot" ON ordenes_trabajo FOR INSERT TO authenticated
WITH CHECK (
  perfil_id = auth.uid()::text
  OR cuenta_id IN (SELECT id FROM cuentas WHERE perfil_id = auth.uid()::text)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- EMPLEADOS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Admin: acceso total
CREATE POLICY "admin_all_empleado" ON empleados FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid()::text AND rol = 'ADMIN'))
WITH CHECK (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid()::text AND rol = 'ADMIN'));

-- Empleado: ver su propio registro (necesario para /tecnico)
CREATE POLICY "empleado_ver_propio" ON empleados FOR SELECT TO authenticated
USING (perfil_id = auth.uid()::text);

-- ═══════════════════════════════════════════════════════════════════════════════
-- TURNOS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE POLICY "admin_all_turno" ON turnos FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid()::text AND rol = 'ADMIN'))
WITH CHECK (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid()::text AND rol = 'ADMIN'));

CREATE POLICY "empleado_ver_propios_turnos" ON turnos FOR SELECT TO authenticated
USING (
  empleado_id IN (SELECT id FROM empleados WHERE perfil_id = auth.uid()::text)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- VEHÍCULOS + RESERVAS_VEHICULO
-- ═══════════════════════════════════════════════════════════════════════════════

-- Vehículo: solo admin
CREATE POLICY "admin_all_vehiculo" ON vehiculos FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid()::text AND rol = 'ADMIN'))
WITH CHECK (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid()::text AND rol = 'ADMIN'));

-- Reservas: admin full, técnico ve las suyas
CREATE POLICY "admin_all_reserva" ON reservas_vehiculo FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid()::text AND rol = 'ADMIN'))
WITH CHECK (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid()::text AND rol = 'ADMIN'));

CREATE POLICY "empleado_ver_reservas" ON reservas_vehiculo FOR SELECT TO authenticated
USING (
  empleado_id IN (SELECT id FROM empleados WHERE perfil_id = auth.uid()::text)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- FACTURAS + FACTURA_ITEMS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Facturas: admin full, cliente ve las suyas
CREATE POLICY "admin_all_factura" ON facturas FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid()::text AND rol = 'ADMIN'))
WITH CHECK (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid()::text AND rol = 'ADMIN'));

CREATE POLICY "cliente_ver_factura" ON facturas FOR SELECT TO authenticated
USING (perfil_id = auth.uid()::text);

-- Items de factura: solo admin (se acceden siempre via join con facturas)
CREATE POLICY "admin_all_factura_item" ON factura_items FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid()::text AND rol = 'ADMIN'))
WITH CHECK (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid()::text AND rol = 'ADMIN'));

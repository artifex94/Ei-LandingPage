CREATE INDEX IF NOT EXISTS pagos_estado_idx ON pagos(estado);
CREATE INDEX IF NOT EXISTS pagos_mes_anio_idx ON pagos(mes, anio);

-- ============================================================
-- Script DDL — Vistas read-only para el Portal EI
-- Base de datos destino: [_Datos] (SoftGuard SQL Server)
--
-- Prerrequisito: usuario EI_PORTAL_RO ya existe con db_datareader
-- (CREATE LOGIN / CREATE USER ejecutados previamente por sysadmin)
--
-- Ejecutar con usuario que tenga permisos de CREATE VIEW en _Datos.
-- ============================================================

USE [_Datos]
GO

-- ──────────────────────────────────────────────────────────────
-- 1. vw_ei_cuentas_resumen
--    Fuentes: m_cuentas, m_CuentasXtraInfo, m_status
-- ──────────────────────────────────────────────────────────────
CREATE OR ALTER VIEW dbo.vw_ei_cuentas_resumen AS
SELECT
    -- Identificador interno (INT) — usar para JOINs rápidos
    c.cue_iid                                                AS iid,

    -- Identificador de línea/dealer (CHAR 3)
    RTRIM(c.cue_clinea)                                      AS linea,

    -- Número de cuenta (el "softguard_ref" que guarda el portal)
    RTRIM(c.cue_ncuenta)                                     AS softguard_ref,

    -- Datos del titular
    RTRIM(c.cue_cnombre)                                     AS nombre_titular,
    RTRIM(c.cue_ccalle)                                      AS direccion,
    RTRIM(c.cue_clocalidad)                                  AS localidad,
    RTRIM(c.cue_cprovincia)                                  AS provincia,
    RTRIM(c.cue_ctelefono)                                   AS telefono,
    ISNULL(RTRIM(c.cue_cemail), '')                          AS email,

    -- Fechas de alta y de servicio
    c.cue_dfechaalta                                         AS fecha_alta,
    c.cue_dservicio                                          AS fecha_servicio,

    -- 1 = cuenta efectiva/activa en el sistema
    c.cue_nEfectiva                                          AS activa,

    -- Estado del motor DSS (0=inactivo, 1=activo, 2=prueba)
    ISNULL(xi.cue_iEngineStatus, 0)                          AS engine_status,

    -- Última alarma recibida (actualizada por DSS en XtraInfo)
    ISNULL(RTRIM(xi.cue_cUltimaAlarmaRecibida), '')          AS ultima_alarma_codigo,
    xi.cue_dFechaUltimaAlarmaRecibida                        AS ultima_alarma_fecha,

    -- Estado operativo del panel según m_status
    ISNULL(sta.sta_nestado, 0)                               AS estado_panel,
    sta.sta_dfechautimaalarma                                AS estado_panel_fecha

FROM dbo.m_cuentas c
LEFT JOIN dbo.m_CuentasXtraInfo xi ON xi.cue_iidCuenta = c.cue_iid
LEFT JOIN dbo.m_status          sta ON sta.sta_iidcuenta = c.cue_iid
WHERE c.cue_iid IS NOT NULL
  -- Excluir líneas de sistema SoftGuard/MercadoPago (prefijo '_')
  AND RTRIM(c.cue_clinea) NOT LIKE '!_%' ESCAPE '!'
  -- Excluir pseudo-cuenta 0000 "EVENTOS DEL RECEPTOR"
  AND RTRIM(c.cue_ncuenta) != '0000';
GO

-- ──────────────────────────────────────────────────────────────
-- 2. vw_ei_eventos_recientes
--    Fuente: EventosTimeLine (últimos 30 días)
--    Nota: SoftGuard archiva por mes en EventosTimeLine{YYYYMM}.
--    Esta vista consulta solo la tabla "corriente" (datos recientes).
-- ──────────────────────────────────────────────────────────────
CREATE OR ALTER VIEW dbo.vw_ei_eventos_recientes AS
SELECT
    etl.etl_idKey                                            AS id_evento,
    etl.etl_iCuenta                                          AS iid_cuenta,
    ISNULL(RTRIM(c.cue_ncuenta), '')                         AS softguard_ref,
    etl.etl_tFechaHora                                       AS fecha_evento,
    ISNULL(RTRIM(etl.etl_cAccion), '')                       AS accion,
    etl.etl_cObservacion                                     AS observacion,
    etl.etl_iAccionCode                                      AS accion_code,
    etl.etl_iOperador                                        AS operador_id
FROM dbo.EventosTimeLine etl
LEFT JOIN dbo.m_cuentas c ON c.cue_iid = etl.etl_iCuenta
WHERE etl.etl_tFechaHora >= DATEADD(day, -30, GETDATE());
GO

-- ──────────────────────────────────────────────────────────────
-- 3. vw_ei_ot_estado
--    Fuente: m_st_cabecera (órdenes de Servicio Técnico)
-- ──────────────────────────────────────────────────────────────
CREATE OR ALTER VIEW dbo.vw_ei_ot_estado AS
SELECT
    ot.stc_iid                                               AS ot_id,
    ot.stc_iid_cuenta                                        AS iid_cuenta,
    ISNULL(RTRIM(c.cue_ncuenta), '')                         AS softguard_ref,
    ot.stc_inumero                                           AS ot_numero,
    RTRIM(ot.stc_ctipo_servicio)                             AS tipo_servicio,
    ot.stc_mobservaciones                                    AS descripcion,
    -- 0=pendiente, 1=en curso, 2=cerrada (confirmar con Ramiro según datos reales)
    ot.stc_nestado                                           AS estado,
    RTRIM(ot.stc_ctecnico_1)                                 AS tecnico_1,
    RTRIM(ot.stc_ctecnico_2)                                 AS tecnico_2,
    ot.stc_dfecha_creacion                                   AS fecha_creacion,
    ot.stc_dfecha_cierre                                     AS fecha_cierre,
    ot.stc_dfecha_desde_1                                    AS fecha_programada,
    ot.stc_yValor                                            AS valor,
    ot.stc_dfecha_modificacion                               AS fecha_modificacion
FROM dbo.m_st_cabecera ot
LEFT JOIN dbo.m_cuentas c ON c.cue_iid = ot.stc_iid_cuenta;
GO

-- ──────────────────────────────────────────────────────────────
-- 4. Permisos de SELECT sobre las vistas
-- ──────────────────────────────────────────────────────────────
GRANT SELECT ON dbo.vw_ei_cuentas_resumen    TO EI_PORTAL_RO;
GRANT SELECT ON dbo.vw_ei_eventos_recientes  TO EI_PORTAL_RO;
GRANT SELECT ON dbo.vw_ei_ot_estado          TO EI_PORTAL_RO;
GO

-- ──────────────────────────────────────────────────────────────
-- 5. Verificación rápida (correr después de crear las vistas)
-- ──────────────────────────────────────────────────────────────
SELECT TOP 5 * FROM dbo.vw_ei_cuentas_resumen  ORDER BY iid;
SELECT COUNT(*) AS total_eventos_30d            FROM dbo.vw_ei_eventos_recientes;
SELECT COUNT(*) AS total_ot                     FROM dbo.vw_ei_ot_estado;
GO

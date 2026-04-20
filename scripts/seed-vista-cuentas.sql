-- ============================================================
-- Script DDL — Vistas read-only para el Portal EI
-- Ejecutar en SQL Server con un usuario que tenga permisos
-- de creación de vistas (ej: sa o dbo del esquema SoftGuard).
--
-- IMPORTANTE: Los nombres de tabla/columna son estimaciones basadas
-- en los manuales TEC223 (Cuentas) y TEC233 (MoneyGuard).
-- Verificar y ajustar contra el schema real antes de ejecutar.
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- 0. Usuario read-only para el portal
-- ──────────────────────────────────────────────────────────────
-- Ejecutar como sysadmin una sola vez:
--
-- CREATE LOGIN EI_PORTAL_RO WITH PASSWORD = '<password_fuerte>';
-- USE [NombreBaseSoftGuard];
-- CREATE USER EI_PORTAL_RO FOR LOGIN EI_PORTAL_RO;
-- ALTER ROLE db_datareader ADD MEMBER EI_PORTAL_RO;
-- GRANT SELECT ON SCHEMA::dbo TO EI_PORTAL_RO;
-- ──────────────────────────────────────────────────────────────

-- ──────────────────────────────────────────────────────────────
-- 1. vw_ei_cuentas_resumen
--    Fuente: tabla Cuentas (TEC223). Ajustar nombres de columna.
-- ──────────────────────────────────────────────────────────────
CREATE OR ALTER VIEW dbo.vw_ei_cuentas_resumen AS
SELECT
    -- ref CHAR(4) — identificador único de la cuenta (ej: '0042')
    RTRIM(c.ABONADO)                    AS softguard_ref,

    -- Datos del titular
    RTRIM(c.NOMBRE)                     AS nombre_titular,
    RTRIM(c.DIRECCION)                  AS direccion,
    RTRIM(c.LOCALIDAD)                  AS localidad,
    RTRIM(c.TELEFONO)                   AS telefono,

    -- Estado operativo
    RTRIM(c.SITUACION)                  AS situacion,

    -- Flag de autorización para AWCC / portal (campo "Acceso Web" en Módulo Cuentas)
    CASE WHEN c.ACCESO_WEB = 1 THEN 1 ELSE 0 END AS acceso_web,

    -- Relación con dealer y organización MoneyGuard
    c.DEALER                            AS dealer_id,
    c.ORGANIZACION                      AS org_id,

    -- Último evento registrado (para mostrar "último contacto")
    (
        SELECT TOP 1 e.FECHA
        FROM Eventos e
        WHERE e.ABONADO = c.ABONADO
        ORDER BY e.FECHA DESC
    )                                   AS ultimo_evento_fecha,
    (
        SELECT TOP 1 RTRIM(e.CODIGO)
        FROM Eventos e
        WHERE e.ABONADO = c.ABONADO
        ORDER BY e.FECHA DESC
    )                                   AS ultimo_evento_codigo,

    -- Activa si la situación es "Habilitada"
    CASE WHEN c.SITUACION = 'Habilitada' THEN 1 ELSE 0 END AS activa

FROM dbo.Cuentas c
WHERE c.ABONADO IS NOT NULL;
GO

-- ──────────────────────────────────────────────────────────────
-- 2. vw_ei_eventos_recientes
--    Fuente: tabla Eventos (TEC218, TEC228). Ajustar nombres.
-- ──────────────────────────────────────────────────────────────
CREATE OR ALTER VIEW dbo.vw_ei_eventos_recientes AS
SELECT
    e.ID_EVENTO                         AS id_evento,
    RTRIM(e.ABONADO)                    AS softguard_ref,
    e.FECHA                             AS fecha_evento,
    RTRIM(e.CODIGO)                     AS codigo,
    RTRIM(e.DESCRIPCION)                AS descripcion,
    RTRIM(e.ZONA)                       AS zona,
    e.PRIORIDAD                         AS prioridad,
    RTRIM(e.OPERADOR)                   AS operador,
    -- Estado nativo — uno de los 9 valores del TEC218 MultiMonitor
    RTRIM(e.ESTADO)                     AS estado_nativo,
    RTRIM(e.RESOLUCION)                 AS resolucion
FROM dbo.Eventos e
WHERE e.FECHA >= DATEADD(day, -30, GETDATE());
GO

-- ──────────────────────────────────────────────────────────────
-- 3. vw_ei_ot_estado
--    Fuente: tabla OT / Servicio Técnico (TEC181). Ajustar nombres.
-- ──────────────────────────────────────────────────────────────
CREATE OR ALTER VIEW dbo.vw_ei_ot_estado AS
SELECT
    ot.NUMERO                           AS ot_numero,
    RTRIM(ot.ABONADO)                   AS softguard_ref,
    RTRIM(ot.TIPO)                      AS tipo,
    RTRIM(ot.DESCRIPCION)               AS descripcion,
    RTRIM(ot.ESTADO)                    AS estado,
    RTRIM(ot.TECNICO)                   AS tecnico,
    ot.FECHA_CREACION                   AS fecha_creacion,
    ot.FECHA_CIERRE                     AS fecha_cierre
FROM dbo.OrdenesServicio ot;
GO

-- ──────────────────────────────────────────────────────────────
-- 4. Permisos de SELECT sobre las vistas al usuario del portal
-- ──────────────────────────────────────────────────────────────
GRANT SELECT ON dbo.vw_ei_cuentas_resumen    TO EI_PORTAL_RO;
GRANT SELECT ON dbo.vw_ei_eventos_recientes  TO EI_PORTAL_RO;
GRANT SELECT ON dbo.vw_ei_ot_estado          TO EI_PORTAL_RO;
GO

-- ──────────────────────────────────────────────────────────────
-- Verificación rápida
-- ──────────────────────────────────────────────────────────────
SELECT TOP 5 * FROM dbo.vw_ei_cuentas_resumen;
SELECT COUNT(*) AS total_eventos FROM dbo.vw_ei_eventos_recientes;
SELECT COUNT(*) AS total_ot FROM dbo.vw_ei_ot_estado;
GO

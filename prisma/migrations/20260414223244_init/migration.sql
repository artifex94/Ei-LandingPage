-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('CLIENTE', 'ADMIN');

-- CreateEnum
CREATE TYPE "CategoriaCuenta" AS ENUM ('ALARMA_MONITOREO', 'DOMOTICA', 'CAMARA_CCTV', 'ANTENA_STARLINK', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoCuenta" AS ENUM ('ACTIVA', 'SUSPENDIDA_PAGO', 'EN_MANTENIMIENTO', 'BAJA_DEFINITIVA');

-- CreateEnum
CREATE TYPE "TipoSensor" AS ENUM ('SENSOR_PIR', 'CONTACTO_MAGNETICO', 'CAMARA_IP', 'TECLADO_CONTROL', 'DETECTOR_HUMO', 'MODULO_DOMOTICA', 'PANICO');

-- CreateEnum
CREATE TYPE "EstadoBateria" AS ENUM ('OPTIMA', 'ADVERTENCIA', 'CRITICA');

-- CreateEnum
CREATE TYPE "EstadoPago" AS ENUM ('PENDIENTE', 'PROCESANDO', 'PAGADO', 'VENCIDO');

-- CreateEnum
CREATE TYPE "MetodoPago" AS ENUM ('MERCADOPAGO', 'TALO_CVU', 'EFECTIVO', 'CHEQUE');

-- CreateEnum
CREATE TYPE "EstadoSolicitud" AS ENUM ('PENDIENTE', 'EN_PROCESO', 'RESUELTA');

-- CreateEnum
CREATE TYPE "Prioridad" AS ENUM ('BAJA', 'MEDIA', 'ALTA');

-- CreateTable
CREATE TABLE "perfiles" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "dni" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "rol" "Rol" NOT NULL DEFAULT 'CLIENTE',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "perfiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cuentas" (
    "id" TEXT NOT NULL,
    "softguard_ref" TEXT NOT NULL,
    "perfil_id" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "categoria" "CategoriaCuenta" NOT NULL,
    "estado" "EstadoCuenta" NOT NULL DEFAULT 'ACTIVA',
    "costo_mensual" DECIMAL(10,2) NOT NULL DEFAULT 20000,
    "zona_geografica" TEXT,
    "notas_tecnicas" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cuentas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sensores" (
    "id" TEXT NOT NULL,
    "cuenta_id" TEXT NOT NULL,
    "codigo_zona" TEXT NOT NULL,
    "etiqueta" TEXT NOT NULL,
    "tipo" "TipoSensor" NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "bateria" "EstadoBateria",
    "alerta_mant" BOOLEAN NOT NULL DEFAULT false,
    "ultima_activacion" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sensores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagos" (
    "id" TEXT NOT NULL,
    "cuenta_id" TEXT NOT NULL,
    "mes" INTEGER NOT NULL,
    "anio" INTEGER NOT NULL,
    "importe" DECIMAL(10,2) NOT NULL,
    "estado" "EstadoPago" NOT NULL DEFAULT 'PENDIENTE',
    "metodo" "MetodoPago",
    "ref_externa" TEXT,
    "acreditado_en" TIMESTAMP(3),
    "registrado_por" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pagos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tarifas_historico" (
    "id" TEXT NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "vigente_desde" TIMESTAMP(3) NOT NULL,
    "creado_por" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tarifas_historico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitudes_mantenimiento" (
    "id" TEXT NOT NULL,
    "cuenta_id" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "estado" "EstadoSolicitud" NOT NULL DEFAULT 'PENDIENTE',
    "prioridad" "Prioridad" NOT NULL DEFAULT 'MEDIA',
    "creada_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resuelta_en" TIMESTAMP(3),

    CONSTRAINT "solicitudes_mantenimiento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "perfiles_dni_key" ON "perfiles"("dni");

-- CreateIndex
CREATE UNIQUE INDEX "perfiles_telefono_key" ON "perfiles"("telefono");

-- CreateIndex
CREATE UNIQUE INDEX "perfiles_email_key" ON "perfiles"("email");

-- CreateIndex
CREATE UNIQUE INDEX "cuentas_softguard_ref_key" ON "cuentas"("softguard_ref");

-- CreateIndex
CREATE INDEX "cuentas_perfil_id_idx" ON "cuentas"("perfil_id");

-- CreateIndex
CREATE INDEX "sensores_cuenta_id_idx" ON "sensores"("cuenta_id");

-- CreateIndex
CREATE UNIQUE INDEX "sensores_cuenta_id_codigo_zona_key" ON "sensores"("cuenta_id", "codigo_zona");

-- CreateIndex
CREATE UNIQUE INDEX "pagos_ref_externa_key" ON "pagos"("ref_externa");

-- CreateIndex
CREATE INDEX "pagos_cuenta_id_idx" ON "pagos"("cuenta_id");

-- CreateIndex
CREATE UNIQUE INDEX "pagos_cuenta_id_mes_anio_key" ON "pagos"("cuenta_id", "mes", "anio");

-- CreateIndex
CREATE INDEX "solicitudes_mantenimiento_cuenta_id_idx" ON "solicitudes_mantenimiento"("cuenta_id");

-- AddForeignKey
ALTER TABLE "cuentas" ADD CONSTRAINT "cuentas_perfil_id_fkey" FOREIGN KEY ("perfil_id") REFERENCES "perfiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sensores" ADD CONSTRAINT "sensores_cuenta_id_fkey" FOREIGN KEY ("cuenta_id") REFERENCES "cuentas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_cuenta_id_fkey" FOREIGN KEY ("cuenta_id") REFERENCES "cuentas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_mantenimiento" ADD CONSTRAINT "solicitudes_mantenimiento_cuenta_id_fkey" FOREIGN KEY ("cuenta_id") REFERENCES "cuentas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

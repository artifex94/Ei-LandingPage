"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { registrarAudit } from "@/lib/audit";

// ── Helper: verifica que el usuario es ADMIN ──────────────────────────────────
async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const perfil = await prisma.perfil.findUnique({ where: { id: user.id } });
  if (perfil?.rol !== "ADMIN") return null;
  return perfil;
}

const CATEGORIAS = ["ALARMA_MONITOREO", "DOMOTICA", "CAMARA_CCTV", "ANTENA_STARLINK", "OTRO"] as const;
const ESTADOS_CUENTA = ["ACTIVA", "SUSPENDIDA_PAGO", "EN_MANTENIMIENTO", "BAJA_DEFINITIVA"] as const;

const actualizarCuentaSchema = z.object({
  id: z.string().min(1),
  descripcion: z.string().min(1, "La dirección es obligatoria"),
  categoria: z.enum(CATEGORIAS),
  estado: z.enum(ESTADOS_CUENTA),
  costo_mensual: z.coerce.number().min(0),
  calle: z.string().optional().transform((v) => v?.trim() || null),
  localidad: z.string().optional().transform((v) => v?.trim() || null),
  provincia: z.string().optional().transform((v) => v?.trim() || null),
  codigo_postal: z.string().optional().transform((v) => v?.trim() || null),
  notas_tecnicas: z.string().optional().transform((v) => v?.trim() || null),
  motivo_baja: z.string().optional(),
});

export interface CuentaActionResult {
  ok?: boolean;
  errores?: string[];
}

export async function actualizarCuenta(
  prevState: CuentaActionResult,
  formData: FormData
): Promise<CuentaActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { errores: ["Sin permisos de administrador."] };

  const parsed = actualizarCuentaSchema.safeParse({
    id: formData.get("id"),
    descripcion: formData.get("descripcion"),
    categoria: formData.get("categoria"),
    estado: formData.get("estado"),
    costo_mensual: formData.get("costo_mensual"),
    calle: formData.get("calle"),
    localidad: formData.get("localidad"),
    provincia: formData.get("provincia"),
    codigo_postal: formData.get("codigo_postal"),
    notas_tecnicas: formData.get("notas_tecnicas"),
    motivo_baja: formData.get("motivo_baja"),
  });

  if (!parsed.success) {
    return { errores: parsed.error.issues.map((i) => i.message) };
  }

  const { id, motivo_baja, ...data } = parsed.data;

  // Cuando es baja definitiva, prepender nota de baja a notas_tecnicas
  let updateData = { ...data };
  if (data.estado === "BAJA_DEFINITIVA" && motivo_baja?.trim()) {
    const fechaBaja = new Date().toLocaleDateString("es-AR");
    const notaBaja = `[BAJA ${fechaBaja} — por ${admin.nombre}] ${motivo_baja.trim()}`;
    updateData.notas_tecnicas = data.notas_tecnicas
      ? `${notaBaja}\n\n${data.notas_tecnicas}`
      : notaBaja;
  }

  const cuentaAntes = await prisma.cuenta.findUnique({
    where: { id },
    select: { estado: true, costo_mensual: true, descripcion: true },
  });

  await prisma.cuenta.update({ where: { id }, data: updateData });

  await registrarAudit({
    admin_id: admin.id,
    admin_nombre: admin.nombre,
    accion: data.estado === "BAJA_DEFINITIVA" && cuentaAntes?.estado !== "BAJA_DEFINITIVA"
      ? "CUENTA_BAJA_DEFINITIVA"
      : "CUENTA_ACTUALIZADA",
    entidad: "cuenta",
    entidad_id: id,
    detalle: {
      antes: {
        estado: cuentaAntes?.estado,
        costo_mensual: Number(cuentaAntes?.costo_mensual ?? 0),
      },
      despues: {
        estado: data.estado,
        costo_mensual: data.costo_mensual,
      },
      ...(motivo_baja ? { motivo_baja } : {}),
    },
  });

  revalidatePath(`/admin/cuentas/${id}`);
  revalidatePath("/admin/cuentas");
  return { ok: true };
}

// ── Crear cuenta nueva ────────────────────────────────────────────────────────

const crearCuentaSchema = z.object({
  perfil_id: z.string().min(1),
  softguard_ref: z.string().min(1, "La referencia es obligatoria"),
  descripcion: z.string().min(1, "La descripción es obligatoria"),
  categoria: z.enum(CATEGORIAS),
  costo_mensual: z.coerce.number().min(0, "El costo no puede ser negativo"),
  calle: z.string().optional().transform((v) => v || undefined),
  localidad: z.string().optional().transform((v) => v || undefined),
  provincia: z.string().optional().transform((v) => v || undefined),
});

export async function crearCuenta(
  prevState: CuentaActionResult,
  formData: FormData
): Promise<CuentaActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { errores: ["Sin permisos de administrador."] };

  const parsed = crearCuentaSchema.safeParse({
    perfil_id: formData.get("perfil_id"),
    softguard_ref: formData.get("softguard_ref"),
    descripcion: formData.get("descripcion"),
    categoria: formData.get("categoria"),
    costo_mensual: formData.get("costo_mensual"),
    calle: formData.get("calle"),
    localidad: formData.get("localidad"),
    provincia: formData.get("provincia"),
  });

  if (!parsed.success) {
    return { errores: parsed.error.issues.map((i) => i.message) };
  }

  const { softguard_ref, ...rest } = parsed.data;

  const existente = await prisma.cuenta.findUnique({ where: { softguard_ref } });
  if (existente) {
    return { errores: [`Ya existe una cuenta con la referencia "${softguard_ref}".`] };
  }

  const nueva = await prisma.cuenta.create({
    data: { softguard_ref, estado: "ACTIVA", ...rest },
  });

  await registrarAudit({
    admin_id: admin.id,
    admin_nombre: admin.nombre,
    accion: "CUENTA_CREADA",
    entidad: "cuenta",
    entidad_id: nueva.id,
    detalle: { softguard_ref, descripcion: rest.descripcion, categoria: rest.categoria },
  });

  revalidatePath(`/admin/clientes/${rest.perfil_id}`);
  revalidatePath("/admin/cuentas");
  return { ok: true };
}

const pagoManualSchema = z.object({
  cuenta_id: z.string().min(1),
  mes: z.coerce.number().min(1).max(12),
  anio: z.coerce.number().min(2020),
  importe: z.coerce.number().min(0),
  metodo: z.enum(["EFECTIVO", "CHEQUE", "MERCADOPAGO", "TALO_CVU", "TRANSFERENCIA_BANCARIA"]),
});

export async function registrarPagoManual(
  prevState: CuentaActionResult,
  formData: FormData
): Promise<CuentaActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { errores: ["Sin permisos de administrador."] };

  const parsed = pagoManualSchema.safeParse({
    cuenta_id: formData.get("cuenta_id"),
    mes: formData.get("mes"),
    anio: formData.get("anio"),
    importe: formData.get("importe"),
    metodo: formData.get("metodo"),
  });

  if (!parsed.success) {
    return { errores: parsed.error.issues.map((i) => i.message) };
  }

  const { cuenta_id, mes, anio, importe, metodo } = parsed.data;

  await prisma.pago.upsert({
    where: { cuenta_id_mes_anio: { cuenta_id, mes, anio } },
    create: {
      cuenta_id,
      mes,
      anio,
      importe,
      metodo,
      estado: "PAGADO",
      acreditado_en: new Date(),
      registrado_por: admin.nombre,
    },
    update: {
      importe,
      metodo,
      estado: "PAGADO",
      acreditado_en: new Date(),
      registrado_por: admin.nombre,
    },
  });

  await registrarAudit({
    admin_id: admin.id,
    admin_nombre: admin.nombre,
    accion: "PAGO_REGISTRADO",
    entidad: "pago",
    entidad_id: `${cuenta_id}-${mes}-${anio}`,
    detalle: { cuenta_id, mes, anio, importe, metodo },
  });

  revalidatePath("/admin/pagos");
  revalidatePath(`/admin/clientes`);
  return { ok: true };
}

// ── CRUD Sensores ─────────────────────────────────────────────────────────────

const TIPOS_SENSOR = [
  "SENSOR_PIR", "CONTACTO_MAGNETICO", "CAMARA_IP",
  "TECLADO_CONTROL", "DETECTOR_HUMO", "MODULO_DOMOTICA", "PANICO",
] as const;

export interface SensorActionResult {
  ok?: boolean;
  errores?: string[];
}

const actualizarSensorSchema = z.object({
  id: z.string().min(1),
  etiqueta: z.string().min(1, "La etiqueta es obligatoria"),
  tipo: z.enum(TIPOS_SENSOR),
  activa: z.enum(["true", "false"]).transform((v) => v === "true"),
  bateria: z.enum(["OPTIMA", "ADVERTENCIA", "CRITICA"]).optional().nullable()
    .transform((v) => v || null),
});

export async function actualizarSensor(
  prevState: SensorActionResult,
  formData: FormData
): Promise<SensorActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { errores: ["Sin permisos de administrador."] };

  const parsed = actualizarSensorSchema.safeParse({
    id: formData.get("id"),
    etiqueta: formData.get("etiqueta"),
    tipo: formData.get("tipo"),
    activa: formData.get("activa"),
    bateria: formData.get("bateria") || null,
  });

  if (!parsed.success) {
    return { errores: parsed.error.issues.map((i) => i.message) };
  }

  const { id, ...data } = parsed.data;
  const sensor = await prisma.sensor.findUnique({
    where: { id },
    select: { cuenta: { select: { id: true } } },
  });
  if (!sensor) return { errores: ["Sensor no encontrado."] };

  await prisma.sensor.update({ where: { id }, data });

  await registrarAudit({
    admin_id: admin.id,
    admin_nombre: admin.nombre,
    accion: "SENSOR_ACTUALIZADO",
    entidad: "sensor",
    entidad_id: id,
    detalle: { cuenta_id: sensor.cuenta.id, ...data },
  });

  revalidatePath(`/admin/cuentas/${sensor.cuenta.id}`);
  return { ok: true };
}

const crearSensorSchema = z.object({
  cuenta_id: z.string().min(1),
  codigo_zona: z.string().min(1, "El código de zona es obligatorio"),
  etiqueta: z.string().min(1, "La etiqueta es obligatoria"),
  tipo: z.enum(TIPOS_SENSOR),
  bateria: z.enum(["OPTIMA", "ADVERTENCIA", "CRITICA"]).optional().nullable()
    .transform((v) => v || null),
});

export async function crearSensor(
  prevState: SensorActionResult,
  formData: FormData
): Promise<SensorActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { errores: ["Sin permisos de administrador."] };

  const parsed = crearSensorSchema.safeParse({
    cuenta_id: formData.get("cuenta_id"),
    codigo_zona: formData.get("codigo_zona"),
    etiqueta: formData.get("etiqueta"),
    tipo: formData.get("tipo"),
    bateria: formData.get("bateria") || null,
  });

  if (!parsed.success) {
    return { errores: parsed.error.issues.map((i) => i.message) };
  }

  const { cuenta_id, codigo_zona, ...rest } = parsed.data;

  const existente = await prisma.sensor.findUnique({
    where: { cuenta_id_codigo_zona: { cuenta_id, codigo_zona } },
  });
  if (existente) {
    return { errores: [`Ya existe un sensor con la zona "${codigo_zona}" en esta cuenta.`] };
  }

  const nuevo = await prisma.sensor.create({ data: { cuenta_id, codigo_zona, ...rest } });

  await registrarAudit({
    admin_id: admin.id,
    admin_nombre: admin.nombre,
    accion: "SENSOR_CREADO",
    entidad: "sensor",
    entidad_id: nuevo.id,
    detalle: { cuenta_id, codigo_zona, tipo: rest.tipo, etiqueta: rest.etiqueta },
  });

  revalidatePath(`/admin/cuentas/${cuenta_id}`);
  return { ok: true };
}

// ── Override de suspensión con TTL — Mejora C (PDF PRD §3.3) ─────────────────

export interface OverrideResult {
  ok?: boolean;
  errores?: string[];
}

export async function activarOverrideSuspension(
  prevState: OverrideResult,
  formData: FormData
): Promise<OverrideResult> {
  const admin = await requireAdmin();
  if (!admin) return { errores: ["Sin permisos de administrador."] };

  const cuenta_id = (formData.get("cuenta_id") as string)?.trim();
  const ttl_horas = parseInt(formData.get("ttl_horas") as string, 10);
  const justificacion = (formData.get("justificacion") as string)?.trim();

  if (!cuenta_id) return { errores: ["ID de cuenta requerido."] };
  if (isNaN(ttl_horas) || ![24, 48, 72].includes(ttl_horas)) return { errores: ["TTL inválido (24, 48 o 72 horas)."] };
  if (!justificacion || justificacion.length < 10) {
    return { errores: ["La justificación debe tener al menos 10 caracteres."] };
  }

  const cuenta = await prisma.cuenta.findUnique({
    where: { id: cuenta_id },
    select: { estado: true, descripcion: true },
  });
  if (!cuenta) return { errores: ["Cuenta no encontrada."] };

  const override_expira = new Date();
  override_expira.setHours(override_expira.getHours() + ttl_horas);

  await prisma.cuenta.update({
    where: { id: cuenta_id },
    data: {
      override_activo: true,
      override_expira,
      override_justificacion: justificacion,
    },
  });

  await registrarAudit({
    admin_id: admin.id,
    admin_nombre: admin.nombre,
    accion: "OVERRIDE_SUSPENSION",
    entidad: "cuenta",
    entidad_id: cuenta_id,
    state_transition: { prior_state: cuenta.estado, new_state: "ACTIVE_OVERRIDE" },
    justification: justificacion,
    detalle: { ttl_horas, override_expira: override_expira.toISOString() },
  });

  revalidatePath(`/admin/cuentas/${cuenta_id}`);
  return { ok: true };
}

export async function eliminarSensor(id: string): Promise<SensorActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { errores: ["Sin permisos de administrador."] };

  const sensor = await prisma.sensor.findUnique({
    where: { id },
    select: { cuenta_id: true, etiqueta: true, codigo_zona: true },
  });
  if (!sensor) return { errores: ["Sensor no encontrado."] };

  await prisma.sensor.delete({ where: { id } });

  await registrarAudit({
    admin_id: admin.id,
    admin_nombre: admin.nombre,
    accion: "SENSOR_ELIMINADO",
    entidad: "sensor",
    entidad_id: id,
    detalle: { cuenta_id: sensor.cuenta_id, etiqueta: sensor.etiqueta, codigo_zona: sensor.codigo_zona },
  });

  revalidatePath(`/admin/cuentas/${sensor.cuenta_id}`);
  return { ok: true };
}

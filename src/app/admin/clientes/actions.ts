"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma/client";
import { registrarAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/actions/auth";
import type { CategoriaCuenta, CondicionIVA, TipoTitular } from "@/generated/prisma/enums";

export interface ClienteActionResult {
  ok?: boolean;
  errores?: string[];
}

export interface AltaClienteResult {
  errores?: string[];
}

const nuevoClienteSchema = z.object({
  nombre: z.string().min(2, "El nombre es obligatorio"),
  dni: z.string().optional().transform((v) => v || undefined),
  telefono: z.string().optional().transform((v) => v || undefined),
  email: z.string().email("Email inválido"),
});

export async function crearCliente(
  prevState: ClienteActionResult,
  formData: FormData
): Promise<ClienteActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { errores: ["Sin permisos de administrador."] };

  const parsed = nuevoClienteSchema.safeParse({
    nombre: formData.get("nombre"),
    dni: formData.get("dni"),
    telefono: formData.get("telefono"),
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { errores: parsed.error.issues.map((i) => i.message) };
  }

  const { nombre, dni, telefono, email } = parsed.data;

  // Verificar DNI duplicado
  if (dni) {
    const existente = await prisma.perfil.findUnique({ where: { dni } });
    if (existente) {
      return { errores: [`Ya existe un cliente con el DNI ${dni}.`] };
    }
  }

  const adminAuth = createAdminClient();
  const { data: authData, error: authError } =
    await adminAuth.auth.admin.createUser({
      email,
      user_metadata: { nombre, ...(dni && { dni }) },
      email_confirm: true,
    });

  if (authError) {
    return { errores: [`Error al crear usuario: ${authError.message}`] };
  }

  await prisma.perfil.create({
    data: {
      id: authData.user.id,
      nombre,
      ...(dni && { dni }),
      ...(telefono && { telefono }),
      email,
      rol: "CLIENTE",
    },
  });

  redirect("/admin/clientes");
}

// ── Alta de cliente con cuenta vinculada ──────────────────────────────────────

const altaClienteSchema = z.object({
  // Titular
  nombre: z.string().min(2, "El nombre es obligatorio"),
  telefono: z.string().min(8, "El teléfono es obligatorio"),
  dni: z.string().optional().transform((v) => v || undefined),
  email: z.string().email("Email inválido").optional().transform((v) => v || undefined),
  tipo_titular: z
    .enum(["RESIDENCIAL", "COMERCIAL", "OFICINAS", "VEHICULO"])
    .optional()
    .nullable()
    .transform((v) => v || null),
  requiere_factura: z.enum(["true", "false"]).transform((v) => v === "true"),
  cuit: z.string().optional().transform((v) => v || undefined),
  condicion_iva: z
    .enum(["RESPONSABLE_INSCRIPTO", "MONOTRIBUTISTA", "EXENTO", "CONSUMIDOR_FINAL", "NO_RESPONSABLE"])
    .optional()
    .nullable()
    .transform((v) => v || null),
  razon_social: z.string().optional().transform((v) => v || undefined),
  // Cuenta
  categoria: z.enum(["ALARMA_MONITOREO", "DOMOTICA", "CAMARA_CCTV", "ANTENA_STARLINK", "OTRO"]),
  descripcion: z.string().min(3, "La descripción es obligatoria"),
  calle: z.string().optional().transform((v) => v || undefined),
  localidad: z.string().optional().transform((v) => v || undefined),
  provincia: z.string().optional().transform((v) => v || undefined),
  codigo_postal: z.string().optional().transform((v) => v || undefined),
  softguard_ref: z.string().optional().transform((v) => v || undefined),
  costo_mensual: z.coerce
    .number()
    .min(0)
    .optional()
    .nullable()
    .transform((v) => (v === 0 || v == null) ? null : v),
});

export async function altaClienteConCuenta(
  prevState: AltaClienteResult,
  formData: FormData
): Promise<AltaClienteResult> {
  const admin = await requireAdmin();
  if (!admin) return { errores: ["Sin permisos de administrador."] };

  const parsed = altaClienteSchema.safeParse({
    nombre: formData.get("nombre"),
    telefono: formData.get("telefono"),
    dni: formData.get("dni"),
    email: formData.get("email"),
    tipo_titular: formData.get("tipo_titular") || null,
    requiere_factura: formData.get("requiere_factura") ?? "false",
    cuit: formData.get("cuit"),
    condicion_iva: formData.get("condicion_iva") || null,
    razon_social: formData.get("razon_social"),
    categoria: formData.get("categoria"),
    descripcion: formData.get("descripcion"),
    calle: formData.get("calle"),
    localidad: formData.get("localidad"),
    provincia: formData.get("provincia"),
    codigo_postal: formData.get("codigo_postal"),
    softguard_ref: formData.get("softguard_ref"),
    costo_mensual: formData.get("costo_mensual") || null,
  });

  if (!parsed.success) {
    return { errores: parsed.error.issues.map((i) => i.message) };
  }

  const {
    nombre, telefono, dni, email,
    tipo_titular, requiere_factura, cuit, condicion_iva, razon_social,
    categoria, descripcion, calle, localidad, provincia, codigo_postal,
    softguard_ref: softguard_ref_input, costo_mensual,
  } = parsed.data;

  // Verify DNI uniqueness
  if (dni) {
    const existente = await prisma.perfil.findUnique({ where: { dni } });
    if (existente) return { errores: [`Ya existe un cliente con el DNI ${dni}.`] };
  }

  // Verify phone uniqueness
  const existenteTel = await prisma.perfil.findFirst({ where: { telefono } });
  if (existenteTel) return { errores: [`Ya existe un cliente con el teléfono ${telefono}.`] };

  // Determine email: use provided or generate internal
  const emailDomain = process.env.ADMIN_EMAIL_DOMAIN ?? "interno.ei.local";
  const resolvedEmail = email
    ? email
    : dni
    ? `dni_${dni}@${emailDomain}`
    : `tel_${telefono}@${emailDomain}`;

  // Generate softguard_ref if not provided
  const yyyyMMdd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = Date.now().toString(36).slice(-4).toUpperCase();
  const softguard_ref = softguard_ref_input ?? `MAN-${yyyyMMdd}-${suffix}`;

  // Verify softguard_ref uniqueness
  const existenteRef = await prisma.cuenta.findUnique({ where: { softguard_ref } });
  if (existenteRef) {
    return { errores: [`Ya existe una cuenta con la referencia "${softguard_ref}".`] };
  }

  // Create Supabase Auth user (passwordless)
  const adminAuth = createAdminClient();
  const { data: authData, error: authError } = await adminAuth.auth.admin.createUser({
    email: resolvedEmail,
    user_metadata: { nombre, ...(dni && { dni }) },
    email_confirm: true,
  });

  if (authError) {
    return { errores: [`Error al crear usuario: ${authError.message}`] };
  }

  const authId = authData.user.id;

  // Create Perfil + Cuenta in a transaction — redirect() is OUTSIDE try/catch
  // because Next.js redirect() throws a special error that would trigger the rollback incorrectly.
  let perfilId: string;
  try {
    const [perfil] = await prisma.$transaction([
      prisma.perfil.create({
        data: {
          id: authId,
          nombre,
          email: resolvedEmail,
          telefono,
          rol: "CLIENTE",
          ...(dni && { dni }),
          ...(tipo_titular && { tipo_titular: tipo_titular as unknown as TipoTitular }),
          requiere_factura,
          ...(cuit && { cuit }),
          ...(condicion_iva && { condicion_iva: condicion_iva as unknown as CondicionIVA }),
          ...(razon_social && { razon_social }),
        },
      }),
      prisma.cuenta.create({
        data: {
          perfil_id: authId,
          softguard_ref,
          descripcion,
          categoria: categoria as unknown as CategoriaCuenta,
          estado: "ACTIVA",
          ...(calle && { calle }),
          ...(localidad && { localidad }),
          ...(provincia && { provincia }),
          ...(codigo_postal && { codigo_postal }),
          ...(costo_mensual != null && { costo_mensual }),
        },
      }),
    ]);

    await registrarAudit({
      admin_id: admin.id,
      admin_nombre: admin.nombre,
      accion: "CLIENTE_CREADO",
      entidad: "cliente",
      entidad_id: perfil.id,
      detalle: { nombre, email: resolvedEmail, telefono, dni, softguard_ref, categoria },
    });

    revalidatePath("/admin/clientes");
    perfilId = perfil.id;
  } catch (err) {
    await adminAuth.auth.admin.deleteUser(authId);
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return { errores: [`Error al crear perfil y cuenta: ${msg}`] };
  }

  redirect(`/admin/clientes/${perfilId}`);
}

// ── Actualizar datos del cliente directamente ─────────────────────────────────

const actualizarClienteSchema = z.object({
  id: z.string().min(1),
  nombre: z.string().min(2, "El nombre es obligatorio"),
  dni: z.string().optional().transform((v) => v || undefined),
  telefono: z.string().optional().transform((v) => v || undefined),
  tipo_titular: z
    .enum(["RESIDENCIAL", "COMERCIAL", "OFICINAS", "VEHICULO"])
    .optional()
    .nullable()
    .transform((v) => v || null),
  activo: z
    .enum(["true", "false"])
    .transform((v) => v === "true"),
});

export async function actualizarCliente(
  prevState: ClienteActionResult,
  formData: FormData
): Promise<ClienteActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { errores: ["Sin permisos de administrador."] };

  const parsed = actualizarClienteSchema.safeParse({
    id: formData.get("id"),
    nombre: formData.get("nombre"),
    dni: formData.get("dni"),
    telefono: formData.get("telefono"),
    tipo_titular: formData.get("tipo_titular") || null,
    activo: formData.get("activo"),
  });

  if (!parsed.success) {
    return { errores: parsed.error.issues.map((i) => i.message) };
  }

  const { id, dni, telefono, ...rest } = parsed.data;

  // Verificar unicidad de DNI y teléfono (excluyendo el perfil actual)
  if (dni) {
    const colision = await prisma.perfil.findFirst({ where: { dni, NOT: { id } } });
    if (colision) return { errores: [`El DNI ${dni} ya pertenece a otro cliente.`] };
  }
  if (telefono) {
    const colision = await prisma.perfil.findFirst({ where: { telefono, NOT: { id } } });
    if (colision) return { errores: [`El teléfono ${telefono} ya pertenece a otro cliente.`] };
  }

  const perfilAntes = await prisma.perfil.findUnique({
    where: { id },
    select: { nombre: true, dni: true, telefono: true, activo: true },
  });

  await prisma.perfil.update({
    where: { id },
    data: { ...rest, ...(dni !== undefined ? { dni } : {}), ...(telefono !== undefined ? { telefono } : {}) },
  });

  await registrarAudit({
    admin_id: admin.id,
    admin_nombre: admin.nombre,
    accion: "CLIENTE_EDITADO",
    entidad: "cliente",
    entidad_id: id,
    detalle: {
      antes: { nombre: perfilAntes?.nombre, dni: perfilAntes?.dni, activo: perfilAntes?.activo },
      despues: { nombre: rest.nombre, dni, activo: rest.activo },
    },
  });

  revalidatePath(`/admin/clientes/${id}`);
  revalidatePath("/admin/clientes");
  return { ok: true };
}

// ── Eliminar cliente ───────────────────────────────────────────────────────────

export async function eliminarCliente(
  prevState: ClienteActionResult,
  formData: FormData
): Promise<ClienteActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { errores: ["Sin permisos de administrador."] };

  const id = (formData.get("id") as string ?? "").trim();
  if (!id) return { errores: ["ID inválido."] };

  const perfil = await prisma.perfil.findUnique({
    where: { id },
    select: {
      nombre: true,
      _count: { select: { cuentas: true, solicitudes_cambio: true } },
    },
  });

  if (!perfil) return { errores: ["Cliente no encontrado."] };

  if (perfil._count.cuentas > 0) {
    return {
      errores: [
        `Este cliente tiene ${perfil._count.cuentas} cuenta(s) registrada(s). Dalo de baja en cada cuenta antes de eliminar el perfil, o desactivá el perfil en su lugar.`,
      ],
    };
  }

  await prisma.$transaction([
    prisma.solicitudCambioInfo.deleteMany({ where: { perfil_id: id } }),
    prisma.perfil.delete({ where: { id } }),
  ]);

  const adminAuth = createAdminClient();
  await adminAuth.auth.admin.deleteUser(id);

  await registrarAudit({
    admin_id:     admin.id,
    admin_nombre: admin.nombre,
    accion:       "CLIENTE_ELIMINADO",
    entidad:      "cliente",
    entidad_id:   id,
    detalle:      { nombre: perfil.nombre },
  });

  redirect("/admin/clientes");
}

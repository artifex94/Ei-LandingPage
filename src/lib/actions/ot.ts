"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma/client";
import { registrarAudit } from "@/lib/audit";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { enviarWhatsApp } from "@/lib/twilio";
import type { TipoOT, EstadoOT, Prioridad } from "@/generated/prisma/client";

const MESES_ES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];

async function getTelefonoCliente(ot_id: string): Promise<string | null> {
  const ot = await prisma.ordenTrabajo.findUnique({
    where: { id: ot_id },
    select: {
      cuenta:  { select: { perfil: { select: { telefono: true } } } },
      perfil:  { select: { telefono: true } },
    },
  });
  return ot?.cuenta?.perfil.telefono ?? ot?.perfil?.telefono ?? null;
}

async function getUsuario() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return prisma.perfil.findUnique({ where: { id: user.id } });
}

async function getAdmin() {
  const perfil = await getUsuario();
  return perfil?.rol === "ADMIN" ? perfil : null;
}

// ── Crear OT (admin o cliente) ────────────────────────────────────────────────

export async function crearOT(data: {
  tipo: TipoOT;
  descripcion: string;
  prioridad?: Prioridad;
  cuenta_id?: string;
  perfil_id?: string;
  fecha_visita?: Date;
  notas_admin?: string;
}) {
  const usuario = await getUsuario();
  if (!usuario) throw new Error("No autorizado");

  const ot = await prisma.ordenTrabajo.create({
    data: {
      tipo:         data.tipo,
      descripcion:  data.descripcion,
      prioridad:    data.prioridad ?? "MEDIA",
      cuenta_id:    data.cuenta_id  ?? null,
      perfil_id:    data.perfil_id  ?? null,
      fecha_visita: data.fecha_visita ?? null,
      notas_admin:  data.notas_admin ?? null,
    },
  });

  await registrarAudit({
    admin_id:    usuario.id,
    admin_nombre: usuario.nombre ?? "Usuario",
    accion:      "OT_CREAR",
    entidad:     "orden_trabajo",
    entidad_id:  ot.id,
    detalle:     { tipo: data.tipo, descripcion: data.descripcion },
    state_transition: { prior_state: null, new_state: "SOLICITADA" },
  });

  revalidatePath("/admin/ot");
  revalidatePath("/portal/ot");
  return ot;
}

// ── Asignar técnico + fecha (admin) ──────────────────────────────────────────

export async function asignarTecnico(
  ot_id: string,
  tecnico_id: string,
  fecha_visita: Date,
  reservar_vehiculo = true
) {
  const admin = await getAdmin();
  if (!admin) throw new Error("No autorizado");

  const otAntes = await prisma.ordenTrabajo.findUnique({ where: { id: ot_id } });
  if (!otAntes) throw new Error("OT no encontrada");

  const ot = await prisma.ordenTrabajo.update({
    where: { id: ot_id },
    data:  { tecnico_id, fecha_visita, estado: "ASIGNADA" },
  });

  // Auto-reservar vehículo si hay uno disponible
  if (reservar_vehiculo) {
    const vehiculo = await prisma.vehiculo.findFirst({ where: { activo: true } });
    if (vehiculo) {
      const desde = new Date(fecha_visita);
      const hasta = new Date(fecha_visita);
      hasta.setHours(hasta.getHours() + 4); // reserva por 4 horas por defecto

      // Verificar superposición
      const overlap = await prisma.reservaVehiculo.findFirst({
        where: {
          vehiculo_id: vehiculo.id,
          estado: { in: ["RESERVADA", "EN_USO"] },
          desde: { lt: hasta },
          hasta: { gt: desde },
        },
      });

      if (!overlap) {
        await prisma.reservaVehiculo.create({
          data: {
            vehiculo_id: vehiculo.id,
            empleado_id: tecnico_id,
            ot_id,
            desde,
            hasta,
          },
        });
      }
    }
  }

  await registrarAudit({
    admin_id:     admin.id,
    admin_nombre: admin.nombre ?? "Admin",
    accion:       "OT_ASIGNAR_TECNICO",
    entidad:      "orden_trabajo",
    entidad_id:   ot_id,
    detalle:      { tecnico_id, fecha_visita: fecha_visita.toISOString() },
    state_transition: { prior_state: otAntes.estado, new_state: "ASIGNADA" },
  });

  // WhatsApp al cliente con fecha confirmada
  const telefono = await getTelefonoCliente(ot_id);
  if (telefono) {
    const d = fecha_visita;
    const fechaStr = `${d.getDate()} de ${MESES_ES[d.getMonth()]} a las ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}hs`;
    await enviarWhatsApp(
      telefono,
      `Hola! Te confirmamos que nuestro técnico pasará el ${fechaStr}. Ante cualquier consulta escribinos por este medio. — Escobar Instalaciones`
    ).catch(() => {}); // best-effort
  }

  revalidatePath("/admin/ot");
  return ot;
}

// ── Cambiar estado (admin o técnico) ─────────────────────────────────────────

export async function cambiarEstadoOT(
  ot_id: string,
  nuevo_estado: EstadoOT,
  extra?: {
    notas_tecnico?: string;
    costo_final?: number;
    km_final?: number;
    satisfaccion?: number;
    satisfaccion_comentario?: string;
  }
) {
  const usuario = await getUsuario();
  if (!usuario) throw new Error("No autorizado");

  const otAntes = await prisma.ordenTrabajo.findUnique({ where: { id: ot_id } });
  if (!otAntes) throw new Error("OT no encontrada");

  const ahora = new Date();
  const updateData: Record<string, unknown> = { estado: nuevo_estado };

  if (nuevo_estado === "EN_RUTA")   updateData.hora_salida  = ahora;
  if (nuevo_estado === "EN_SITIO")  updateData.hora_llegada = ahora;
  if (nuevo_estado === "COMPLETADA") {
    updateData.hora_fin = ahora;
    if (extra?.notas_tecnico)           updateData.notas_tecnico = extra.notas_tecnico;
    if (extra?.costo_final !== undefined) updateData.costo_final = extra.costo_final;
    if (extra?.satisfaccion !== undefined) {
      updateData.satisfaccion_cliente    = extra.satisfaccion;
      updateData.satisfaccion_comentario = extra.satisfaccion_comentario ?? null;
    }
  }

  const ot = await prisma.ordenTrabajo.update({
    where: { id: ot_id },
    data: updateData,
  });

  // Al completar: actualizar km del vehículo si se informó
  if (nuevo_estado === "COMPLETADA" && extra?.km_final) {
    const reserva = await prisma.reservaVehiculo.findFirst({
      where: { ot_id, estado: { in: ["RESERVADA", "EN_USO"] } },
    });
    if (reserva) {
      await prisma.reservaVehiculo.update({
        where: { id: reserva.id },
        data: { km_final: extra.km_final, estado: "COMPLETADA" },
      });
      await prisma.vehiculo.update({
        where: { id: reserva.vehiculo_id },
        data: { km_actual: extra.km_final },
      });
    }
  }

  await registrarAudit({
    admin_id:     usuario.id,
    admin_nombre: usuario.nombre ?? "Usuario",
    accion:       "OT_CAMBIAR_ESTADO",
    entidad:      "orden_trabajo",
    entidad_id:   ot_id,
    detalle:      { ...extra },
    state_transition: { prior_state: otAntes.estado, new_state: nuevo_estado },
  });

  // WhatsApp al cliente según estado
  const telefono = await getTelefonoCliente(ot_id);
  if (telefono) {
    let mensaje: string | null = null;
    if (nuevo_estado === "EN_RUTA") {
      mensaje = `Hola! Nuestro técnico está en camino hacia vos. Llegará en breve. — Escobar Instalaciones`;
    } else if (nuevo_estado === "COMPLETADA") {
      mensaje = `Hola! La visita técnica fue completada. Ante cualquier consulta escribinos. ¡Gracias! — Escobar Instalaciones`;
    }
    if (mensaje) await enviarWhatsApp(telefono, mensaje).catch(() => {});
  }

  revalidatePath("/admin/ot");
  revalidatePath(`/admin/ot/${ot_id}`);
  revalidatePath("/tecnico");
  return ot;
}

// ── Registrar GPS desde el móvil de Ariel ────────────────────────────────────

export async function registrarGPS(
  ot_id: string,
  tipo: "salida" | "checkin" | "checkout",
  lat: number,
  lng: number
) {
  const usuario = await getUsuario();
  if (!usuario) throw new Error("No autorizado");

  const data =
    tipo === "salida"   ? { gps_salida_lat: lat,   gps_salida_lng: lng } :
    tipo === "checkin"  ? { gps_checkin_lat: lat,  gps_checkin_lng: lng } :
                          { gps_checkout_lat: lat, gps_checkout_lng: lng };

  await prisma.ordenTrabajo.update({ where: { id: ot_id }, data });
  revalidatePath(`/tecnico/ot/${ot_id}`);
}

// ── Subir fotos desde el móvil ───────────────────────────────────────────────

export async function subirFotosOT(ot_id: string, formData: FormData) {
  const usuario = await getUsuario();
  if (!usuario) throw new Error("No autorizado");

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const ot = await prisma.ordenTrabajo.findUnique({ where: { id: ot_id } });
  if (!ot) throw new Error("OT no encontrada");

  const fotosActuales: string[] = ot.fotos_urls ? JSON.parse(ot.fotos_urls) : [];
  const nuevasUrls: string[] = [];

  const files = formData.getAll("fotos") as File[];
  for (const file of files) {
    const ext = file.name.split(".").pop() ?? "jpg";
    const filename = `ot-${ot.numero}-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabaseAdmin.storage
      .from("ot-fotos")
      .upload(filename, file, { contentType: file.type, upsert: false });

    if (error) throw new Error(`Error subiendo foto: ${error.message}`);

    const { data } = supabaseAdmin.storage.from("ot-fotos").getPublicUrl(filename);
    nuevasUrls.push(data.publicUrl);
  }

  await prisma.ordenTrabajo.update({
    where: { id: ot_id },
    data: { fotos_urls: JSON.stringify([...fotosActuales, ...nuevasUrls]) },
  });

  revalidatePath(`/tecnico/ot/${ot_id}`);
  revalidatePath(`/admin/ot/${ot_id}`);
  return nuevasUrls;
}

// ── Guardar firma del cliente ─────────────────────────────────────────────────

export async function guardarFirmaCliente(ot_id: string, firmaDataUrl: string) {
  const usuario = await getUsuario();
  if (!usuario) throw new Error("No autorizado");

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const ot = await prisma.ordenTrabajo.findUnique({ where: { id: ot_id } });
  if (!ot) throw new Error("OT no encontrada");

  // Convertir dataURL a buffer
  const base64 = firmaDataUrl.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64, "base64");
  const filename = `firma-ot-${ot.numero}.png`;

  const { error } = await supabaseAdmin.storage
    .from("ot-firmas")
    .upload(filename, buffer, { contentType: "image/png", upsert: true });

  if (error) throw new Error(`Error guardando firma: ${error.message}`);

  const { data } = supabaseAdmin.storage.from("ot-firmas").getPublicUrl(filename);

  await prisma.ordenTrabajo.update({
    where: { id: ot_id },
    data: { firma_cliente_url: data.publicUrl, conformidad_firmada: true },
  });

  revalidatePath(`/tecnico/ot/${ot_id}`);
  revalidatePath(`/admin/ot/${ot_id}`);
  return data.publicUrl;
}

// ── Editar notas/materiales/costo (admin) ─────────────────────────────────────

export async function actualizarOT(
  ot_id: string,
  data: {
    notas_admin?: string;
    materiales_usados?: string;
    costo_estimado?: number;
    fecha_visita?: Date;
  }
) {
  const admin = await getAdmin();
  if (!admin) throw new Error("No autorizado");

  const ot = await prisma.ordenTrabajo.update({
    where: { id: ot_id },
    data: {
      notas_admin:       data.notas_admin       ?? undefined,
      materiales_usados: data.materiales_usados ?? undefined,
      costo_estimado:    data.costo_estimado    ?? undefined,
      fecha_visita:      data.fecha_visita      ?? undefined,
    },
  });

  revalidatePath("/admin/ot");
  revalidatePath(`/admin/ot/${ot_id}`);
  return ot;
}

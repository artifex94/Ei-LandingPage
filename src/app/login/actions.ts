"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma/client";
import { enviarWhatsApp } from "@/lib/twilio";

async function getAppUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") ? "http" : "https";
  return `${proto}://${host}`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizarTelefono(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return digits;
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  if (digits.length === 13 && digits.startsWith("549")) return digits.slice(3);
  if (digits.length === 12 && digits.startsWith("54")) return digits.slice(2);
  return null;
}

// ─── Flujo 1: Email + contraseña (para el admin) ─────────────────────────────

export async function loginConEmail(
  _prev: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) return { error: "Completá todos los campos." };

  const supabase = await createClient();
  const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: "Email o contraseña incorrectos." };

  const perfil = await prisma.perfil.findUnique({ where: { id: authData.user.id } });
  if (perfil?.rol === "ADMIN") redirect("/admin/dashboard");
  if (perfil?.rol === "TECNICO") redirect("/tecnico/dashboard");
  redirect("/portal/dashboard");
}

// ─── Flujo 2: Magic link por email ───────────────────────────────────────────

export async function enviarMagicLinkEmail(
  _prev: { error: string; ok?: boolean } | null,
  formData: FormData
): Promise<{ error: string; ok?: boolean } | null> {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  if (!email) return { error: "Ingresá tu email." };

  // Solo para usuarios existentes
  const perfil = await prisma.perfil.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });
  if (!perfil) {
    return { error: "Ese email no está registrado. Contactá a Escobar Instalaciones." };
  }

  const appUrl = await getAppUrl();
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: perfil.email ?? email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${appUrl}/auth/callback`,
    },
  });

  if (error) return { error: "No se pudo enviar el link. Intentá de nuevo." };

  return { error: "", ok: true };
}

// ─── Flujo 3: WhatsApp — magic link enviado por Twilio ────────────────────────
//
// Ventaja sobre OTP: el cliente solo toca un link en WhatsApp, sin escribir código.
// El magic link lo genera Supabase (expira en 1h) y lo entregamos por Twilio.

export async function enviarLinkWhatsApp(
  _prev: { error: string; ok?: boolean } | null,
  formData: FormData
): Promise<{ error: string; ok?: boolean } | null> {
  const telefonoRaw = (formData.get("telefono") as string) ?? "";

  const telefono = normalizarTelefono(telefonoRaw);
  if (!telefono) {
    return { error: "Ingresá un número argentino válido (ej: 3436 575372 o +5493436575372)." };
  }

  // Buscar perfil por teléfono normalizado
  const perfil = await prisma.perfil.findFirst({
    where: { telefono },
    select: { id: true, email: true, nombre: true },
  });

  if (!perfil?.email) {
    return {
      error: "Ese número no está registrado. Contactá a Escobar Instalaciones.",
    };
  }

  // Generar magic link con Supabase Admin (no envía email, solo devuelve la URL)
  const adminClient = createAdminClient();
  const appUrl = await getAppUrl();
  const { data, error: linkError } = await adminClient.auth.admin.generateLink({
    type: "magiclink",
    email: perfil.email,
    options: {
      redirectTo: `${appUrl}/auth/callback`,
    },
  });

  if (linkError || !data?.properties?.action_link) {
    console.error("generateLink error:", linkError);
    return { error: "No se pudo generar el link. Intentá de nuevo." };
  }

  const nombre = perfil.nombre?.split(" ")[0] ?? "";
  const saludo = nombre ? `Hola ${nombre}! ` : "Hola! ";
  const mensaje =
    `${saludo}Tocá este link para ingresar a tu portal de Escobar Instalaciones 🔐\n\n` +
    `${data.properties.action_link}\n\n` +
    `_El link es personal y expira en 1 hora._`;

  const enviado = await enviarWhatsApp(telefono, mensaje);
  if (!enviado) {
    return { error: "No se pudo enviar el mensaje. Verificá el número o usá tu email." };
  }

  return { error: "", ok: true };
}

// ─── Flujo 4: DNI + contraseña (legacy) ──────────────────────────────────────

export async function loginConDni(
  _prev: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const dni = formData.get("dni") as string;
  const password = formData.get("password") as string;

  if (!dni || !password) return { error: "Completá todos los campos." };

  const perfil = await prisma.perfil.findUnique({ where: { dni } });

  if (!perfil) {
    // Delay artificial para igualar el tiempo de respuesta con el caso en que
    // el perfil SÍ existe pero la contraseña es incorrecta (timing oracle).
    // Sin este delay, un atacante puede enumerar DNIs válidos midiendo latencia.
    await new Promise((r) => setTimeout(r, 300));
    return { error: "DNI o contraseña incorrectos." };
  }

  const emailInterno = `dni_${dni}@${process.env.ADMIN_EMAIL_DOMAIN!}`;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: emailInterno, password });

  if (error) return { error: "DNI o contraseña incorrectos." };

  redirect("/portal/dashboard");
}

// ─── Logout ───────────────────────────────────────────────────────────────────

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// ─── Alta de cliente con DNI (solo admin) ─────────────────────────────────────

export async function altaClienteConDni(data: {
  nombre: string;
  dni: string;
  telefono?: string;
  passwordInicial: string;
}): Promise<{ error: string; perfilId?: string }> {
  // Verificar que el llamador está autenticado y es ADMIN antes de usar
  // el adminClient (que bypasea RLS). Sin esta guardia, cualquier cliente
  // autenticado podría invocar esta Server Action directamente.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado." };

  const perfilCaller = await prisma.perfil.findUnique({ where: { id: user.id } });
  if (perfilCaller?.rol !== "ADMIN") return { error: "Sin permisos de administrador." };

  const adminClient = createAdminClient();
  const emailInterno = `dni_${data.dni}@${process.env.ADMIN_EMAIL_DOMAIN!}`;

  const { data: authData, error } = await adminClient.auth.admin.createUser({
    email: emailInterno,
    password: data.passwordInicial,
    user_metadata: { dni: data.dni, nombre: data.nombre },
    email_confirm: true,
  });

  if (error) return { error: error.message };

  await prisma.perfil.create({
    data: {
      id: authData.user.id,
      nombre: data.nombre,
      dni: data.dni,
      telefono: data.telefono,
      email: emailInterno,
      rol: "CLIENTE",
    },
  });

  return { perfilId: authData.user.id, error: "" };
}

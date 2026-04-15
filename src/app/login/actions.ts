"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma/client";

// ─── Flujo 1: Email + contraseña ─────────────────────────────────────────────

export async function loginConEmail(
  _prev: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) return { error: "Completá todos los campos." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: "Email o contraseña incorrectos." };

  redirect("/portal/dashboard");
}

// ─── Flujo 2: WhatsApp OTP — paso 1: enviar código ───────────────────────────

export async function enviarOtpWhatsApp(
  _prev: { error: string; step?: string } | null,
  formData: FormData
): Promise<{ error: string; step?: string } | null> {
  const telefono = formData.get("telefono") as string;

  if (!telefono) return { error: "Ingresá tu número de teléfono." };

  // Verificar que el teléfono existe antes de gastar el OTP
  const perfil = await prisma.perfil.findUnique({ where: { telefono } });
  if (!perfil) {
    return { error: "Ese número no está registrado. Contactá a Escobar Instalaciones." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    phone: telefono,
    options: { channel: "whatsapp" },
  });

  if (error) return { error: "No se pudo enviar el código. Intentá de nuevo." };

  return { error: "", step: "verify" };
}

// ─── Flujo 2: WhatsApp OTP — paso 2: verificar código ────────────────────────

export async function verificarOtpWhatsApp(
  _prev: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const telefono = formData.get("telefono") as string;
  const token = formData.get("token") as string;

  if (!telefono || !token) return { error: "Completá todos los campos." };

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    phone: telefono,
    token,
    type: "sms",
  });

  if (error) return { error: "Código inválido o expirado." };

  redirect("/portal/dashboard");
}

// ─── Flujo 3: DNI + contraseña ────────────────────────────────────────────────

export async function loginConDni(
  _prev: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const dni = formData.get("dni") as string;
  const password = formData.get("password") as string;

  if (!dni || !password) return { error: "Completá todos los campos." };

  // El perfil existe con DNI? Solo si existe podemos armar el email interno
  const perfil = await prisma.perfil.findUnique({ where: { dni } });
  if (!perfil) {
    return { error: "DNI o contraseña incorrectos." };
  }

  const emailInterno = `dni_${dni}@${process.env.ADMIN_EMAIL_DOMAIN}`;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: emailInterno,
    password,
  });

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
  const adminClient = createAdminClient();
  const emailInterno = `dni_${data.dni}@${process.env.ADMIN_EMAIL_DOMAIN}`;

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

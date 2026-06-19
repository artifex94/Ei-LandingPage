import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma/client";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  // Detrás de Passenger el request.url llega como localhost:3000.
  // NEXT_PUBLIC_APP_URL tiene siempre la URL canónica de producción.
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=invalid_link`);
  }

  // Redirigir según el rol
  const perfil = await prisma.perfil.findUnique({ where: { id: data.user.id } });

  let destino = "/portal/dashboard";
  if (perfil?.rol === "ADMIN") destino = "/admin/dashboard";

  return NextResponse.redirect(`${origin}${destino}`);
}

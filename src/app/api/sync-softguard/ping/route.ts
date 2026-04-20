import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { registrarAudit } from "@/lib/audit";
import { getCuentaCount } from "@/lib/softguard/queries";

async function verificarAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const perfil = await prisma.perfil.findUnique({ where: { id: user.id } });
  return perfil?.rol === "ADMIN" ? perfil : null;
}

export async function POST() {
  const admin = await verificarAdmin();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const t0 = Date.now();
  const result = await getCuentaCount();
  const latency_ms = Date.now() - t0;

  await registrarAudit({
    admin_id: admin.id,
    admin_nombre: admin.nombre ?? "Admin",
    accion: "SOFTGUARD_PING",
    entidad: "softguard",
    entidad_id: "ping",
    detalle: {
      ok: result.ok,
      mock: result.mock,
      latency_ms,
      ...(result.ok ? { cuentas_count: result.data } : { error: result.error }),
    },
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, mock: false, error: result.error, latency_ms },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    mock: result.mock,
    cuentas_count: result.data,
    latency_ms,
  });
}

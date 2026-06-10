import { NextResponse } from "next/server";
import { getSesion } from "@/lib/auth/session";
import { registrarAudit } from "@/lib/audit";
import { getCuentaCount } from "@/lib/softguard/queries";

async function verificarAdmin() {
  const sesion = await getSesion();
  if (!sesion || sesion.perfil.rol !== "ADMIN") return null;
  return { id: sesion.userId, nombre: sesion.perfil.nombre };
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
    console.error("[softguard/ping] connection failed:", result.error);
    return NextResponse.json(
      { ok: false, mock: false, error: "Error de conexión con SoftGuard", latency_ms },
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

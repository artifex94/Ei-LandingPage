import { NextResponse } from "next/server";
import { getSesion } from "@/lib/auth/session";
import { registrarAudit } from "@/lib/audit";
import { getCuentaCount } from "@/lib/softguard/queries";
import { isMockMode } from "@/lib/softguard/client";
import { softguardWebApiConfigured, pingWebApi } from "@/lib/softguard/web-api";

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

  // Si el SQL directo está bloqueado (mock por firewall) pero la API web está
  // configurada, verificar conectividad contra la suite web (:8080).
  if (isMockMode() && softguardWebApiConfigured()) {
    try {
      const ping = await pingWebApi();
      const latency_ms = Date.now() - t0;
      await registrarAudit({
        admin_id: admin.id,
        admin_nombre: admin.nombre ?? "Admin",
        accion: "SOFTGUARD_PING",
        entidad: "softguard",
        entidad_id: "ping",
        detalle: { ok: ping.ok, fuente: "webapi", latency_ms, status: ping.status },
      });
      return NextResponse.json({
        ok: ping.ok,
        mock: false,
        fuente: "webapi",
        latency_ms,
      }, { status: ping.ok ? 200 : 502 });
    } catch (err) {
      const latency_ms = Date.now() - t0;
      const error = err instanceof Error ? err.message : String(err);
      console.error("[softguard/ping] web API failed:", error);
      return NextResponse.json(
        { ok: false, mock: false, fuente: "webapi", error: "Error de conexión con SoftGuard (API web)", latency_ms },
        { status: 502 }
      );
    }
  }

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

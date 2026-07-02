/**
 * GET /api/admin/contactos-cuenta?ref=ESI-0175&iid=175
 *
 * Contactos a notificar de una cuenta, para el módulo de notificación P1 vía wa.me.
 *
 * Fuente preferida: detalle del CRM de SoftGuard (fetchContactosCuenta, SOLO LECTURA).
 * Mientras el endpoint real no esté capturado (ver crm.ts / Fase 0), o si la central
 * no responde, degrada al único teléfono del portal (Perfil.telefono) como "Titular".
 *
 * Autenticación: ADMIN o empleado con capacidad `puede_monitorear` — mismo
 * criterio que /api/admin/patron-evento. Lo consume `MonitorOperadores`, que
 * también se monta en /monitoreo/en-vivo (gateado por `puede_monitorear`)
 * para operadores no-ADMIN.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSesion } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import {
  softguardWebApiConfigured,
  fetchContactosCuenta,
  type WebContactoCuenta,
} from "@/lib/softguard/api";

export const dynamic = "force-dynamic";

// Camino CRM activo: GET /Rest/Search/Telefonos por cuenta (endpoint real verificado).
// Si la central no responde o no trae teléfonos, degrada a Perfil.telefono (titular).
const CRM_CONTACTOS_HABILITADO = true;

export interface ContactosCuentaResponse {
  contactos: WebContactoCuenta[];
  fuente: "crm" | "perfil";
  degradado: boolean; // true si la central estaba configurada pero falló
}

export async function GET(req: NextRequest) {
  const sesion = await getSesion();
  if (!sesion) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (sesion.perfil.rol !== "ADMIN") {
    const empleado = await prisma.empleado.findFirst({
      where: { perfil_id: sesion.userId },
      select: { puede_monitorear: true },
    });
    if (!empleado?.puede_monitorear) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  }

  const ref = (req.nextUrl.searchParams.get("ref") ?? "").trim();
  const iid = Number(req.nextUrl.searchParams.get("iid"));
  if (!ref && !Number.isInteger(iid)) {
    return NextResponse.json({ error: "Falta ?ref o ?iid" }, { status: 400 });
  }

  // 1. Camino preferido: contactos del CRM de la central (solo si está habilitado).
  if (CRM_CONTACTOS_HABILITADO && Number.isInteger(iid) && softguardWebApiConfigured()) {
    try {
      const contactos = (await fetchContactosCuenta(iid)).filter((c) => c.telefono);
      if (contactos.length > 0) {
        return NextResponse.json({
          contactos,
          fuente: "crm",
          degradado: false,
        } satisfies ContactosCuentaResponse);
      }
      // CRM respondió pero sin teléfonos legibles → cae al fallback (no es error).
    } catch (err) {
      console.error("[contactos-cuenta] CRM falló, fallback a Perfil:", err);
      return responderFallback(ref, true);
    }
  }

  // 2. Fallback: el único teléfono del portal (Perfil.telefono).
  return responderFallback(ref, false);
}

async function responderFallback(ref: string, degradado: boolean): Promise<NextResponse> {
  const contactos: WebContactoCuenta[] = [];
  if (ref) {
    const cuenta = await prisma.cuenta.findUnique({
      where: { softguard_ref: ref },
      include: { perfil: { select: { nombre: true, telefono: true } } },
    });
    if (cuenta?.perfil.telefono) {
      contactos.push({
        nombre: cuenta.perfil.nombre,
        telefono: cuenta.perfil.telefono,
        rol: "Titular",
        orden: 0,
      });
    }
  }
  return NextResponse.json({
    contactos,
    fuente: "perfil",
    degradado,
  } satisfies ContactosCuentaResponse);
}

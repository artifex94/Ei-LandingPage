import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma/client";
import { BotonEnviarWhatsApp } from "@/components/admin/BotonEnviarWhatsApp";
import { motivosDeCobranza, agruparPagosPorCuenta, UMBRAL_MORA } from "@/lib/mensajeria-motivos";
import { resumenDeudaCuentas } from "@/lib/billing-deuda";
import { getParam } from "@/lib/parametros";

export const metadata: Metadata = { title: "Mensajería" };

const MESES = ["", "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export default async function MensajeriaPage() {
  const ahora = new Date();
  const mesActual = ahora.getMonth() + 1;
  const anioActual = ahora.getFullYear();
  const inicioMes = new Date(anioActual, mesActual - 1, 1);

  // Mismos criterios de deuda que /admin/morosidad.
  const filtroPagoVencido = {
    OR: [
      { estado: "VENCIDO" as const },
      {
        estado: "PENDIENTE" as const,
        OR: [{ anio: { lt: anioActual } }, { anio: anioActual, mes: { lt: mesActual } }],
      },
    ],
  };

  const umbralMora = await getParam("UMBRAL_MORA", UMBRAL_MORA);

  const [cuentasVencidas, contactadosRows, historialRows] = await Promise.all([
    prisma.cuenta.findMany({
      where: { estado: { not: "BAJA_DEFINITIVA" }, pagos: { some: filtroPagoVencido } },
      include: {
        perfil: { select: { id: true, nombre: true, telefono: true } },
        pagos: { where: filtroPagoVencido, orderBy: [{ anio: "asc" }, { mes: "asc" }] },
      },
    }),
    prisma.notificacionCliente.findMany({
      where: { origen: "COBRANZA", canal: "WHATSAPP_WALINK", fecha_envio: { gte: inicioMes } },
      select: { perfil_id: true },
    }),
    prisma.notificacionCliente.findMany({
      where: { canal: "WHATSAPP_WALINK" },
      orderBy: { fecha_envio: "desc" },
      take: 15,
      select: { id: true, perfil_id: true, asunto: true, destino: true, fecha_envio: true },
    }),
  ]);

  const contactados = new Set(contactadosRows.map((r) => r.perfil_id));

  // Agrupar deudores por cliente.
  const porCliente = new Map<string, { perfil: { id: string; nombre: string; telefono: string | null }; cuentas: typeof cuentasVencidas }>();
  for (const cuenta of cuentasVencidas) {
    const cid = cuenta.perfil.id;
    if (!porCliente.has(cid)) porCliente.set(cid, { perfil: cuenta.perfil, cuentas: [] });
    porCliente.get(cid)!.cuentas.push(cuenta);
  }

  const grupos = Array.from(porCliente.values())
    .map(({ perfil, cuentas }) => {
      const pagos = cuentas.flatMap((c) => c.pagos).map((p) => ({
        mes: p.mes, anio: p.anio, importe: Number(p.importe), estado: p.estado,
      }));
      // El desglose por cuenta se arma siempre (sin gate): motivosDeCobranza descarta las
      // cuentas sin deuda y el template colapsa al formato clásico si queda 1 sola.
      const pagosPorCuenta = agruparPagosPorCuenta(
        cuentas.map((c) => ({
          descripcion: c.descripcion,
          calle: c.calle,
          softguard_ref: c.softguard_ref,
          pagos: c.pagos.map((p) => ({ mes: p.mes, anio: p.anio, importe: Number(p.importe), estado: p.estado })),
        })),
      );
      return {
        perfil,
        resumen: resumenDeudaCuentas(pagos),
        motivos: motivosDeCobranza(perfil.nombre, pagos, pagosPorCuenta, umbralMora),
        contactado: contactados.has(perfil.id),
      };
    })
    .sort((a, b) =>
      // pendientes de contactar primero, luego por mayor deuda
      Number(a.contactado) - Number(b.contactado) || b.resumen.deudaTotal - a.resumen.deudaTotal,
    );

  const pendientes = grupos.filter((g) => !g.contactado).length;

  // Nombres para el historial (NotificacionCliente.perfil_id no tiene relación directa).
  const perfilIdsHist = [...new Set(historialRows.map((h) => h.perfil_id))];
  const perfilesHist = await prisma.perfil.findMany({
    where: { id: { in: perfilIdsHist } },
    select: { id: true, nombre: true },
  });
  const nombrePorId = new Map(perfilesHist.map((p) => [p.id, p.nombre]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white font-display">Mensajería</h1>
        <p className="text-sm text-slate-400 mt-1">
          Cobranza del mes por WhatsApp · {pendientes} pendiente{pendientes !== 1 ? "s" : ""} de contactar
          {" · "}{grupos.length} deudor{grupos.length !== 1 ? "es" : ""}
        </p>
      </div>

      {grupos.length === 0 ? (
        <div className="bg-green-900/20 border border-green-800 rounded-xl p-8 text-center">
          <p className="text-green-400 font-semibold text-lg">Sin deudores</p>
          <p className="text-green-400/60 text-sm mt-1">Todas las cuentas están al día.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {grupos.map(({ perfil, resumen, motivos, contactado }) => (
            <li
              key={perfil.id}
              className="flex items-center justify-between gap-4 rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3"
            >
              <div className="min-w-0">
                <Link
                  href={`/admin/clientes/${perfil.id}`}
                  className="font-semibold text-white hover:text-orange-400 transition-colors"
                >
                  {perfil.nombre}
                </Link>
                <p className="text-xs text-slate-500 mt-0.5">
                  Debe ${resumen.deudaTotal.toLocaleString("es-AR")}
                  {resumen.mesesAdeudados.length > 0 && (
                    <span> · {resumen.mesesAdeudados.map((m) => `${MESES[m.mes]} ${m.anio}`).join(", ")}</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {contactado ? (
                  <span className="text-[11px] font-semibold rounded-full border border-emerald-700/50 bg-emerald-950/40 text-emerald-300 px-2.5 py-1">
                    ✓ Contactado
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold rounded-full border border-amber-700/50 bg-amber-950/40 text-amber-300 px-2.5 py-1">
                    Pendiente
                  </span>
                )}
                {perfil.telefono ? (
                  <BotonEnviarWhatsApp
                    destinatario={{ nombre: perfil.nombre, telefono: perfil.telefono }}
                    motivos={motivos}
                    historial={{ perfilId: perfil.id }}
                    entidad="perfil"
                    entidadId={perfil.id}
                    label={contactado ? "Reenviar" : "Recordar"}
                    subtitulo={`Debe $${resumen.deudaTotal.toLocaleString("es-AR")}`}
                  />
                ) : (
                  <span className="text-[11px] text-slate-500 italic">Sin teléfono cargado</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {historialRows.length > 0 && (
        <section aria-labelledby="hist-heading">
          <h2 id="hist-heading" className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-2">
            Historial reciente
          </h2>
          <ul className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-900/40">
            {historialRows.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span className="text-slate-300 truncate">
                  {nombrePorId.get(h.perfil_id) ?? h.destino}
                  <span className="text-slate-600"> · {h.asunto}</span>
                </span>
                <span className="text-xs text-slate-500 shrink-0">
                  {h.fecha_envio.toLocaleDateString("es-AR")}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

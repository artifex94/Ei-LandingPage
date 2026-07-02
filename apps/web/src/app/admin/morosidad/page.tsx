import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma/client";
import { TutorialContextual } from "@/components/admin/TutorialContextual";
import { BotonEnviarWhatsApp } from "@/components/admin/BotonEnviarWhatsApp";
import { motivosDeCobranza, agruparPagosPorCuenta, UMBRAL_MORA } from "@/lib/mensajeria-motivos";
import { getParam } from "@/lib/parametros";

export const metadata: Metadata = { title: "Morosidad" };

const TUTORIAL_MOROSIDAD = [
  {
    titulo: "Cómo se define un moroso",
    descripcion: "Cuentas con 2 o más meses de pagos vencidos sin regularizar. Se calcula automáticamente al cargar la página.",
  },
  {
    titulo: "Contactar por WhatsApp",
    descripcion: "Cada cuenta tiene un botón de WhatsApp que abre un mensaje pre-redactado al titular. Es la forma más rápida de gestionar.",
  },
  {
    titulo: "Regularizar un pago vencido",
    descripcion: "Cuando el cliente paga, entrá a Pagos → buscá el mes vencido → registralo manualmente. Desaparece del listado de morosidad.",
  },
  {
    titulo: "Suspender una cuenta",
    descripcion: "Si no hay respuesta, podés cambiar el estado de la cuenta a SUSPENDIDA desde el detalle de la cuenta en Cuentas.",
  },
];

const MESES = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export default async function MorosidadPage() {
  const ahora = new Date();
  const mesActual  = ahora.getMonth() + 1;
  const anioActual = ahora.getFullYear();
  const umbralMora = await getParam("UMBRAL_MORA", UMBRAL_MORA);

  // Un pago se considera vencido si:
  //   a) su estado es "VENCIDO" (cron ya lo transitó), O
  //   b) su estado es "PENDIENTE" y corresponde a un mes anterior al actual
  //      (cron aún no corrió pero el período ya pasó).
  const filtroPagoVencido = {
    OR: [
      { estado: "VENCIDO" as const },
      {
        estado: "PENDIENTE" as const,
        OR: [
          { anio: { lt: anioActual } },
          { anio: anioActual, mes: { lt: mesActual } },
        ],
      },
    ],
  };

  const cuentasVencidas = await prisma.cuenta.findMany({
    where: {
      estado: { not: "BAJA_DEFINITIVA" },
      pagos: { some: filtroPagoVencido },
    },
    include: {
      perfil: { select: { id: true, nombre: true, telefono: true, email: true } },
      pagos: {
        where: filtroPagoVencido,
        orderBy: [{ anio: "asc" }, { mes: "asc" }],
      },
    },
    orderBy: { descripcion: "asc" },
  });

  // Mostrar cuentas con 1+ pago vencido/pendiente de meses anteriores
  const morosas = cuentasVencidas.filter((c) => c.pagos.length >= 1);

  // Agrupar por cliente
  const porCliente = new Map<string, {
    perfil: typeof morosas[0]["perfil"];
    cuentas: typeof morosas;
  }>();

  for (const cuenta of morosas) {
    const cid = cuenta.perfil.id;
    if (!porCliente.has(cid)) {
      porCliente.set(cid, { perfil: cuenta.perfil, cuentas: [] });
    }
    porCliente.get(cid)!.cuentas.push(cuenta);
  }

  const grupos = Array.from(porCliente.values()).sort((a, b) =>
    a.perfil.nombre.localeCompare(b.perfil.nombre)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Morosidad</h1>
          <p className="text-sm text-slate-400 mt-1">
            {morosas.length} cuenta{morosas.length !== 1 ? "s" : ""} con pagos vencidos
          </p>
        </div>
        <a
          href="/api/admin/export?tipo=morosidad"
          className="bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium px-3 py-2 rounded-lg min-h-[44px] flex items-center text-sm transition-colors shrink-0"
          title="Exportar morosidad a Excel"
        >
          ↓ Excel
        </a>
      </div>

      {grupos.length === 0 ? (
        <div className="bg-green-900/20 border border-green-800 rounded-xl p-8 text-center">
          <p className="text-green-400 font-semibold text-lg">Sin cuentas en morosidad</p>
          <p className="text-green-400/60 text-sm mt-1">Todas las cuentas tienen sus pagos al día.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grupos.map(({ perfil, cuentas }) => {
            const totalVencido = cuentas.reduce(
              (s, c) => s + c.pagos.reduce((ps, p) => ps + Number(p.importe), 0),
              0
            );
            // El desglose por cuenta se arma siempre (sin gate): motivosDeCobranza descarta
            // las cuentas sin deuda y el template colapsa al formato clásico si queda 1 sola.
            const motivos = motivosDeCobranza(
              perfil.nombre,
              cuentas.flatMap((c) => c.pagos).map((p) => ({
                mes: p.mes,
                anio: p.anio,
                importe: Number(p.importe),
                estado: p.estado,
              })),
              agruparPagosPorCuenta(
                cuentas.map((c) => ({
                  descripcion: c.descripcion,
                  calle: c.calle,
                  softguard_ref: c.softguard_ref,
                  pagos: c.pagos.map((p) => ({
                    mes: p.mes,
                    anio: p.anio,
                    importe: Number(p.importe),
                    estado: p.estado,
                  })),
                })),
              ),
              umbralMora,
            );

            return (
              <div
                key={perfil.id}
                className="bg-slate-800 border border-orange-700/40 rounded-xl overflow-hidden"
              >
                {/* Header del cliente */}
                <div className="bg-orange-950/30 px-5 py-4 flex items-start justify-between gap-4">
                  <div>
                    <Link
                      href={`/admin/clientes/${perfil.id}`}
                      className="font-bold text-white hover:text-orange-400 transition-colors text-lg"
                    >
                      {perfil.nombre}
                    </Link>
                    <div className="flex flex-wrap gap-3 mt-1 text-sm text-slate-400">
                      {perfil.email && <span>{perfil.email}</span>}
                      {perfil.telefono && (
                        <a
                          href={`tel:${perfil.telefono.replace(/\D/g, "")}`}
                          className="hover:text-white transition-colors"
                        >
                          {perfil.telefono}
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <p className="text-orange-300 font-bold text-lg">
                        ${totalVencido.toLocaleString("es-AR")}
                      </p>
                      <p className="text-orange-400/60 text-xs">Total vencido</p>
                    </div>
                    <BotonEnviarWhatsApp
                      destinatario={{ nombre: perfil.nombre, telefono: perfil.telefono }}
                      motivos={motivos}
                      historial={{ perfilId: perfil.id }}
                      entidad="perfil"
                      entidadId={perfil.id}
                      subtitulo={`Debe $${totalVencido.toLocaleString("es-AR")}`}
                    />
                  </div>
                </div>

                {/* Cuentas del cliente */}
                <div className="divide-y divide-slate-700">
                  {cuentas.map((cuenta) => {
                    const subtotal = cuenta.pagos.reduce((s, p) => s + Number(p.importe), 0);
                    return (
                      <div key={cuenta.id} className="px-5 py-4">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div>
                            <Link
                              href={`/admin/cuentas/${cuenta.id}`}
                              className="font-semibold text-white hover:text-orange-400 transition-colors text-sm"
                            >
                              {cuenta.descripcion}
                            </Link>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Ref: {cuenta.softguard_ref ?? "—"}
                            </p>
                          </div>
                          <p className="text-orange-300 font-bold text-sm shrink-0">
                            ${subtotal.toLocaleString("es-AR")}
                          </p>
                        </div>

                        {/* Pills de meses vencidos */}
                        <div className="flex flex-wrap gap-2">
                          {cuenta.pagos.map((p) => (
                            <span
                              key={p.id}
                              className="bg-orange-900/40 border border-orange-700/50 text-orange-300 text-xs font-medium px-2.5 py-1 rounded-full"
                            >
                              {MESES[p.mes]} {p.anio} — ${Number(p.importe).toLocaleString("es-AR")}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <TutorialContextual
        section="morosidad"
        titulo="Guía rápida — Morosidad"
        steps={TUTORIAL_MOROSIDAD}
      />
    </div>
  );
}

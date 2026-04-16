import Link from "next/link";
import { prisma } from "@/lib/prisma/client";

const MESES = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

function waLink(telefono: string, nombre: string, deuda: string) {
  const msg = encodeURIComponent(
    `Hola ${nombre}, te contactamos de Escobar Instalaciones. Tenés pagos pendientes por $${deuda}. ¿Podemos ayudarte a regularizarlos?`
  );
  const num = telefono.replace(/\D/g, "");
  return `https://wa.me/${num}?text=${msg}`;
}

export default async function MorosidadPage() {
  // Cuentas con 2+ pagos VENCIDO
  const cuentasVencidas = await prisma.cuenta.findMany({
    where: {
      estado: { not: "BAJA_DEFINITIVA" },
      pagos: { some: { estado: "VENCIDO" } },
    },
    include: {
      perfil: { select: { id: true, nombre: true, telefono: true, email: true } },
      pagos: {
        where: { estado: "VENCIDO" },
        orderBy: [{ anio: "asc" }, { mes: "asc" }],
      },
    },
    orderBy: { descripcion: "asc" },
  });

  // Filtrar solo las que tienen 2+ pagos vencidos
  const morosas = cuentasVencidas.filter((c) => c.pagos.length >= 2);

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
        <h1 className="text-2xl font-bold text-white">Morosidad</h1>
        <span className="text-sm text-slate-400">
          {morosas.length} cuenta{morosas.length !== 1 ? "s" : ""} con 2+ meses vencidos
        </span>
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
                        <span>
                          {perfil.telefono}
                        </span>
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
                    {perfil.telefono && (
                      <a
                        href={waLink(perfil.telefono, perfil.nombre.split(" ")[0], totalVencido.toLocaleString("es-AR"))}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-green-700 hover:bg-green-600 text-white font-semibold text-sm px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 min-h-[40px]"
                        title="Enviar mensaje por WhatsApp"
                      >
                        <span aria-hidden="true">📱</span>
                        WhatsApp
                      </a>
                    )}
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
                              Ref: {cuenta.softguard_ref}
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
    </div>
  );
}

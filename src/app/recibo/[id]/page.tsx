import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { PrintButton } from "./PrintButton";

const MESES_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

const METODO_LABEL: Record<string, string> = {
  MERCADOPAGO:            "MercadoPago",
  TALO_CVU:               "Transferencia CVU",
  EFECTIVO:               "Efectivo",
  CHEQUE:                 "Cheque",
  TRANSFERENCIA_BANCARIA: "Transferencia bancaria",
};

function numeroRecibo(id: string, anio: number, mes: number) {
  return `REC-${anio}${String(mes).padStart(2, "0")}-${id.slice(-6).toUpperCase()}`;
}

export default async function ReciboPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Auth guard — el recibo pertenece al titular o a un admin
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const pago = await prisma.pago.findUnique({
    where: { id },
    include: {
      cuenta: {
        include: {
          perfil: {
            select: {
              id: true,
              nombre: true,
              email: true,
              telefono: true,
              cuit: true,
              razon_social: true,
              rol: true,
            },
          },
        },
      },
    },
  });

  if (!pago) notFound();

  // Solo el propio titular o un ADMIN puede ver el recibo
  const perfil = await prisma.perfil.findUnique({ where: { id: user.id }, select: { rol: true } });
  if (pago.cuenta.perfil.id !== user.id && perfil?.rol !== "ADMIN") notFound();

  if (pago.estado !== "PAGADO") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500 text-sm">Este pago aún no está acreditado.</p>
      </div>
    );
  }

  const titular = pago.cuenta.perfil;
  const nro = numeroRecibo(pago.id, pago.anio, pago.mes);
  const fechaPago = pago.acreditado_en ?? pago.updated_at;

  return (
    <>
      <PrintButton />

      <main className="max-w-2xl mx-auto px-8 py-12 print:py-6 print:px-6">

        {/* Encabezado */}
        <div className="flex items-start justify-between mb-10 print:mb-8">
          <div>
            <div className="w-10 h-10 bg-orange-700 rounded-lg flex items-center justify-center text-white font-bold text-base mb-3 print:mb-2">
              EI
            </div>
            <p className="text-lg font-bold text-slate-900">Escobar Instalaciones</p>
            <p className="text-xs text-slate-500 mt-0.5">CUIT 20-38557350-3</p>
            <p className="text-xs text-slate-500">Rawson 255 — Victoria, Entre Ríos</p>
            <p className="text-xs text-slate-500">343-657-5372</p>
          </div>

          <div className="text-right">
            <p className="text-2xl font-bold text-slate-900 tracking-tight">RECIBO</p>
            <p className="text-xs font-mono text-slate-500 mt-1">{nro}</p>
            <p className="text-xs text-slate-500 mt-2">
              {fechaPago.toLocaleDateString("es-AR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>

        {/* Divisor */}
        <hr className="border-slate-200 mb-8 print:mb-6" />

        {/* Datos del titular */}
        <div className="mb-8 print:mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Recibido de
          </p>
          <p className="text-base font-semibold text-slate-900">
            {titular.razon_social ?? titular.nombre}
          </p>
          {titular.cuit && (
            <p className="text-xs text-slate-500 mt-0.5">CUIT {titular.cuit}</p>
          )}
          {titular.email && (
            <p className="text-xs text-slate-500">{titular.email}</p>
          )}
        </div>

        {/* Detalle del pago */}
        <div className="rounded-lg border border-slate-200 overflow-hidden mb-8 print:mb-6">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-slate-500 font-medium text-xs uppercase tracking-wider">
                  Concepto
                </th>
                <th className="text-right px-4 py-3 text-slate-500 font-medium text-xs uppercase tracking-wider">
                  Importe
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-4 py-4">
                  <p className="font-medium text-slate-900 capitalize">
                    {pago.cuenta.descripcion}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 capitalize">
                    Período: {MESES_ES[pago.mes - 1]} {pago.anio}
                  </p>
                  {pago.metodo && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      Forma de pago: {METODO_LABEL[pago.metodo] ?? pago.metodo}
                    </p>
                  )}
                </td>
                <td className="px-4 py-4 text-right font-semibold text-slate-900 text-base">
                  ${Number(pago.importe).toLocaleString("es-AR")}
                </td>
              </tr>
            </tbody>
            <tfoot className="bg-slate-50 border-t border-slate-200">
              <tr>
                <td className="px-4 py-3 text-sm font-semibold text-slate-700">Total recibido</td>
                <td className="px-4 py-3 text-right text-lg font-bold text-slate-900">
                  ${Number(pago.importe).toLocaleString("es-AR")}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Sello CANCELADO */}
        <div className="flex justify-center mb-10 print:mb-8">
          <div className="border-4 border-emerald-600 rounded-lg px-8 py-3 rotate-[-2deg] print:rotate-[-2deg]">
            <p className="text-2xl font-black text-emerald-600 tracking-widest uppercase">
              Cancelado
            </p>
          </div>
        </div>

        {/* Pie */}
        <hr className="border-slate-200 mb-6" />
        <p className="text-xs text-slate-400 text-center">
          Este documento es un comprobante interno de pago. No es una factura fiscal.{" "}
          Número de referencia: <span className="font-mono">{pago.id}</span>
        </p>
      </main>
    </>
  );
}

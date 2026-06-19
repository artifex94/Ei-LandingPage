import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma/client";
import { FacturacionTabs } from "@/components/admin/facturacion/FacturacionTabs";
import { GenerarBorradoresButton } from "@/components/admin/facturacion/GenerarBorradoresButton";
import { siteConfig } from "@/config/site";
import { TutorialContextual } from "@/components/admin/TutorialContextual";

const TUTORIAL_FACTURACION = [
  {
    titulo: "Flujo de facturación",
    descripcion: "Cada mes: generás borradores → los exportás a ARCA → ARCA devuelve el archivo firmado → subís el PDF acá.",
  },
  {
    titulo: "Generar borradores",
    descripcion: 'El botón "Generar borradores" crea una factura borrador por cada titular que tiene "requiere_factura" activo.',
  },
  {
    titulo: "Exportar a ARCA",
    descripcion: "Desde la pestaña Borradores podés preparar el archivo para ARCA. Seguí los pasos del modal de instrucciones.",
  },
  {
    titulo: "Subir PDF emitido",
    descripcion: "Cuando ARCA procesa y devuelve la factura firmada, subís el PDF acá para que el cliente lo vea en su portal.",
  },
];

export const metadata: Metadata = { title: "Facturación" };

export default async function FacturacionPage() {
  const hoy = new Date();
  const mesActual = hoy.getMonth() + 1;
  const anioActual = hoy.getFullYear();

  const [borradores, emitidas, titulares] = await Promise.all([
    prisma.factura.findMany({
      where: { estado: "BORRADOR" },
      include: {
        perfil: { select: { id: true, nombre: true } },
        items: { select: { id: true, descripcion: true, cantidad: true, precio_unit: true, subtotal: true } },
      },
      orderBy: { created_at: "desc" },
      take: 200,
    }),
    prisma.factura.findMany({
      where: { estado: { in: ["EMITIDA_MANUAL", "EMITIDA_WSFE"] } },
      include: {
        perfil: { select: { id: true, nombre: true } },
        items: { select: { id: true, descripcion: true, cantidad: true, precio_unit: true, subtotal: true } },
      },
      orderBy: { fecha_emision: "desc" },
      take: 100,
    }),
    // Todos los titulares con al menos una cuenta activa
    prisma.perfil.findMany({
      where: { activo: true, cuentas: { some: { estado: "ACTIVA" } } },
      select: {
        id: true,
        nombre: true,
        cuit: true,
        razon_social: true,
        condicion_iva: true,
        requiere_factura: true,
      },
      orderBy: [{ requiere_factura: "desc" }, { nombre: "asc" }],
    }),
  ]);

  const totalBorradores = borradores.reduce((acc, f) => acc + Number(f.total), 0);
  const totalEmitidas   = emitidas.reduce((acc, f) => acc + Number(f.total), 0);

  // Titulares marcados para facturar pero sin CUIT
  const sinCuit = titulares.filter((t) => t.requiere_factura && !t.cuit).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Facturación</h1>
          <p className="text-sm text-slate-400 mt-1">
            Factura C — ESCOBAR RAMIRO ANIBAL · CUIT {siteConfig.fiscal.cuitDisplay}
          </p>
        </div>
        <GenerarBorradoresButton anio={anioActual} mes={mesActual} />
      </div>

      {sinCuit > 0 && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3"
        >
          <span className="mt-0.5 text-amber-400" aria-hidden="true">⚠</span>
          <p className="text-sm text-amber-300">
            <strong className="font-semibold">
              {sinCuit} titular{sinCuit !== 1 ? "es" : ""} marcado{sinCuit !== 1 ? "s" : ""} para facturar sin CUIT cargado.
            </strong>{" "}
            El borrador se genera igual pero el CUIT receptor quedará vacío.{" "}
            Completalo en la pestaña <strong>Titulares</strong> o en{" "}
            <Link href="/admin/clientes" className="underline">Clientes</Link>.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Kpi label="Borradores" valor={borradores.length} />
        <Kpi label="Total borradores" valor={`$${totalBorradores.toLocaleString("es-AR")}`} />
        <Kpi label="Emitidas (historial)" valor={emitidas.length} />
        <Kpi label="Total emitidas" valor={`$${totalEmitidas.toLocaleString("es-AR")}`} />
      </div>

      <FacturacionTabs borradores={borradores} emitidas={emitidas} titulares={titulares} />

      <TutorialContextual
        section="facturacion"
        titulo="Guía rápida — Facturación"
        steps={TUTORIAL_FACTURACION}
      />
    </div>
  );
}

function Kpi({ label, valor }: { label: string; valor: string | number }) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-3">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className="text-xl font-bold text-white">{valor}</p>
    </div>
  );
}

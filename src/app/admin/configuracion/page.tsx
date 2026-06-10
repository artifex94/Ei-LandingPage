import type { Metadata } from "next";
import { prisma } from "@/lib/prisma/client";
import { ConfiguracionForm } from "@/components/admin/configuracion/ConfiguracionForm";
import { TARIFA_FALLBACK_PESOS } from "@/lib/constants/billing";
import { TutorialContextual } from "@/components/admin/TutorialContextual";

const TUTORIAL_CONFIGURACION = [
  {
    titulo: "Tarifa estándar",
    descripcion: "Es el importe mensual que se aplica a nuevas cuentas. Las cuentas existentes mantienen su tarifa individual hasta que la actualices.",
  },
  {
    titulo: "Historial de tarifas",
    descripcion: "Cada cambio queda registrado con fecha. Permite ver la evolución de precios y auditar cuándo se actualizó.",
  },
  {
    titulo: "Datos fiscales",
    descripcion: "Completá CUIT, razón social y condición IVA. Estos datos se usan al generar los borradores de facturación.",
  },
];

export const metadata: Metadata = { title: "Configuración" };

export default async function ConfiguracionPage() {
  const ultimaTarifa = await prisma.tarifaHistorico.findFirst({ orderBy: { vigente_desde: "desc" } });

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Configuración</h1>
        <p className="text-sm text-slate-400 mt-1">
          Datos fiscales, tarifa estándar y parámetros del sistema.
        </p>
      </div>

      <ConfiguracionForm tarifaActual={ultimaTarifa ? Number(ultimaTarifa.monto) : TARIFA_FALLBACK_PESOS} />

      <TutorialContextual
        section="configuracion"
        titulo="Guía rápida — Configuración"
        steps={TUTORIAL_CONFIGURACION}
      />
    </div>
  );
}

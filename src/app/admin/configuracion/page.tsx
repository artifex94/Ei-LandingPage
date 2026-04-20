import type { Metadata } from "next";
import { prisma } from "@/lib/prisma/client";
import { ConfiguracionForm } from "@/components/admin/configuracion/ConfiguracionForm";

export const metadata: Metadata = { title: "Configuración — Admin" };

export default async function ConfiguracionPage() {
  const [ultimaTarifa] = await Promise.all([
    prisma.tarifaHistorico.findFirst({ orderBy: { vigente_desde: "desc" } }),
  ]);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Configuración</h1>
        <p className="text-sm text-slate-400 mt-1">
          Datos fiscales, tarifa estándar y parámetros del sistema.
        </p>
      </div>

      <ConfiguracionForm tarifaActual={ultimaTarifa ? Number(ultimaTarifa.monto) : 15000} />
    </div>
  );
}

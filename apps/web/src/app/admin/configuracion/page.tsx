import type { Metadata } from "next";
import { prisma } from "@/lib/prisma/client";
import { ConfiguracionForm } from "@/components/admin/configuracion/ConfiguracionForm";
import { ParametrosNegocioForm, type ParametroDisplay } from "@/components/admin/configuracion/ParametrosNegocioForm";
import { TARIFA_FALLBACK_PESOS } from "@/lib/constants/billing";
import { CATALOGO_PARAMETROS } from "@/lib/parametros";
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
  {
    titulo: "Parámetros de negocio",
    descripcion: "Umbrales de cobranza y cobertura de turnos editables sin deploy. Si nunca se editaron, se usa el valor por defecto (columna Default).",
  },
];

export const metadata: Metadata = { title: "Configuración" };

export default async function ConfiguracionPage() {
  const [ultimaTarifa, filasParametros] = await Promise.all([
    prisma.tarifaHistorico.findFirst({ orderBy: { vigente_desde: "desc" } }),
    prisma.parametroNegocio.findMany(),
  ]);

  const porClave = new Map(filasParametros.map((f) => [f.clave, f]));
  const parametros: ParametroDisplay[] = CATALOGO_PARAMETROS.map((p) => {
    const fila = porClave.get(p.clave);
    return {
      clave: p.clave,
      tipo: p.tipo,
      categoria: p.categoria,
      descripcion: p.descripcion,
      defaultValor: String(p.defaultValor),
      valorActual: fila ? fila.valor : String(p.defaultValor),
      esDefault: !fila,
      updatedPor: fila?.updated_por ?? null,
      updatedAt: fila?.updated_at?.toISOString() ?? null,
    };
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Configuración</h1>
        <p className="text-sm text-slate-400 mt-1">
          Datos fiscales, tarifa estándar y parámetros del sistema.
        </p>
      </div>

      <ConfiguracionForm tarifaActual={ultimaTarifa ? Number(ultimaTarifa.monto) : TARIFA_FALLBACK_PESOS} />

      <ParametrosNegocioForm parametros={parametros} />

      <TutorialContextual
        section="configuracion"
        titulo="Guía rápida — Configuración"
        steps={TUTORIAL_CONFIGURACION}
      />
    </div>
  );
}

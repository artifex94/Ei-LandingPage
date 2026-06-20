import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma/client";
import { AprobarButton, RechazarForm, EditarYAprobarForm } from "./AccionesForm";
import { TutorialContextual } from "@/components/admin/TutorialContextual";
import { EmptyStateSuccess } from "@/components/admin/EmptyStateSuccess";

const TUTORIAL_CAMBIOS = [
  {
    titulo: "Qué es un cambio de datos",
    descripcion: "Un cliente solicitó modificar su teléfono, email u otro dato desde el portal. Cada solicitud muestra el valor actual y el propuesto.",
  },
  {
    titulo: "Aprobar directamente",
    descripcion: '"Aprobar" aplica el cambio propuesto tal cual. Usalo cuando el valor nuevo es correcto y no necesita ajuste.',
  },
  {
    titulo: "Editar y aprobar",
    descripcion: 'Si el valor propuesto tiene errores (formato de teléfono, typo), usá "Editar y aprobar" para corregirlo antes de guardarlo.',
  },
  {
    titulo: "Rechazar",
    descripcion: "Rechazá si el cambio no corresponde o hay un problema. El cliente puede volver a solicitarlo.",
  },
];

export const metadata: Metadata = { title: "Solicitudes de cambio" };

const CAMPO_LABEL: Record<string, string> = {
  nombre: "Nombre",
  telefono: "Teléfono",
  email: "Email",
};

export default async function SolicitudesCambioPage() {
  const solicitudes = await prisma.solicitudCambioInfo.findMany({
    where: { estado: "PENDIENTE" },
    include: { perfil: { select: { id: true, nombre: true } } },
    orderBy: { created_at: "asc" },
  });

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Solicitudes de cambio</h1>
        <p className="text-slate-400 text-sm mt-1">
          Pedidos de actualización de datos enviados por los clientes.
        </p>
      </div>

      {solicitudes.length === 0 ? (
        <EmptyStateSuccess
          titulo="Sin cambios pendientes"
          descripcion="Todos los cambios de datos han sido revisados."
        />
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-slate-400">
            {solicitudes.length} solicitud{solicitudes.length !== 1 ? "es" : ""} pendiente
            {solicitudes.length !== 1 ? "s" : ""}
          </p>

          {solicitudes.map((s) => (
            <div
              key={s.id}
              className="bg-slate-800 rounded-xl border border-slate-700 p-5"
            >
              {/* Encabezado */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <Link
                    href={`/admin/clientes/${s.perfil.id}`}
                    className="font-semibold text-white hover:text-orange-400 transition-colors"
                  >
                    {s.perfil.nombre}
                  </Link>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {new Date(s.created_at).toLocaleDateString("es-AR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <span className="text-xs font-semibold bg-amber-900/40 text-amber-400 px-2 py-1 rounded-full shrink-0">
                  PENDIENTE
                </span>
              </div>

              {/* Detalle del cambio */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                <div className="bg-slate-900/50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Campo</p>
                  <p className="font-semibold text-slate-200">
                    {CAMPO_LABEL[s.campo] ?? s.campo}
                  </p>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Valor actual</p>
                  <p className="font-medium text-slate-300 truncate">
                    {s.valor_actual ?? <span className="italic text-slate-500">Sin registrar</span>}
                  </p>
                </div>
                <div className="bg-orange-900/20 border border-orange-800/40 rounded-lg p-3">
                  <p className="text-xs text-orange-400 mb-1">Valor propuesto</p>
                  <p className="font-semibold text-white truncate">{s.valor_nuevo}</p>
                </div>
              </div>

              {/* Acciones */}
              <div className="flex flex-wrap items-start gap-3 border-t border-slate-700 pt-4">
                <AprobarButton id={s.id} />
                <RechazarForm id={s.id} />
                <EditarYAprobarForm id={s.id} valorPropuesto={s.valor_nuevo} />
              </div>
            </div>
          ))}
        </div>
      )}

      <TutorialContextual
        section="solicitudes-cambio"
        titulo="Guía rápida — Cambios de datos"
        steps={TUTORIAL_CAMBIOS}
      />
    </div>
  );
}

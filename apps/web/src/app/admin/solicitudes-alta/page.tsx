import type { AltaUsuario } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma/client";
import { AltaAcciones } from "./AltaUsuarioRow";
import { TutorialContextual } from "@/components/admin/TutorialContextual";
import { EmptyStateSuccess } from "@/components/admin/EmptyStateSuccess";
import { DataTable, type Column } from "@/components/ui/DataTable";

export const metadata = { title: "Altas de usuario" };

const ESTADO_BADGE: Record<string, string> = {
  PENDIENTE: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  PROCESADA: "bg-green-500/20 text-green-300 border-green-500/30",
  RECHAZADA: "bg-red-500/20 text-red-300 border-red-500/30",
};

const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE: "Pendiente",
  PROCESADA: "Procesada",
  RECHAZADA: "Rechazada",
};

const altaColumns: Column<AltaUsuario>[] = [
  {
    id: "nombre",
    header: "Nombre",
    cell: (s) => <span className="text-white font-medium">{s.nombre}</span>,
  },
  {
    id: "telefono",
    header: "Teléfono",
    cell: (s) =>
      s.telefono ? (
        <a href={`tel:${s.telefono.replace(/\D/g, "")}`} className="text-slate-400 hover:text-white font-mono text-xs transition-colors">
          {s.telefono}
        </a>
      ) : (
        <span className="text-slate-600 font-mono text-xs">—</span>
      ),
  },
  {
    id: "dni",
    header: "DNI",
    cell: (s) => <span className="text-slate-400 text-xs">{s.dni ?? "—"}</span>,
  },
  {
    id: "fecha",
    header: "Fecha",
    cell: (s) => (
      <span className="text-slate-400 text-xs whitespace-nowrap">
        {new Intl.DateTimeFormat("es-AR", {
          day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit",
        }).format(new Date(s.created_at))}
      </span>
    ),
  },
  {
    id: "estado",
    header: "Estado",
    cell: (s) => (
      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${ESTADO_BADGE[s.estado] ?? ""}`}>
        {ESTADO_LABEL[s.estado] ?? s.estado}
      </span>
    ),
  },
  {
    id: "acciones",
    header: "Acciones",
    srOnlyHeader: true,
    cell: (s) => <AltaAcciones solicitud={s} />,
  },
];

const TUTORIAL_ALTAS = [
  {
    titulo: "Qué es una solicitud de alta",
    descripcion: "Cuando alguien completa el formulario de alta en el sitio, aparece acá. Revisás los datos antes de crear la cuenta.",
  },
  {
    titulo: "Aprobar una solicitud",
    descripcion: "Al aprobar, se crea el usuario en el sistema y se le da acceso al portal. Se le envía el email de bienvenida automáticamente.",
  },
  {
    titulo: "Rechazar con motivo",
    descripcion: "Podés rechazar indicando el motivo (datos incompletos, dirección fuera de zona, etc.). El solicitante recibe una notificación.",
  },
  {
    titulo: "Alta manual vs solicitud",
    descripcion: "Si necesitás dar de alta un cliente sin que haya pedido, usá el botón '+ Nuevo' en la sección Clientes.",
  },
];

const renderAltaCard = (s: AltaUsuario) => (
  <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-2">
    <div className="flex items-start justify-between gap-2">
      <span className="text-white font-medium">{s.nombre}</span>
      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${ESTADO_BADGE[s.estado] ?? ""}`}>
        {ESTADO_LABEL[s.estado] ?? s.estado}
      </span>
    </div>
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-slate-500">Teléfono:</span>
      {s.telefono ? (
        <a href={`tel:${s.telefono.replace(/\D/g, "")}`} className="text-sm text-blue-400">{s.telefono}</a>
      ) : (
        <span className="text-sm text-slate-600">—</span>
      )}
    </div>
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-slate-500">DNI:</span>
      <span className="text-sm text-white">{s.dni ?? "—"}</span>
    </div>
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-slate-500">Fecha:</span>
      <span className="text-sm text-slate-300">
        {new Intl.DateTimeFormat("es-AR", {
          day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit",
        }).format(new Date(s.created_at))}
      </span>
    </div>
    <div className="pt-1 border-t border-slate-700">
      <AltaAcciones solicitud={s} />
    </div>
  </div>
);

export default async function SolicitudesAltaPage() {
  const solicitudes = await prisma.altaUsuario.findMany({
    orderBy: { created_at: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Solicitudes de alta</h1>
        <p className="text-sm text-slate-500 mt-1">
          Clientes que solicitaron acceso al portal
        </p>
      </div>

      <DataTable
        columns={altaColumns}
        rows={solicitudes}
        keyExtractor={(s) => s.id}
        caption="Solicitudes de alta de usuario"
        renderCard={renderAltaCard}
        emptyState={
          <EmptyStateSuccess
            titulo="Sin solicitudes pendientes"
            descripcion="Todas las solicitudes de alta han sido procesadas."
            cta={{ label: "Dar de alta un cliente manualmente", href: "/admin/clientes/nuevo" }}
          />
        }
      />

      <TutorialContextual
        section="solicitudes-alta"
        titulo="Guía rápida — Altas de usuario"
        steps={TUTORIAL_ALTAS}
      />
    </div>
  );
}

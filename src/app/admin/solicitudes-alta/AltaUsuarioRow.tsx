"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { AltaUsuario } from "@/generated/prisma/client";
import { procesarAltaUsuario, rechazarAltaUsuario } from "./actions";
import type { AltaActionResult } from "./actions";

const initial: AltaActionResult = {};

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

function ProcesarForm({ altaId }: { altaId: string }) {
  const [state, action, pending] = useActionState(procesarAltaUsuario, initial);

  return (
    <form action={action}>
      <input type="hidden" name="altaId" value={altaId} />
      {state.errores && (
        <p className="text-xs text-red-400 mb-1">{state.errores[0]}</p>
      )}
      {state.ok && !state.warnWhatsApp && (
        <p className="text-green-400 text-xs mt-1">Solicitud procesada. Link enviado por WhatsApp.</p>
      )}
      {state.ok && state.warnWhatsApp && (
        <p className="text-amber-400 text-xs mt-1">
          Perfil creado pero el WhatsApp no se pudo enviar. Copiá el link de acceso desde <code>notas_admin</code> y envialo manualmente.
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="px-3 py-1.5 rounded-md text-xs font-semibold bg-orange-600 hover:bg-orange-500 disabled:opacity-60 text-white transition-colors min-h-[36px]"
      >
        {pending ? "Procesando..." : "Procesar"}
      </button>
    </form>
  );
}

function RechazarForm({ altaId }: { altaId: string }) {
  const [state, action, pending] = useActionState(rechazarAltaUsuario, initial);

  return (
    <form action={action}>
      <input type="hidden" name="altaId" value={altaId} />
      {state.errores && (
        <p className="text-xs text-red-400 mb-1">{state.errores[0]}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="px-3 py-1.5 rounded-md text-xs font-semibold bg-red-900/60 hover:bg-red-800 disabled:opacity-60 text-red-300 transition-colors min-h-[36px]"
      >
        {pending ? "..." : "Rechazar"}
      </button>
    </form>
  );
}

export function AltaUsuarioRow({ solicitud }: { solicitud: AltaUsuario }) {
  const fecha = new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(solicitud.created_at));

  const badgeClass = ESTADO_BADGE[solicitud.estado] ?? "";
  const estadoLabel = ESTADO_LABEL[solicitud.estado] ?? solicitud.estado;

  return (
    <tr className="hover:bg-slate-700/20 transition-colors">
      <td className="px-4 py-3 text-white font-medium">{solicitud.nombre}</td>
      <td className="px-4 py-3 text-slate-400 font-mono text-xs">{solicitud.telefono}</td>
      <td className="px-4 py-3 text-slate-400 text-xs">{solicitud.dni ?? "—"}</td>
      <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{fecha}</td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border ${badgeClass}`}
        >
          {estadoLabel}
        </span>
      </td>
      <td className="px-4 py-3">
        {solicitud.estado === "PENDIENTE" && (
          <div className="flex items-center gap-2">
            <ProcesarForm altaId={solicitud.id} />
            <RechazarForm altaId={solicitud.id} />
          </div>
        )}
        {solicitud.estado === "PROCESADA" && solicitud.perfil_id && (
          <Link
            href={`/admin/clientes/${solicitud.perfil_id}`}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            Ver cliente →
          </Link>
        )}
      </td>
    </tr>
  );
}

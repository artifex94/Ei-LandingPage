"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { AltaUsuario } from "@/generated/prisma/client";
import { procesarAltaUsuario, rechazarAltaUsuario } from "./actions";
import type { AltaActionResult } from "./actions";

const initial: AltaActionResult = {};

function ProcesarForm({ altaId }: { altaId: string }) {
  const [state, action, pending] = useActionState(procesarAltaUsuario, initial);

  return (
    <form action={action}>
      <input type="hidden" name="altaId" value={altaId} />
      {state.errores && (
        <p role="alert" className="text-xs text-red-400 mb-1">{state.errores[0]}</p>
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
        className="px-3 py-1.5 rounded-md text-xs font-semibold bg-orange-600 hover:bg-orange-500 disabled:opacity-60 text-slate-900 transition-colors min-h-[36px]"
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
        <p role="alert" className="text-xs text-red-400 mb-1">{state.errores[0]}</p>
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

// Acciones por fila — client (server actions vía useActionState). Se usa como
// celda dentro del <DataTable> server de la página.
export function AltaAcciones({ solicitud }: { solicitud: AltaUsuario }) {
  return (
    <>
      {solicitud.estado === "PENDIENTE" && (
        <div className="flex items-center gap-2">
          <ProcesarForm altaId={solicitud.id} />
          <RechazarForm altaId={solicitud.id} />
        </div>
      )}
      {solicitud.estado === "PROCESADA" && solicitud.perfil_id && (
        <Link
          href={`/admin/clientes/${solicitud.perfil_id}`}
          className="text-xs text-orange-400 hover:text-orange-300 transition-colors"
        >
          Ver cliente →
        </Link>
      )}
    </>
  );
}

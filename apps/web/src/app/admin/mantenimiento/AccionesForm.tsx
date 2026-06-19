"use client";

import { useContext, useTransition } from "react";
import { iniciarSolicitud, resolverSolicitud, reabrirSolicitud } from "./actions";
import { useToast } from "@/components/ui/Toast";
import { KanbanOptimisticContext } from "./kanban-context";

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24" aria-hidden>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

export function IniciarButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const aplicarOptimista = useContext(KanbanOptimisticContext);
  return (
    <button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          aplicarOptimista?.({ id, estado: "EN_PROCESO" });
          try {
            await iniciarSolicitud(id);
            toast({ title: "Solicitud en proceso" });
          } catch {
            toast({ variant: "error", title: "No se pudo actualizar la solicitud" });
          }
        })
      }
      className="inline-flex items-center gap-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg font-medium transition-colors min-h-[36px]"
    >
      {pending ? <Spinner /> : null}
      En proceso
    </button>
  );
}

export function ResolverButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const aplicarOptimista = useContext(KanbanOptimisticContext);
  return (
    <button
      disabled={pending}
      onClick={() => {
        const fd = new FormData();
        fd.set("id", id);
        startTransition(async () => {
          aplicarOptimista?.({ id, estado: "RESUELTA" });
          try {
            const res = await resolverSolicitud(null, fd);
            if (res && typeof res === "object" && "error" in res && res.error) {
              toast({ variant: "error", title: "No se pudo resolver", description: String(res.error) });
            } else {
              toast({ title: "Solicitud resuelta" });
            }
          } catch {
            toast({ variant: "error", title: "No se pudo resolver la solicitud" });
          }
        });
      }}
      className="inline-flex items-center gap-2 text-sm bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg font-medium transition-colors min-h-[36px]"
    >
      {pending ? <Spinner /> : null}
      Marcar resuelta
    </button>
  );
}

export function ReopenButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const aplicarOptimista = useContext(KanbanOptimisticContext);
  return (
    <button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          aplicarOptimista?.({ id, estado: "PENDIENTE" });
          try {
            await reabrirSolicitud(id);
            toast({ title: "Solicitud reabierta" });
          } catch {
            toast({ variant: "error", title: "No se pudo reabrir la solicitud" });
          }
        })
      }
      className="inline-flex items-center gap-2 text-sm bg-slate-600 hover:bg-slate-500 disabled:opacity-60 text-white px-4 py-2 rounded-lg font-medium transition-colors min-h-[36px]"
    >
      {pending ? <Spinner /> : null}
      Reabrir
    </button>
  );
}

"use client";

/**
 * Reordenamiento de los contactos de aviso de una cuenta (portal del cliente).
 *
 * Híbrido: drag real (dnd-kit, con sensores touch + teclado) + flechas ↑/↓ por fila
 * (fallback accesible y cómodo en celular). No modifica nada en SoftGuard (solo-lectura):
 * "Solicitar este orden" crea una `SolicitudCambioInfo` (campo "orden_avisos") que el admin
 * aplica a mano en la central.
 */

import { useMemo, useState, useActionState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ArrowUp, ArrowDown } from "lucide-react";
import { crearSolicitudReordenContactos } from "@/lib/actions/reorden-contactos";

interface Contacto {
  nombre: string;
  telefono: string | null;
  rol: string | null;
}
interface Item extends Contacto {
  id: string;
}

/** Enmascara el teléfono dejando solo los últimos 4 dígitos. */
function maskTel(t: string | null): string {
  const d = (t ?? "").replace(/\D/g, "");
  return d ? `•••• ${d.slice(-4)}` : "sin teléfono";
}

function FilaContacto({
  item,
  idx,
  total,
  onMover,
}: {
  item: Item;
  idx: number;
  total: number;
  onMover: (idx: number, dir: -1 | 1) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`portal-row flex items-center gap-3 px-3 py-2.5 ${isDragging ? "opacity-70 ring-1 ring-orange-500" : ""}`}
    >
      <button
        type="button"
        className="text-slate-500 hover:text-slate-300 cursor-grab touch-none active:cursor-grabbing"
        aria-label={`Arrastrar ${item.nombre || "contacto"}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-4 h-4" aria-hidden="true" />
      </button>

      <span className="w-5 shrink-0 text-center text-xs font-bold text-slate-500">{idx + 1}</span>

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-white truncate">{item.nombre || "Sin nombre"}</span>
        <span className="block text-[11px] text-slate-500 truncate">
          {maskTel(item.telefono)}
          {item.rol ? ` · ${item.rol}` : ""}
        </span>
      </span>

      <span className="flex shrink-0 flex-col">
        <button
          type="button"
          disabled={idx === 0}
          onClick={() => onMover(idx, -1)}
          aria-label={`Subir ${item.nombre || "contacto"}`}
          className="text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed p-0.5"
        >
          <ArrowUp className="w-4 h-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          disabled={idx === total - 1}
          onClick={() => onMover(idx, 1)}
          aria-label={`Bajar ${item.nombre || "contacto"}`}
          className="text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed p-0.5"
        >
          <ArrowDown className="w-4 h-4" aria-hidden="true" />
        </button>
      </span>
    </li>
  );
}

export function ReordenarContactos({
  cuentaId,
  contactos,
  tienePendiente,
}: {
  cuentaId: string;
  contactos: Contacto[];
  tienePendiente: boolean;
}) {
  const inicial = useMemo<Item[]>(() => contactos.map((c, i) => ({ ...c, id: String(i) })), [contactos]);
  const [items, setItems] = useState<Item[]>(inicial);
  const [state, action, pending] = useActionState(crearSolicitudReordenContactos, null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const cambio = items.some((it, i) => it.id !== inicial[i]?.id);

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setItems((prev) => {
      const from = prev.findIndex((p) => p.id === active.id);
      const to = prev.findIndex((p) => p.id === over.id);
      return from < 0 || to < 0 ? prev : arrayMove(prev, from, to);
    });
  }

  function mover(idx: number, dir: -1 | 1) {
    setItems((prev) => {
      const to = idx + dir;
      if (to < 0 || to >= prev.length) return prev;
      return arrayMove(prev, idx, to);
    });
  }

  if (tienePendiente) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-400 bg-amber-900/30 border border-amber-700/50 rounded-full px-3 py-1">
        <span aria-hidden="true">⏳</span> Pedido de reordenamiento pendiente de revisión
      </span>
    );
  }

  if (state?.ok) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-400 bg-green-900/30 border border-green-700/50 rounded-full px-3 py-1">
        <span aria-hidden="true">✓</span> Pedido enviado — te avisamos cuando lo apliquemos
      </span>
    );
  }

  return (
    <div className="space-y-3">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-2" aria-label="Contactos de aviso por prioridad">
            {items.map((it, idx) => (
              <FilaContacto key={it.id} item={it} idx={idx} total={items.length} onMover={mover} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      {state?.error && (
        <div role="alert" className="bg-red-900/40 border border-red-700 text-red-300 rounded-lg px-3 py-2 text-sm">
          {state.error}
        </div>
      )}

      <form action={action} className="flex items-center gap-3">
        <input type="hidden" name="cuenta_id" value={cuentaId} />
        <input
          type="hidden"
          name="orden"
          value={JSON.stringify(items.map(({ nombre, telefono, rol }) => ({ nombre, telefono, rol })))}
        />
        <button
          type="submit"
          disabled={!cambio || pending}
          className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 font-semibold rounded-lg px-4 py-2 min-h-[44px] text-sm transition-colors"
        >
          {pending ? "Enviando..." : "Solicitar este orden"}
        </button>
        {cambio && (
          <button
            type="button"
            onClick={() => setItems(inicial)}
            className="text-slate-400 hover:text-white px-2 py-2 rounded-lg text-sm min-h-[44px] transition-colors"
          >
            Deshacer
          </button>
        )}
      </form>
    </div>
  );
}

export default ReordenarContactos;

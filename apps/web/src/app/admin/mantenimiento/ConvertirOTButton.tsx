"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Modal } from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { crearOTDesdeSolicitud } from "@/lib/actions/ot";
import type { TipoOT, Prioridad } from "@/generated/prisma/client";

const TIPOS: { value: TipoOT; label: string }[] = [
  { value: "CORRECTIVO",  label: "Correctivo" },
  { value: "PREVENTIVO",  label: "Preventivo" },
  { value: "INSTALACION", label: "Instalación" },
  { value: "RETIRO",      label: "Retiro" },
];

const PRIORIDADES: { value: Prioridad; label: string }[] = [
  { value: "BAJA",  label: "Baja" },
  { value: "MEDIA", label: "Media" },
  { value: "ALTA",  label: "Alta" },
];

interface Props {
  solicitudId: string;
  cuentaNombre: string;
  descripcion: string;
  prioridad: Prioridad;
}

/** Botón "Convertir en OT" (RF Fase 2): abre un modal precargado con los
 * datos de la solicitud (cuenta, descripción, prioridad heredadas; tipo
 * CORRECTIVO por default) y crea la OT vinculada en un click. */
export function ConvertirOTButton({ solicitudId, cuentaNombre, descripcion, prioridad }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const tipo = fd.get("tipo") as TipoOT;
    const prioridadElegida = fd.get("prioridad") as Prioridad;
    const descripcionForm = (fd.get("descripcion") as string).trim();

    if (!descripcionForm) {
      setError("La descripción es obligatoria.");
      return;
    }

    startTransition(async () => {
      try {
        const ot = await crearOTDesdeSolicitud(solicitudId, {
          tipo,
          prioridad: prioridadElegida,
          descripcion: descripcionForm,
        });
        toast({ title: `OT #${ot.numero} creada`, description: "La solicitud pasó a en proceso." });
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 text-sm bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg font-medium transition-colors min-h-[36px]"
      >
        Convertir en OT
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        size="md"
        title="Convertir en orden de trabajo"
        description={`Cuenta: ${cuentaNombre}`}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="conv-tipo" className="block text-sm font-medium text-slate-300 mb-1">
                Tipo
              </label>
              <Select id="conv-tipo" name="tipo" defaultValue="CORRECTIVO">
                {TIPOS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </Select>
            </div>
            <div>
              <label htmlFor="conv-prioridad" className="block text-sm font-medium text-slate-300 mb-1">
                Prioridad
              </label>
              <Select id="conv-prioridad" name="prioridad" defaultValue={prioridad}>
                {PRIORIDADES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <label htmlFor="conv-descripcion" className="block text-sm font-medium text-slate-300 mb-1">
              Descripción
            </label>
            <Textarea id="conv-descripcion" name="descripcion" rows={3} defaultValue={descripcion} />
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-400 bg-red-400/10 rounded px-3 py-2">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <Button type="submit" isLoading={pending} loadingText="Creando…" className="sm:w-auto">
              Crear OT
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

/** Link "Ver OT #N" (RF Fase 2): reemplaza el botón cuando la solicitud ya
 * fue convertida — evita duplicar la OT y permite navegar directo. */
export function VerOTLink({ otId, numero }: { otId: string; numero: number }) {
  return (
    <Link
      href={`/admin/ot/${otId}`}
      className="inline-flex items-center gap-1.5 text-sm text-orange-400 hover:text-orange-300 font-medium transition-colors min-h-[36px] px-1"
    >
      Ver OT #{numero} →
    </Link>
  );
}

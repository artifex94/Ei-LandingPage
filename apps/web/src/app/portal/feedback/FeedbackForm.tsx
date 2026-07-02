"use client";

import { useActionState, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import {
  FEEDBACK_IMAGEN_TIPOS_VALIDOS,
  FEEDBACK_VIDEO_TIPOS_VALIDOS,
} from "@/lib/feedback-adjunto";
import { crearTicketFeedback } from "./actions";

const ACCEPT_ADJUNTO = [
  ...FEEDBACK_IMAGEN_TIPOS_VALIDOS,
  ...FEEDBACK_VIDEO_TIPOS_VALIDOS,
].join(",");

export function FeedbackForm() {
  const [state, action, pending] = useActionState(crearTicketFeedback, null);
  const formRef = useRef<HTMLFormElement>(null);
  const [nombreArchivo, setNombreArchivo] = useState<string | null>(null);

  if (state?.ok) {
    return (
      <div
        role="status"
        className="bg-emerald-950/40 border border-emerald-700/50 rounded-lg p-6 text-center"
      >
        <p className="text-2xl mb-2">✓</p>
        <p className="font-semibold text-emerald-300 text-lg">¡Gracias por tu reporte!</p>
        <p className="text-emerald-400 text-sm mt-2">
          Lo vamos a revisar y te avisamos acá cuando tengamos novedades.
        </p>
        {state.avisoAdjunto && (
          <p className="text-amber-400 text-xs mt-3">{state.avisoAdjunto}</p>
        )}
      </div>
    );
  }

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-5">
      {state?.error && (
        <div role="alert" className="bg-red-900/40 border border-red-700 text-red-300 rounded-md px-4 py-3 text-sm">
          {state.error}
        </div>
      )}

      <FormField label="¿Qué querés contarnos?" required>
        {(field) => (
          <Select {...field} name="tipo" required defaultValue="BUG">
            <option value="BUG">Reportar un problema</option>
            <option value="MEJORA">Sugerir una mejora</option>
          </Select>
        )}
      </FormField>

      <FormField
        label="Descripción"
        required
        hint="Contanos con el mayor detalle posible qué pasó o qué te gustaría que mejoremos."
      >
        {(field) => (
          <Textarea
            {...field}
            name="descripcion"
            required
            minLength={10}
            maxLength={2000}
            rows={5}
            placeholder="Ej: Cuando abro Mis pagos en el celular, el botón de descargar recibo no responde..."
          />
        )}
      </FormField>

      <FormField label="Prioridad" hint="¿Qué tan grave te resulta?">
        {(field) => (
          <Select {...field} name="prioridad" defaultValue="MEDIA">
            <option value="BAJA">Baja — Es solo una idea o algo menor</option>
            <option value="MEDIA">Media — Molesta pero no bloquea</option>
            <option value="ALTA">Alta — Me complica bastante</option>
            <option value="CRITICA">Crítica — No puedo usar el portal</option>
          </Select>
        )}
      </FormField>

      <FormField
        label="Adjuntar imagen o video (opcional)"
        hint="Imágenes hasta 10 MB, videos hasta 25 MB."
      >
        {(field) => (
          <input
            {...field}
            type="file"
            name="adjunto"
            accept={ACCEPT_ADJUNTO}
            onChange={(e) => setNombreArchivo(e.target.files?.[0]?.name ?? null)}
            className="w-full text-sm text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-slate-700 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-600 cursor-pointer"
          />
        )}
      </FormField>
      {nombreArchivo && (
        <p className="text-xs text-slate-400 -mt-3">Seleccionaste: {nombreArchivo}</p>
      )}

      <Button type="submit" isLoading={pending} loadingText="Enviando...">
        Enviar
      </Button>
    </form>
  );
}

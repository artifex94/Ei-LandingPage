"use client";

import { useActionState } from "react";
import Button from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import { crearSolicitud } from "./actions";

interface Props {
  cuentas: { id: string; descripcion: string }[];
  cuentaPreId?: string;
}

export function SolicitudForm({ cuentas, cuentaPreId }: Props) {
  const [state, action, pending] = useActionState(crearSolicitud, null);

  if (state?.ok) {
    return (
      <div
        role="status"
        className="bg-emerald-950/40 border border-emerald-700/50 rounded-lg p-6 text-center"
      >
        <p className="text-2xl mb-2">✓</p>
        <p className="font-semibold text-emerald-300 text-lg">Solicitud enviada</p>
        <p className="text-emerald-400 text-sm mt-2">
          Nos comunicamos con vos a la brevedad.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-5">
      {state?.error && (
        <div role="alert" className="bg-red-900/40 border border-red-700 text-red-300 rounded-md px-4 py-3 text-sm">
          {state.error}
        </div>
      )}

      <FormField label="Servicio con el problema" required>
        {(field) => (
          <Select
            {...field}
            name="cuenta_id"
            required
            defaultValue={cuentaPreId ?? ""}
          >
            <option value="" disabled>Seleccioná un servicio</option>
            {cuentas.map((c) => (
              <option key={c.id} value={c.id}>{c.descripcion}</option>
            ))}
          </Select>
        )}
      </FormField>

      <FormField label="Urgencia">
        {(field) => (
          <Select {...field} name="prioridad" defaultValue="MEDIA">
            <option value="BAJA">Baja — Puede esperar unos días</option>
            <option value="MEDIA">Media — Esta semana</option>
            <option value="ALTA">Alta — Lo antes posible</option>
          </Select>
        )}
      </FormField>

      <FormField
        label="Descripción del problema"
        required
        hint="Contanos qué está pasando con el mayor detalle posible."
      >
        {(field) => (
          <Textarea
            {...field}
            name="descripcion"
            required
            minLength={10}
            maxLength={1000}
            rows={5}
            placeholder="Ej: La alarma no responde cuando activo el teclado principal..."
          />
        )}
      </FormField>

      <Button type="submit" isLoading={pending} loadingText="Enviando...">
        Enviar solicitud
      </Button>
    </form>
  );
}

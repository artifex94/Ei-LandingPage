"use client";

import { useActionState } from "react";
import { actualizarEmpleado } from "@/app/admin/empleados/actions";
import type { RolEmpleado } from "@/generated/prisma/client";

interface Empleado {
  id: string;
  nombre: string;
  dni: string | null;
  telefono: string | null;
  email: string | null;
  activo: boolean;
  rol_empleado: RolEmpleado;
  puede_monitorear: boolean;
  puede_instalar: boolean;
  puede_facturar: boolean;
  color_calendario: string | null;
}

interface Props {
  empleado: Empleado;
  esEscobarAdmin?: boolean;
}

const inputCls =
  "w-full bg-slate-700 border border-slate-600 text-white placeholder:text-slate-400 rounded-lg px-3 py-2 text-sm focus:outline-2 focus:outline-orange-500";

const ROLES_EMPLEADO = [
  { value: "TECNICO",        label: "Técnico" },
  { value: "MONITOR",        label: "Monitor" },
  { value: "ADMINISTRATIVO", label: "Administrativo" },
  { value: "ADMIN_GENERAL",  label: "Administrador general" },
];

const CAPACIDADES = [
  { name: "puede_instalar",   label: "Servicio técnico (instalación / mantenimiento)" },
  { name: "puede_monitorear", label: "Monitoreo y central de alarmas" },
  { name: "puede_facturar",   label: "Finanzas y cobros" },
];

export function EditarEmpleadoForm({ empleado, esEscobarAdmin = false }: Props) {
  const [state, action, pending] = useActionState(actualizarEmpleado, {});
  const rolesVisibles = ROLES_EMPLEADO.filter((r) => r.value !== "ADMIN_GENERAL" || esEscobarAdmin);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="id" value={empleado.id} />

      {state.ok && (
        <p className="text-green-400 text-sm font-medium bg-green-900/30 border border-green-800 rounded-lg px-3 py-2">
          Datos actualizados correctamente.
        </p>
      )}
      {state.errores && (
        <div className="bg-amber-900/30 border border-amber-700/60 text-amber-200 rounded-lg p-3">
          <ul className="text-sm list-disc list-inside space-y-1">
            {state.errores.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}

      {/* ── Datos personales ── */}
      <fieldset className="space-y-4">
        <legend className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
          Datos personales
        </legend>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label htmlFor="emp-e-nombre" className="block text-sm font-medium text-slate-300 mb-1">
              Nombre completo <span aria-hidden="true">*</span>
            </label>
            <input
              id="emp-e-nombre" name="nombre" type="text" required
              defaultValue={empleado.nombre} className={inputCls}
            />
          </div>

          <div>
            <label htmlFor="emp-e-dni" className="block text-sm font-medium text-slate-300 mb-1">
              DNI <span className="text-slate-500 font-normal text-xs">(opcional)</span>
            </label>
            <input
              id="emp-e-dni" name="dni" type="text" inputMode="numeric"
              pattern="[0-9]{7,8}" placeholder="Sin puntos"
              defaultValue={empleado.dni ?? ""} className={inputCls}
            />
          </div>

          <div>
            <label htmlFor="emp-e-tel" className="block text-sm font-medium text-slate-300 mb-1">
              Teléfono <span className="text-slate-500 font-normal text-xs">(opcional)</span>
            </label>
            <input
              id="emp-e-tel" name="telefono" type="tel"
              placeholder="+5491112345678"
              defaultValue={empleado.telefono ?? ""} className={inputCls}
            />
          </div>

          {empleado.email && (
            <div className="sm:col-span-2">
              <p className="text-sm font-medium text-slate-300 mb-1">Email</p>
              <p className="text-sm text-slate-400 bg-slate-700/50 border border-slate-700 rounded-lg px-3 py-2">
                {empleado.email}
              </p>
              <p className="text-xs text-slate-500 mt-1">El email se modifica desde Supabase Auth.</p>
            </div>
          )}
        </div>
      </fieldset>

      {/* ── Rol y capacidades ── */}
      <fieldset className="space-y-4">
        <legend className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
          Rol y capacidades
        </legend>

        <div>
          <label htmlFor="emp-e-rol" className="block text-sm font-medium text-slate-300 mb-1">
            Rol
          </label>
          <select
            id="emp-e-rol" name="rol_empleado"
            defaultValue={empleado.rol_empleado}
            className={inputCls}
          >
            {rolesVisibles.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          <p className="text-xs text-slate-500 mt-1">
            Cambiar a Administrador otorgará acceso completo al panel admin.
          </p>
        </div>

        <div>
          <p className="text-sm font-medium text-slate-300 mb-2">Capacidades habilitadas</p>
          <div className="space-y-2">
            {CAPACIDADES.map((cap) => {
              const checked = empleado[cap.name as keyof typeof empleado] as boolean;
              return (
                <label key={cap.name} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    name={cap.name}
                    value="on"
                    defaultChecked={checked}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-orange-500 focus:ring-orange-500 focus:ring-offset-slate-800 cursor-pointer"
                  />
                  <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                    {cap.label}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      </fieldset>

      {/* ── Estado y visual ── */}
      <fieldset className="space-y-4">
        <legend className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
          Estado y visual
        </legend>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="emp-e-activo" className="block text-sm font-medium text-slate-300 mb-1">
              Estado
            </label>
            <select
              id="emp-e-activo" name="activo"
              defaultValue={empleado.activo ? "true" : "false"}
              className={inputCls}
            >
              <option value="true">Activo</option>
              <option value="false">Inactivo</option>
            </select>
          </div>

          <div>
            <label htmlFor="emp-e-color" className="block text-sm font-medium text-slate-300 mb-1">
              Color en calendario
            </label>
            <input
              id="emp-e-color" name="color_calendario" type="color"
              defaultValue={empleado.color_calendario ?? "#6366f1"}
              className="h-9 w-full rounded-lg border border-slate-600 bg-slate-700 cursor-pointer p-1"
            />
          </div>
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={pending}
        className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
      >
        {pending ? "Guardando…" : "Guardar cambios"}
      </button>
    </form>
  );
}

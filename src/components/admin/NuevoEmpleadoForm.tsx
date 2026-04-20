"use client";

import { useActionState } from "react";
import { crearEmpleado } from "@/app/admin/empleados/actions";

const inputCls =
  "w-full bg-slate-700 border border-slate-600 text-white placeholder:text-slate-400 rounded-lg px-3 py-2 text-sm focus:outline-2 focus:outline-orange-500";

const ROLES_EMPLEADO = [
  { value: "TECNICO",        label: "Técnico",        hint: "Instalación y mantenimiento en campo" },
  { value: "MONITOR",        label: "Monitor",         hint: "Operación de central de monitoreo" },
  { value: "ADMINISTRATIVO", label: "Administrativo",  hint: "Gestión de pagos y clientes" },
  { value: "ADMIN_GENERAL",  label: "Administrador",   hint: "Acceso completo al panel admin" },
];

const CAPACIDADES = [
  { name: "puede_instalar",   label: "Servicio técnico (instalación / mantenimiento)" },
  { name: "puede_monitorear", label: "Monitoreo y central de alarmas" },
  { name: "puede_facturar",   label: "Finanzas y cobros" },
];

// Capacidades sugeridas por rol (pre-tickea pero el admin puede cambiar)
const DEFAULTS: Record<string, string[]> = {
  TECNICO:        ["puede_instalar"],
  MONITOR:        ["puede_monitorear"],
  ADMINISTRATIVO: ["puede_facturar"],
  ADMIN_GENERAL:  ["puede_instalar", "puede_monitorear", "puede_facturar"],
};

export function NuevoEmpleadoForm() {
  const [state, action, pending] = useActionState(crearEmpleado, {});

  return (
    <form action={action} className="space-y-5">
      {state.errores && (
        <div className="bg-red-900/40 border border-red-700 rounded-lg p-3">
          <ul className="text-sm text-red-300 list-disc list-inside space-y-1">
            {state.errores.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}

      {/* ── Datos personales ── */}
      <fieldset className="space-y-4">
        <legend className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
          Datos personales
        </legend>

        <div>
          <label htmlFor="emp-nombre" className="block text-sm font-medium text-slate-300 mb-1">
            Nombre completo <span aria-hidden="true">*</span>
          </label>
          <input id="emp-nombre" name="nombre" type="text" required autoComplete="name" className={inputCls} />
        </div>

        <div>
          <label htmlFor="emp-email" className="block text-sm font-medium text-slate-300 mb-1">
            Email <span aria-hidden="true">*</span>
          </label>
          <input id="emp-email" name="email" type="email" required autoComplete="email" className={inputCls} />
          <p className="text-xs text-slate-500 mt-1">Se usará para iniciar sesión. Se envía enlace de confirmación.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="emp-dni" className="block text-sm font-medium text-slate-300 mb-1">
              DNI <span className="text-slate-500 font-normal text-xs">(opcional)</span>
            </label>
            <input
              id="emp-dni" name="dni" type="text" inputMode="numeric"
              pattern="[0-9]{7,8}" placeholder="Sin puntos" className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="emp-tel" className="block text-sm font-medium text-slate-300 mb-1">
              Teléfono <span className="text-slate-500 font-normal text-xs">(opcional)</span>
            </label>
            <input
              id="emp-tel" name="telefono" type="tel"
              placeholder="+5491112345678" autoComplete="tel" className={inputCls}
            />
          </div>
        </div>
      </fieldset>

      {/* ── Rol y capacidades ── */}
      <fieldset className="space-y-4">
        <legend className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
          Rol y capacidades
        </legend>

        <div>
          <label htmlFor="emp-rol" className="block text-sm font-medium text-slate-300 mb-1">
            Rol <span aria-hidden="true">*</span>
          </label>
          <select id="emp-rol" name="rol_empleado" required className={inputCls}>
            <option value="">Seleccioná un rol…</option>
            {ROLES_EMPLEADO.map((r) => (
              <option key={r.value} value={r.value}>{r.label} — {r.hint}</option>
            ))}
          </select>
        </div>

        <div>
          <p className="text-sm font-medium text-slate-300 mb-2">Capacidades habilitadas</p>
          <div className="space-y-2">
            {CAPACIDADES.map((cap) => (
              <label key={cap.name} className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  name={cap.name}
                  value="on"
                  className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-orange-500 focus:ring-orange-500 focus:ring-offset-slate-800 cursor-pointer"
                />
                <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                  {cap.label}
                </span>
              </label>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Podés ajustar las capacidades independientemente del rol.
          </p>
        </div>
      </fieldset>

      {/* ── Opciones visuales ── */}
      <fieldset className="space-y-3">
        <legend className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
          Opciones visuales
        </legend>
        <div className="flex items-center gap-3">
          <div>
            <label htmlFor="emp-color" className="block text-sm font-medium text-slate-300 mb-1">
              Color en calendario
            </label>
            <input
              id="emp-color" name="color_calendario" type="color"
              defaultValue="#6366f1"
              className="h-9 w-16 rounded-lg border border-slate-600 bg-slate-700 cursor-pointer p-1"
            />
          </div>
          <p className="text-xs text-slate-500 mt-4">
            Identifica al empleado en vistas de agenda compartida.
          </p>
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors"
      >
        {pending ? "Creando empleado…" : "Crear empleado"}
      </button>
    </form>
  );
}

"use client";

import { useState, useActionState, useTransition } from "react";
import {
  actualizarSensor,
  crearSensor,
  eliminarSensor,
} from "@/app/admin/cuentas/actions";
import type { TipoSensor, EstadoBateria } from "@/generated/prisma/client";

interface SensorData {
  id: string;
  codigo_zona: string;
  etiqueta: string;
  tipo: TipoSensor;
  activa: boolean;
  bateria: EstadoBateria | null;
}

interface Props {
  sensores: SensorData[];
  cuentaId: string;
}

const inputCls =
  "bg-slate-700 border border-slate-600 text-white rounded-lg px-2 py-1 text-sm focus:outline-2 focus:outline-orange-500";

const TIPOS_SENSOR: { value: TipoSensor; label: string }[] = [
  { value: "SENSOR_PIR", label: "Movimiento PIR" },
  { value: "CONTACTO_MAGNETICO", label: "Contacto magnético" },
  { value: "CAMARA_IP", label: "Cámara IP" },
  { value: "TECLADO_CONTROL", label: "Teclado" },
  { value: "DETECTOR_HUMO", label: "Detector de humo" },
  { value: "MODULO_DOMOTICA", label: "Módulo domótica" },
  { value: "PANICO", label: "Botón de pánico" },
];

const BATERIAS: { value: EstadoBateria | ""; label: string }[] = [
  { value: "", label: "—" },
  { value: "OPTIMA", label: "Óptima" },
  { value: "ADVERTENCIA", label: "Baja" },
  { value: "CRITICA", label: "Crítica" },
];

const BATERIA_COLOR: Record<EstadoBateria, string> = {
  OPTIMA: "text-green-400",
  ADVERTENCIA: "text-amber-400",
  CRITICA: "text-red-400",
};

// ── Fila de sensor editable ───────────────────────────────────────────────────
function FilaSensor({ sensor }: { sensor: SensorData }) {
  const [editando, setEditando] = useState(false);
  const [confirmarBorrar, setConfirmarBorrar] = useState(false);
  const [state, action, pending] = useActionState(actualizarSensor, {});
  const [deleting, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState("");

  function handleEliminar() {
    setDeleteError("");
    startDelete(async () => {
      const res = await eliminarSensor(sensor.id);
      if (res.errores) setDeleteError(res.errores[0]);
    });
  }

  if (editando) {
    return (
      <tr className="bg-slate-700/30">
        <td className="px-4 py-3" colSpan={6}>
          <form action={action} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="id" value={sensor.id} />
            <input type="hidden" name="activa" value={sensor.activa ? "true" : "false"} />

            <div>
              <label className="block text-xs text-slate-400 mb-1">Etiqueta</label>
              <input
                name="etiqueta"
                defaultValue={sensor.etiqueta}
                required
                className={`${inputCls} w-48`}
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Tipo</label>
              <select name="tipo" defaultValue={sensor.tipo} className={`${inputCls} w-44`}>
                {TIPOS_SENSOR.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Batería</label>
              <select name="bateria" defaultValue={sensor.bateria ?? ""} className={`${inputCls} w-32`}>
                {BATERIAS.map((b) => (
                  <option key={b.value} value={b.value}>{b.label}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 mt-auto">
              <button
                type="submit"
                disabled={pending}
                className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-semibold"
              >
                {pending ? "Guardando…" : "Guardar"}
              </button>
              <button
                type="button"
                onClick={() => setEditando(false)}
                className="text-slate-400 hover:text-white px-3 py-1.5 text-xs"
              >
                Cancelar
              </button>
            </div>

            {state.ok && (
              <span className="text-green-400 text-xs self-center">¡Guardado!</span>
            )}
            {state.errores && (
              <span className="text-amber-400 text-xs self-center">{state.errores[0]}</span>
            )}
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr className="hover:bg-slate-700/40 transition-colors">
      <td className="px-4 py-2 text-slate-400 font-mono text-xs">{sensor.codigo_zona}</td>
      <td className="px-4 py-2 font-medium text-white">{sensor.etiqueta}</td>
      <td className="px-4 py-2 text-slate-300 text-sm">
        {TIPOS_SENSOR.find((t) => t.value === sensor.tipo)?.label ?? sensor.tipo}
      </td>
      <td className="px-4 py-2 text-sm">
        {sensor.bateria ? (
          <span className={BATERIA_COLOR[sensor.bateria]}>
            {BATERIAS.find((b) => b.value === sensor.bateria)?.label}
          </span>
        ) : (
          <span className="text-slate-600">—</span>
        )}
      </td>
      <td className="px-4 py-2">
        <ToggleActivaButton sensor={sensor} />
      </td>
      <td className="px-4 py-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="text-xs text-slate-400 hover:text-white transition-colors underline underline-offset-2"
          >
            Editar
          </button>
          {confirmarBorrar ? (
            <span className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleEliminar}
                disabled={deleting}
                className="text-xs text-red-400 hover:text-red-300 font-semibold disabled:opacity-50"
              >
                {deleting ? "Borrando…" : "Confirmar"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmarBorrar(false)}
                className="text-xs text-slate-500 hover:text-slate-300"
              >
                No
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmarBorrar(true)}
              className="text-xs text-slate-600 hover:text-red-400 transition-colors"
            >
              Eliminar
            </button>
          )}
          {deleteError && (
            <span className="text-xs text-amber-400">{deleteError}</span>
          )}
        </div>
      </td>
    </tr>
  );
}

// ── Toggle activo/inactivo ────────────────────────────────────────────────────
function ToggleActivaButton({ sensor }: { sensor: SensorData }) {
  const [isPending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", sensor.id);
      fd.set("etiqueta", sensor.etiqueta);
      fd.set("tipo", sensor.tipo);
      fd.set("activa", sensor.activa ? "false" : "true");
      fd.set("bateria", sensor.bateria ?? "");
      await actualizarSensor({}, fd);
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isPending}
      className={`text-xs font-semibold px-2 py-0.5 rounded-full transition-colors disabled:opacity-50 ${
        sensor.activa
          ? "bg-green-900/40 text-green-400 hover:bg-green-900/60"
          : "bg-slate-700 text-slate-400 hover:bg-slate-600"
      }`}
    >
      {isPending ? "…" : sensor.activa ? "Activo" : "Inactivo"}
    </button>
  );
}

// ── Formulario para nuevo sensor ──────────────────────────────────────────────
function NuevoSensorForm({ cuentaId }: { cuentaId: string }) {
  const [abierto, setAbierto] = useState(false);
  const [state, action, pending] = useActionState(crearSensor, {});

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="text-sm text-orange-400 hover:text-orange-300 transition-colors"
      >
        + Agregar sensor
      </button>
    );
  }

  return (
    <div className="mt-4 bg-slate-700/30 rounded-xl p-4 border border-slate-600">
      <p className="text-sm font-semibold text-white mb-3">Nuevo sensor</p>
      <form action={action} className="flex flex-wrap gap-3 items-end">
        <input type="hidden" name="cuenta_id" value={cuentaId} />

        <div>
          <label className="block text-xs text-slate-400 mb-1">Código de zona</label>
          <input
            name="codigo_zona"
            placeholder="Ej: Z01"
            required
            className={`${inputCls} w-24`}
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Etiqueta</label>
          <input
            name="etiqueta"
            placeholder="Ej: Puerta garage"
            required
            className={`${inputCls} w-48`}
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Tipo</label>
          <select name="tipo" className={`${inputCls} w-44`}>
            {TIPOS_SENSOR.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Batería</label>
          <select name="bateria" defaultValue="" className={`${inputCls} w-32`}>
            {BATERIAS.map((b) => (
              <option key={b.value} value={b.value}>{b.label}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 mt-auto">
          <button
            type="submit"
            disabled={pending}
            className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-semibold"
          >
            {pending ? "Agregando…" : "Agregar"}
          </button>
          <button
            type="button"
            onClick={() => setAbierto(false)}
            className="text-slate-400 hover:text-white px-3 py-1.5 text-xs"
          >
            Cancelar
          </button>
        </div>

        {state.ok && (
          <span className="text-green-400 text-xs self-center">¡Sensor agregado!</span>
        )}
        {state.errores && (
          <span className="text-amber-400 text-xs self-center">{state.errores[0]}</span>
        )}
      </form>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export function GestionSensores({ sensores, cuentaId }: Props) {
  return (
    <div className="space-y-4">
      {sensores.length === 0 ? (
        <p className="text-slate-400 text-sm">Sin sensores registrados.</p>
      ) : (
        <>
          {/* ── Desktop ─────────────────────────────────────────────────────── */}
          <div className="hidden md:block bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/50 border-b border-slate-700">
                <tr>
                  <th className="text-left px-4 py-2 font-semibold text-slate-300">Zona</th>
                  <th className="text-left px-4 py-2 font-semibold text-slate-300">Etiqueta</th>
                  <th className="text-left px-4 py-2 font-semibold text-slate-300">Tipo</th>
                  <th className="text-left px-4 py-2 font-semibold text-slate-300">Batería</th>
                  <th className="text-left px-4 py-2 font-semibold text-slate-300">Estado</th>
                  <th className="text-left px-4 py-2 font-semibold text-slate-300">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {sensores.map((s) => (
                  <FilaSensor key={s.id} sensor={s} />
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Mobile ──────────────────────────────────────────────────────── */}
          <div className="md:hidden space-y-2">
            {sensores.map((s) => (
              <MobileSensorCard key={s.id} sensor={s} />
            ))}
          </div>
        </>
      )}

      <NuevoSensorForm cuentaId={cuentaId} />
    </div>
  );
}

// ── Card mobile para sensor ───────────────────────────────────────────────────
function MobileSensorCard({ sensor }: { sensor: SensorData }) {
  const [editando, setEditando] = useState(false);
  const [confirmarBorrar, setConfirmarBorrar] = useState(false);
  const [state, action, pending] = useActionState(actualizarSensor, {});
  const [deleting, startDelete] = useTransition();

  function handleEliminar() {
    startDelete(async () => {
      await eliminarSensor(sensor.id);
    });
  }

  if (editando) {
    return (
      <div className="bg-slate-800 border border-orange-700/40 rounded-xl p-4">
        <form action={action} className="space-y-3">
          <input type="hidden" name="id" value={sensor.id} />
          <input type="hidden" name="activa" value={sensor.activa ? "true" : "false"} />

          <div>
            <label className="block text-xs text-slate-400 mb-1">Etiqueta</label>
            <input name="etiqueta" defaultValue={sensor.etiqueta} required className={`${inputCls} w-full`} />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Tipo</label>
            <select name="tipo" defaultValue={sensor.tipo} className={`${inputCls} w-full`}>
              {TIPOS_SENSOR.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Batería</label>
            <select name="bateria" defaultValue={sensor.bateria ?? ""} className={`${inputCls} w-full`}>
              {BATERIAS.map((b) => (
                <option key={b.value} value={b.value}>{b.label}</option>
              ))}
            </select>
          </div>

          {state.errores && (
            <p className="text-amber-400 text-xs">{state.errores[0]}</p>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-xs font-semibold flex-1"
            >
              {pending ? "Guardando…" : "Guardar"}
            </button>
            <button
              type="button"
              onClick={() => setEditando(false)}
              className="text-slate-400 hover:text-white px-4 py-2 text-xs"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-white">{sensor.etiqueta}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {TIPOS_SENSOR.find((t) => t.value === sensor.tipo)?.label} ·{" "}
            <span className="font-mono">{sensor.codigo_zona}</span>
          </p>
          {sensor.bateria && (
            <p className={`text-xs mt-0.5 ${BATERIA_COLOR[sensor.bateria]}`}>
              Batería: {BATERIAS.find((b) => b.value === sensor.bateria)?.label}
            </p>
          )}
        </div>
        <ToggleActivaButton sensor={sensor} />
      </div>
      <div className="flex gap-3 mt-3 pt-3 border-t border-slate-700">
        <button
          onClick={() => setEditando(true)}
          className="text-xs text-slate-400 hover:text-white underline underline-offset-2"
        >
          Editar
        </button>
        {confirmarBorrar ? (
          <>
            <button
              onClick={handleEliminar}
              disabled={deleting}
              className="text-xs text-red-400 font-semibold"
            >
              {deleting ? "Borrando…" : "Confirmar borrado"}
            </button>
            <button
              onClick={() => setConfirmarBorrar(false)}
              className="text-xs text-slate-500"
            >
              Cancelar
            </button>
          </>
        ) : (
          <button
            onClick={() => setConfirmarBorrar(true)}
            className="text-xs text-slate-600 hover:text-red-400"
          >
            Eliminar
          </button>
        )}
      </div>
    </div>
  );
}

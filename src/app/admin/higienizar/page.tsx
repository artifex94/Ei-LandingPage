"use client";

import { useState, useRef } from "react";
import {
  analizarXLS,
  aplicarCorreccionesSeleccionadas,
  type Correccion,
  type EstadisticasHigiene,
  type ResultadoAplicacion,
} from "./actions";

type Estado = "upload" | "revision" | "resultado";

const CAMPO_LABEL: Record<string, string> = {
  nombre: "Nombre",
  telefono: "Teléfono",
  provincia: "Provincia",
  localidad: "Localidad",
  calle: "Calle",
  codigo_postal: "Código postal",
  tipo_titular: "Tipo de titular",
  zona_geografica: "GPS / Ubicación",
};

const CONFIANZA_ESTILOS: Record<string, string> = {
  ALTA: "bg-green-900/40 text-green-400",
  MEDIA: "bg-amber-900/40 text-amber-400",
  BAJA: "bg-red-900/40 text-red-400",
};

export default function HigienizarPage() {
  const [estado, setEstado] = useState<Estado>("upload");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [correcciones, setCorrecciones] = useState<Correccion[]>([]);
  const [seleccionadas, setSeleccionadas] = useState<Set<number>>(new Set());
  const [estadisticas, setEstadisticas] = useState<EstadisticasHigiene | null>(null);
  const [filtroConfianza, setFiltroConfianza] = useState<string>("TODAS");
  const [filtroCampo, setFiltroCampo] = useState<string>("TODOS");

  const [resultado, setResultado] = useState<ResultadoAplicacion | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  // ── Upload y análisis ──────────────────────────────────────────────────────

  async function handleAnalizar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) { setError("Seleccioná un archivo XLS."); return; }

    setCargando(true);
    setError(null);

    const formData = new FormData();
    formData.append("archivo", file);

    const res = await analizarXLS(formData);
    setCargando(false);

    if (res.error) { setError(res.error); return; }

    setCorrecciones(res.correcciones);
    setEstadisticas(res.estadisticas);
    // Preseleccionar todas las de confianza ALTA
    const presel = new Set(
      res.correcciones
        .map((_, i) => i)
        .filter((i) => res.correcciones[i].confianza === "ALTA")
    );
    setSeleccionadas(presel);
    setEstado("revision");
  }

  // ── Aplicar seleccionadas ──────────────────────────────────────────────────

  async function handleAplicar() {
    const lista = correcciones.filter((_, i) => seleccionadas.has(i));
    if (lista.length === 0) { setError("No hay correcciones seleccionadas."); return; }

    setCargando(true);
    setError(null);
    const res = await aplicarCorreccionesSeleccionadas(lista);
    setCargando(false);
    setResultado(res);
    setEstado("resultado");
  }

  // ── Filtrado ───────────────────────────────────────────────────────────────

  const correccionesFiltradas = correcciones.filter((c, _i) => {
    if (filtroConfianza !== "TODAS" && c.confianza !== filtroConfianza) return false;
    if (filtroCampo !== "TODOS" && c.campo !== filtroCampo) return false;
    return true;
  });

  const camposUnicos = Array.from(new Set(correcciones.map((c) => c.campo)));

  function toggleAll() {
    const idxFiltrados = correccionesFiltradas.map((c) =>
      correcciones.indexOf(c)
    );
    const todosSeleccionados = idxFiltrados.every((i) => seleccionadas.has(i));
    if (todosSeleccionados) {
      const next = new Set(seleccionadas);
      idxFiltrados.forEach((i) => next.delete(i));
      setSeleccionadas(next);
    } else {
      const next = new Set(seleccionadas);
      idxFiltrados.forEach((i) => next.add(i));
      setSeleccionadas(next);
    }
  }

  function toggleCorreccion(globalIdx: number) {
    const next = new Set(seleccionadas);
    if (next.has(globalIdx)) next.delete(globalIdx);
    else next.add(globalIdx);
    setSeleccionadas(next);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Higienizar base de datos</h1>
        <p className="text-slate-400 text-sm mt-1">
          Subí el archivo XLS exportado de Softguard para detectar y corregir inconsistencias en los datos.
        </p>
      </div>

      {/* ── Estado 1: Upload ──────────────────────────────────────────────── */}
      {estado === "upload" && (
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8 max-w-xl">
          <form onSubmit={handleAnalizar} className="space-y-5">
            <div>
              <label
                htmlFor="archivo-xls"
                className="block text-sm font-medium text-slate-300 mb-2"
              >
                Archivo XLS — Reporte de Cuentas (Softguard)
              </label>
              <input
                id="archivo-xls"
                ref={fileRef}
                type="file"
                accept=".xls,.xlsx"
                required
                className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-orange-500 file:text-white hover:file:bg-orange-600 file:cursor-pointer cursor-pointer"
              />
              <p className="text-xs text-slate-500 mt-2">
                El archivo &quot;Reporte Cuentas&quot; que se exporta desde Softguard.
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="bg-red-900/40 border border-red-700 text-red-300 rounded-lg px-4 py-3 text-sm"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={cargando}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold rounded-lg px-4 py-3 min-h-[48px] transition-colors"
            >
              {cargando ? "Analizando..." : "Analizar archivo"}
            </button>
          </form>
        </div>
      )}

      {/* ── Estado 2: Revisión ────────────────────────────────────────────── */}
      {estado === "revision" && estadisticas && (
        <div className="space-y-6">
          {/* Resumen estadísticas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Cuentas analizadas", valor: estadisticas.total },
              { label: "Correcciones propuestas", valor: correcciones.length },
              { label: "Seleccionadas", valor: seleccionadas.size },
              { label: "Sin email", valor: estadisticas.sin_email },
            ].map((item) => (
              <div key={item.label} className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-white">{item.valor}</p>
                <p className="text-xs text-slate-400 mt-1">{item.label}</p>
              </div>
            ))}
          </div>

          {estadisticas.excluidos.length > 0 && (
            <p className="text-sm text-slate-500">
              Cuentas excluidas (sistema): {estadisticas.excluidos.join(", ")}
            </p>
          )}

          {estadisticas.sin_email > 0 && (
            <div className="bg-slate-800 border border-amber-800/40 rounded-xl px-4 py-3 text-sm text-amber-400">
              {estadisticas.sin_email} cuenta{estadisticas.sin_email !== 1 ? "s" : ""} sin email registrado. No se puede corregir automáticamente — contactar a los clientes para obtenerlo.
            </div>
          )}

          {/* Filtros */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400">Confianza:</label>
              <select
                value={filtroConfianza}
                onChange={(e) => setFiltroConfianza(e.target.value)}
                className="bg-slate-700 border border-slate-600 text-white text-xs rounded px-2 py-1 focus:outline-2 focus:outline-orange-500"
              >
                <option value="TODAS">Todas</option>
                <option value="ALTA">Solo ALTA</option>
                <option value="MEDIA">Solo MEDIA</option>
                <option value="BAJA">Solo BAJA</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400">Campo:</label>
              <select
                value={filtroCampo}
                onChange={(e) => setFiltroCampo(e.target.value)}
                className="bg-slate-700 border border-slate-600 text-white text-xs rounded px-2 py-1 focus:outline-2 focus:outline-orange-500"
              >
                <option value="TODOS">Todos</option>
                {camposUnicos.map((c) => (
                  <option key={c} value={c}>{CAMPO_LABEL[c] ?? c}</option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={toggleAll}
              className="text-xs text-orange-400 hover:text-orange-300 hover:underline transition-colors"
            >
              Alternar selección ({correccionesFiltradas.length} visibles)
            </button>
            <button
              type="button"
              onClick={() => {
                const next = new Set(
                  correcciones
                    .map((c, i) => ({ c, i }))
                    .filter(({ c }) => c.confianza === "ALTA")
                    .map(({ i }) => i)
                );
                setSeleccionadas(next);
              }}
              className="text-xs text-green-400 hover:text-green-300 hover:underline transition-colors"
            >
              Seleccionar solo ALTA
            </button>
          </div>

          {/* Tabla de correcciones */}
          {correccionesFiltradas.length === 0 ? (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center text-slate-400">
              No hay correcciones con el filtro seleccionado.
            </div>
          ) : (
            <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead className="bg-slate-900/60 border-b border-slate-700">
                  <tr>
                    <th className="px-3 py-3 w-8">
                      <span className="sr-only">Seleccionar</span>
                    </th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400">Cuenta</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400">Campo</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400">Actual</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400">Propuesto</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400">Confianza</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-slate-400 hidden lg:table-cell">Razón</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {correccionesFiltradas.map((c) => {
                    const globalIdx = correcciones.indexOf(c);
                    const sel = seleccionadas.has(globalIdx);
                    return (
                      <tr
                        key={globalIdx}
                        className={`transition-colors cursor-pointer ${
                          sel ? "bg-orange-900/10" : "hover:bg-slate-700/30"
                        } ${c.confianza === "BAJA" ? "border-l-2 border-l-amber-500" : ""}`}
                        onClick={() => toggleCorreccion(globalIdx)}
                      >
                        <td className="px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={sel}
                            onChange={() => toggleCorreccion(globalIdx)}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded border-slate-600 bg-slate-700 text-orange-500 focus:ring-orange-500"
                            aria-label={`Seleccionar corrección de ${c.campo} para ${c.softguard_ref}`}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <p className="font-medium text-white text-xs">{c.softguard_ref}</p>
                          <p className="text-slate-500 text-xs truncate max-w-[120px]">{c.nombre_cuenta}</p>
                        </td>
                        <td className="px-3 py-2 text-slate-300 text-xs">{CAMPO_LABEL[c.campo] ?? c.campo}</td>
                        <td className="px-3 py-2 text-slate-400 text-xs truncate max-w-[130px]">
                          {c.valor_actual ?? <span className="italic">—</span>}
                        </td>
                        <td className="px-3 py-2 font-medium text-white text-xs truncate max-w-[130px]">
                          {c.valor_propuesto || <span className="italic text-slate-500">NULL</span>}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${CONFIANZA_ESTILOS[c.confianza]}`}>
                            {c.confianza}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-500 text-xs hidden lg:table-cell">{c.razon}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {error && (
            <div role="alert" className="bg-red-900/40 border border-red-700 text-red-300 rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          {/* Acciones */}
          <div className="flex flex-wrap gap-3 pt-2 border-t border-slate-700">
            <button
              type="button"
              onClick={handleAplicar}
              disabled={cargando || seleccionadas.size === 0}
              className="bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold rounded-lg px-6 py-3 min-h-[48px] transition-colors"
            >
              {cargando
                ? "Aplicando..."
                : `Aplicar ${seleccionadas.size} corrección${seleccionadas.size !== 1 ? "es" : ""} seleccionada${seleccionadas.size !== 1 ? "s" : ""}`}
            </button>
            <button
              type="button"
              onClick={() => { setEstado("upload"); setError(null); }}
              className="text-slate-400 hover:text-white border border-slate-700 rounded-lg px-6 py-3 min-h-[48px] transition-colors"
            >
              Volver a cargar otro archivo
            </button>
          </div>
        </div>
      )}

      {/* ── Estado 3: Resultado ───────────────────────────────────────────── */}
      {estado === "resultado" && resultado && (
        <div className="space-y-6">
          <div
            className={`rounded-2xl border p-8 text-center ${
              resultado.errores.length === 0
                ? "bg-green-900/20 border-green-700"
                : "bg-amber-900/20 border-amber-700"
            }`}
          >
            <p className="text-4xl mb-3">{resultado.errores.length === 0 ? "✓" : "⚠"}</p>
            <p className="text-xl font-bold text-white mb-1">
              {resultado.aplicadas} corrección{resultado.aplicadas !== 1 ? "es" : ""} aplicada{resultado.aplicadas !== 1 ? "s" : ""}
            </p>
            {resultado.errores.length > 0 && (
              <p className="text-amber-400 text-sm">
                {resultado.errores.length} error{resultado.errores.length !== 1 ? "es" : ""}
              </p>
            )}
          </div>

          {resultado.errores.length > 0 && (
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              <p className="text-sm font-semibold text-white px-5 py-3 border-b border-slate-700">
                Errores al aplicar
              </p>
              <ul className="divide-y divide-slate-700/50">
                {resultado.errores.map((err, i) => (
                  <li key={i} className="px-5 py-3 text-sm">
                    <span className="font-mono text-slate-400 text-xs">{err.softguard_ref}</span>
                    {" · "}
                    <span className="text-slate-300">{CAMPO_LABEL[err.campo] ?? err.campo}</span>
                    {" — "}
                    <span className="text-red-400">{err.error}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-3">
            <a
              href="/admin/clientes"
              className="inline-block bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg px-6 py-3 min-h-[48px] transition-colors"
            >
              Ver clientes
            </a>
            <button
              type="button"
              onClick={() => {
                setEstado("upload");
                setCorrecciones([]);
                setSeleccionadas(new Set());
                setEstadisticas(null);
                setResultado(null);
                setError(null);
              }}
              className="text-slate-400 hover:text-white border border-slate-700 rounded-lg px-6 py-3 min-h-[48px] transition-colors"
            >
              Analizar otro archivo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

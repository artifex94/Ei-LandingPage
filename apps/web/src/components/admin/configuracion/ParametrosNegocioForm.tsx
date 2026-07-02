"use client";

import { useState, useTransition } from "react";
import { actualizarParametro } from "@/lib/actions/configuracion";

export interface ParametroDisplay {
  clave: string;
  tipo: "INT" | "DECIMAL" | "STRING" | "JSON";
  categoria: string;
  descripcion: string;
  defaultValor: string;
  valorActual: string;
  esDefault: boolean;
  updatedPor: string | null;
  updatedAt: string | null;
}

const CATEGORIA_LABELS: Record<string, string> = {
  cobranza:  "Cobranza",
  turnos:    "Turnos",
  monitoreo: "Monitoreo",
  fiscal:    "Fiscal",
};

function agruparPorCategoria(parametros: ParametroDisplay[]): [string, ParametroDisplay[]][] {
  const grupos = new Map<string, ParametroDisplay[]>();
  for (const p of parametros) {
    if (!grupos.has(p.categoria)) grupos.set(p.categoria, []);
    grupos.get(p.categoria)!.push(p);
  }
  return Array.from(grupos.entries());
}

export function ParametrosNegocioForm({ parametros }: { parametros: ParametroDisplay[] }) {
  const grupos = agruparPorCategoria(parametros);

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-800/50 p-5 space-y-5">
      <div>
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">Parámetros de negocio</h2>
        <p className="text-xs text-slate-400 mt-1">
          Editables sin deploy. Si nunca se editaron, rige el valor <strong>Default</strong>.
        </p>
      </div>

      {grupos.map(([categoria, items]) => (
        <div key={categoria} className="space-y-3">
          <h3 className="text-xs font-semibold text-orange-400 uppercase tracking-wider">
            {CATEGORIA_LABELS[categoria] ?? categoria}
          </h3>
          <div className="space-y-3">
            {items.map((p) => (
              <ParametroRow key={p.clave} parametro={p} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

function ParametroRow({ parametro }: { parametro: ParametroDisplay }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  function handleSubmit(fd: FormData) {
    setOk(false);
    setError(null);
    startTransition(async () => {
      const res = await actualizarParametro(fd);
      if (res?.error) { setError(res.error); return; }
      setOk(true);
    });
  }

  const inputId = `parametro-${parametro.clave}`;

  return (
    <form action={handleSubmit} className="rounded-lg border border-slate-700 bg-slate-900/40 p-4 space-y-2.5">
      <input type="hidden" name="clave" value={parametro.clave} />

      <div className="flex items-center justify-between gap-3">
        <label htmlFor={inputId} className="text-sm font-semibold text-white">
          {parametro.clave}
        </label>
        <span
          className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-md border ${
            parametro.esDefault
              ? "bg-slate-700/40 text-slate-400 border-slate-600"
              : "bg-orange-500/10 text-orange-300 border-orange-500/30"
          }`}
        >
          {parametro.esDefault ? `Default: ${parametro.defaultValor}` : "Personalizado"}
        </span>
      </div>

      <p className="text-xs text-slate-400">{parametro.descripcion}</p>

      <div className="flex items-center gap-2">
        <input
          id={inputId}
          name="valor"
          type="text"
          inputMode={parametro.tipo === "INT" || parametro.tipo === "DECIMAL" ? "decimal" : "text"}
          defaultValue={parametro.valorActual}
          aria-describedby={error ? `${inputId}-error` : undefined}
          required
          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:outline-2 focus:outline-orange-500"
        />
        <button
          type="submit"
          disabled={pending}
          className="text-sm font-semibold bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-slate-900 px-4 py-2 rounded-lg transition-colors"
        >
          {pending ? "Guardando…" : "Guardar"}
        </button>
      </div>

      {error && (
        <p id={`${inputId}-error`} role="alert" className="text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      {ok && <p className="text-sm text-emerald-400">Parámetro actualizado correctamente.</p>}

      {!parametro.esDefault && parametro.updatedPor && (
        <p className="text-xs text-slate-500">
          Última edición: {parametro.updatedPor}
          {parametro.updatedAt ? ` — ${new Date(parametro.updatedAt).toLocaleString("es-AR")}` : ""}
        </p>
      )}
    </form>
  );
}

"use client";

import { useActionState, useState } from "react";
import {
  loginConEmail,
  loginConDni,
  enviarLinkWhatsApp,
  enviarMagicLinkEmail,
} from "./actions";

// ─── Estilos compartidos ───────────────────────────────────────────────────────

const inputCls =
  "w-full bg-industrial-900 border border-industrial-600 text-slate-200 placeholder:text-slate-600 font-mono rounded-sm px-4 py-3 text-sm focus:outline-2 focus:outline-tactical-500 min-h-[48px] transition-colors duration-150";

const labelCls =
  "block text-[10px] font-bold text-slate-500 mb-1.5 tracking-widest uppercase font-mono";

function AlertError({ msg }: { msg: string }) {
  return (
    <div
      role="alert"
      className="bg-red-950/60 border border-red-800/60 text-red-400 rounded-sm px-4 py-3 text-sm font-mono"
    >
      <span className="text-red-500 mr-2">▲</span>
      {msg}
    </div>
  );
}

function AlertOk({ msg }: { msg: string }) {
  return (
    <div
      role="status"
      className="bg-blue-950/60 border border-blue-800/60 text-blue-400 rounded-sm px-4 py-3 text-sm font-mono"
    >
      <span className="text-blue-500 mr-2">✓</span>
      {msg}
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4 text-current"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

// Botón de acción mecánico — press-down 3D
const mechBtnCls = `
  w-full inline-flex items-center justify-center gap-2
  font-bold tracking-widest uppercase text-sm
  rounded-sm px-6 py-3.5 min-h-[48px] select-none
  transition-all duration-150 ease-mech-press
  disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 disabled:border-b-[5px]
`;

// ─── Ícono WhatsApp ────────────────────────────────────────────────────────────

function IcoWhatsApp({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className ?? "w-5 h-5"} fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.118 1.533 5.845L.057 23.428a.75.75 0 0 0 .918.937l5.724-1.5A11.934 11.934 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.929 0-3.736-.518-5.29-1.422l-.38-.225-3.94 1.033 1.05-3.835-.247-.394A9.944 9.944 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
    </svg>
  );
}

// ─── Formulario WhatsApp ───────────────────────────────────────────────────────

function FormWhatsApp({ onBack }: { onBack: () => void }) {
  const [state, action, pending] = useActionState(enviarLinkWhatsApp, null);

  if (state?.ok) {
    return (
      <div className="flex flex-col gap-4">
        <AlertOk msg="Te enviamos un link a tu WhatsApp. Tocalo para ingresar." />
        <p className="text-xs text-slate-600 text-center font-mono">
          El link expira en 1 hora. Si no llega,{" "}
          <button className="text-tactical-500 hover:text-tactical-400 underline" onClick={() => window.location.reload()}>
            intentá de nuevo
          </button>.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      {state?.error && <AlertError msg={state.error} />}

      <div>
        <label htmlFor="wsp-telefono" className={labelCls}>
          Número de WhatsApp
        </label>
        <input
          id="wsp-telefono"
          name="telefono"
          type="tel"
          required
          autoComplete="tel"
          className={inputCls}
          placeholder="3436 575372"
        />
        <p className="text-[10px] text-slate-600 mt-1.5 font-mono">
          El número registrado con Escobar Instalaciones.
        </p>
      </div>

      <button
        type="submit"
        disabled={pending}
        className={`${mechBtnCls} bg-emerald-700 text-white border border-emerald-600 border-b-[5px] border-b-emerald-900 hover:bg-emerald-600 active:border-b-[1px] active:translate-y-[4px] active:bg-emerald-800`}
      >
        {pending ? (
          <><Spinner /> Enviando…</>
        ) : (
          <><IcoWhatsApp /> Enviar link por WhatsApp</>
        )}
      </button>

      <button
        type="button"
        onClick={onBack}
        className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors text-center min-h-[44px] font-mono tracking-widest uppercase"
      >
        ← Volver
      </button>
    </form>
  );
}

// ─── Formulario Email ──────────────────────────────────────────────────────────

function FormEmail({ onBack }: { onBack: () => void }) {
  const [magicState, magicAction, magicPending] = useActionState(enviarMagicLinkEmail, null);
  const [passState, passAction, passPending] = useActionState(loginConEmail, null);
  const [mostrarPassword, setMostrarPassword] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      {magicState?.ok ? (
        <AlertOk msg="Revisá tu email. Te enviamos un link para ingresar." />
      ) : (
        <form action={magicAction} className="flex flex-col gap-4">
          {magicState?.error && <AlertError msg={magicState.error} />}
          <div>
            <label htmlFor="magic-email" className={labelCls}>Email</label>
            <input
              id="magic-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className={inputCls}
              placeholder="tucorreo@ejemplo.com"
            />
          </div>
          <button
            type="submit"
            disabled={magicPending}
            className={`${mechBtnCls} bg-tactical-500 text-white border border-tactical-600 border-b-[5px] border-b-tactical-600 hover:bg-tactical-400 active:border-b-[1px] active:translate-y-[4px] active:bg-tactical-600`}
          >
            {magicPending ? <><Spinner /> Enviando…</> : "Enviar link de acceso"}
          </button>
        </form>
      )}

      {/* Acceso con contraseña */}
      <div>
        <button
          type="button"
          onClick={() => setMostrarPassword((v) => !v)}
          className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors w-full text-center min-h-[44px] font-mono tracking-widest uppercase"
        >
          {mostrarPassword ? "▲ Ocultar" : "¿Tenés contraseña? Ingresar con contraseña"}
        </button>

        {mostrarPassword && (
          <form action={passAction} className="flex flex-col gap-3 mt-3">
            {passState?.error && <AlertError msg={passState.error} />}
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              className={inputCls}
              placeholder="Email"
            />
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className={inputCls}
              placeholder="Contraseña"
            />
            <button
              type="submit"
              disabled={passPending}
              className={`${mechBtnCls} bg-industrial-700 text-slate-300 border border-industrial-600 border-b-[5px] border-b-industrial-950 hover:bg-industrial-600 active:border-b-[1px] active:translate-y-[4px]`}
            >
              {passPending ? <><Spinner /> Ingresando…</> : "Ingresar"}
            </button>
          </form>
        )}
      </div>

      <button
        type="button"
        onClick={onBack}
        className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors text-center min-h-[44px] font-mono tracking-widest uppercase"
      >
        ← Volver
      </button>
    </div>
  );
}

// ─── Formulario DNI ────────────────────────────────────────────────────────────

function FormDni({ onBack }: { onBack: () => void }) {
  const [state, action, pending] = useActionState(loginConDni, null);

  return (
    <form action={action} className="flex flex-col gap-4">
      {state?.error && <AlertError msg={state.error} />}
      <div>
        <label htmlFor="dni-input" className={labelCls}>Número de DNI</label>
        <input
          id="dni-input"
          name="dni"
          type="text"
          inputMode="numeric"
          required
          className={inputCls}
          placeholder="12345678"
        />
      </div>
      <div>
        <label htmlFor="dni-password" className={labelCls}>Contraseña</label>
        <input
          id="dni-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputCls}
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className={`${mechBtnCls} bg-tactical-500 text-white border border-tactical-600 border-b-[5px] border-b-tactical-600 hover:bg-tactical-400 active:border-b-[1px] active:translate-y-[4px] active:bg-tactical-600`}
      >
        {pending ? <><Spinner /> Ingresando…</> : "Ingresar"}
      </button>
      <button
        type="button"
        onClick={onBack}
        className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors text-center min-h-[44px] font-mono tracking-widest uppercase"
      >
        ← Volver
      </button>
    </form>
  );
}

// ─── Selector de método ────────────────────────────────────────────────────────

type Metodo = "whatsapp" | "email" | "dni";

function SelectorMetodo({ onSelect }: { onSelect: (m: Metodo) => void }) {
  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-[10px] text-slate-600 text-center mb-2 font-mono tracking-widest uppercase">
        Seleccioná método de acceso
      </p>

      {/* WhatsApp — método principal */}
      <button
        type="button"
        onClick={() => onSelect("whatsapp")}
        className="w-full flex items-center gap-4 bg-industrial-900/80 hover:bg-industrial-900 border border-industrial-600 hover:border-emerald-700/60 rounded-sm px-5 py-4 text-left transition-all duration-150 ease-mech-press group min-h-[64px]"
      >
        <span className="text-emerald-500 flex-shrink-0">
          <IcoWhatsApp className="w-6 h-6" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-slate-200 font-semibold text-sm leading-tight">WhatsApp</div>
          <div className="text-slate-600 text-[10px] mt-0.5 font-mono">Recibís un link — tocás y entrás</div>
        </div>
        <span className="text-slate-700 group-hover:text-slate-500 transition-colors text-sm font-mono">›</span>
      </button>

      {/* Email */}
      <button
        type="button"
        onClick={() => onSelect("email")}
        className="w-full flex items-center gap-4 bg-industrial-900/80 hover:bg-industrial-900 border border-industrial-600 hover:border-tactical-500/40 rounded-sm px-5 py-4 text-left transition-all duration-150 ease-mech-press group min-h-[64px]"
      >
        <span className="text-tactical-500 flex-shrink-0">
          <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <rect x="2" y="4" width="20" height="16" rx="1" />
            <path d="m2 7 10 7 10-7" />
          </svg>
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-slate-200 font-semibold text-sm leading-tight">Email</div>
          <div className="text-slate-600 text-[10px] mt-0.5 font-mono">Link de acceso a tu correo</div>
        </div>
        <span className="text-slate-700 group-hover:text-slate-500 transition-colors text-sm font-mono">›</span>
      </button>

      {/* DNI — discreto */}
      <button
        type="button"
        onClick={() => onSelect("dni")}
        className="w-full text-[10px] text-slate-600 hover:text-slate-400 transition-colors py-2 min-h-[44px] text-center font-mono tracking-widest uppercase"
      >
        Ingresar con DNI y contraseña
      </button>
    </div>
  );
}

// ─── Contenedor principal ─────────────────────────────────────────────────────

export function LoginTabs() {
  const [metodo, setMetodo] = useState<Metodo | null>(null);

  const titulos: Record<Metodo, string> = {
    whatsapp: "Acceso por WhatsApp",
    email:    "Acceso por Email",
    dni:      "Acceso con DNI",
  };

  return (
    <div>
      {metodo !== null && (
        <h2 className="text-xs font-bold text-slate-500 mb-6 text-center font-mono tracking-widest uppercase">
          {titulos[metodo]}
        </h2>
      )}
      {metodo === null      && <SelectorMetodo onSelect={setMetodo} />}
      {metodo === "whatsapp" && <FormWhatsApp   onBack={() => setMetodo(null)} />}
      {metodo === "email"    && <FormEmail       onBack={() => setMetodo(null)} />}
      {metodo === "dni"      && <FormDni         onBack={() => setMetodo(null)} />}
    </div>
  );
}

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
  "w-full bg-slate-700 border border-slate-600 text-white placeholder:text-slate-400 rounded-lg px-4 py-3 text-base focus:outline-2 focus:outline-orange-500 min-h-[48px]";

const labelCls = "block text-sm font-medium text-slate-300 mb-1";

function AlertError({ msg }: { msg: string }) {
  return (
    <div role="alert" className="bg-red-900/40 border border-red-700 text-red-300 rounded-lg px-4 py-3 text-sm">
      {msg}
    </div>
  );
}

function AlertOk({ msg }: { msg: string }) {
  return (
    <div role="status" className="bg-green-900/40 border border-green-700 text-green-300 rounded-lg px-4 py-3 text-sm">
      {msg}
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin h-5 w-5 text-current"
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
        <AlertOk msg="✓ Te enviamos un link a tu WhatsApp. Tocalo para ingresar." />
        <p className="text-xs text-slate-400 text-center">
          El link expira en 1 hora. Si no llega, revisá que el número esté bien o{" "}
          <button className="text-orange-400 underline" onClick={() => window.location.reload()}>
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
        <label htmlFor="wsp-telefono" className={labelCls}>Número de WhatsApp</label>
        <input
          id="wsp-telefono"
          name="telefono"
          type="tel"
          required
          autoComplete="tel"
          className={inputCls}
          placeholder="3436 575372"
        />
        <p className="text-xs text-slate-400 mt-1">
          El mismo número que tenés registrado con Escobar Instalaciones.
        </p>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold rounded-lg px-4 py-3 min-h-[48px] text-base transition-colors flex items-center justify-center gap-2"
      >
        {pending ? (
          <><Spinner /> Enviando…</>
        ) : (
          <><IcoWhatsApp /> Enviarme link por WhatsApp</>
        )}
      </button>

      <button type="button" onClick={onBack} className="text-xs text-slate-500 hover:text-slate-300 transition-colors text-center">
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
        <AlertOk msg="✓ Revisá tu email. Te enviamos un link para ingresar." />
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
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold rounded-lg px-4 py-3 min-h-[48px] text-base transition-colors flex items-center justify-center gap-2"
          >
            {magicPending ? <><Spinner /> Enviando…</> : "Enviarme link de acceso"}
          </button>
        </form>
      )}

      {/* Acceso con contraseña — solo admin */}
      <div>
        <button
          type="button"
          onClick={() => setMostrarPassword((v) => !v)}
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors w-full text-center"
        >
          {mostrarPassword ? "▲ Ocultar" : "¿Tenés contraseña? Ingresar con contraseña"}
        </button>

        {mostrarPassword && (
          <form action={passAction} className="flex flex-col gap-4 mt-4">
            {passState?.error && <AlertError msg={passState.error} />}
            <input name="email" type="email" autoComplete="email" required className={inputCls} placeholder="Email" />
            <input name="password" type="password" autoComplete="current-password" required className={inputCls} placeholder="Contraseña" />
            <button
              type="submit"
              disabled={passPending}
              className="w-full bg-slate-600 hover:bg-slate-500 disabled:opacity-60 text-white font-semibold rounded-lg px-4 py-3 min-h-[48px] text-base transition-colors flex items-center justify-center gap-2"
            >
              {passPending ? <><Spinner /> Ingresando…</> : "Ingresar"}
            </button>
          </form>
        )}
      </div>

      <button type="button" onClick={onBack} className="text-xs text-slate-500 hover:text-slate-300 transition-colors text-center">
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
        <input id="dni-input" name="dni" type="text" inputMode="numeric" required className={inputCls} placeholder="12345678" />
      </div>
      <div>
        <label htmlFor="dni-password" className={labelCls}>Contraseña</label>
        <input id="dni-password" name="password" type="password" autoComplete="current-password" required className={inputCls} />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold rounded-lg px-4 py-3 min-h-[48px] text-base transition-colors flex items-center justify-center gap-2"
      >
        {pending ? <><Spinner /> Ingresando…</> : "Ingresar"}
      </button>
      <button type="button" onClick={onBack} className="text-xs text-slate-500 hover:text-slate-300 transition-colors text-center">
        ← Volver
      </button>
    </form>
  );
}

// ─── Selector de método (pantalla inicial) ────────────────────────────────────

type Metodo = "whatsapp" | "email" | "dni";

function SelectorMetodo({ onSelect }: { onSelect: (m: Metodo) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-slate-300 text-sm text-center mb-1">¿Cómo querés ingresar?</p>

      {/* WhatsApp — método principal */}
      <button
        type="button"
        onClick={() => onSelect("whatsapp")}
        className="w-full flex items-center gap-4 bg-green-600/20 hover:bg-green-600/30 border border-green-600/40 hover:border-green-500 rounded-xl px-5 py-4 text-left transition-all group min-h-[64px]"
      >
        <span className="text-green-400 group-hover:scale-110 transition-transform">
          <IcoWhatsApp className="w-7 h-7" />
        </span>
        <div>
          <div className="text-white font-semibold text-base leading-tight">WhatsApp</div>
          <div className="text-slate-400 text-xs mt-0.5">Recibís un link — tocás y entrás</div>
        </div>
        <span className="ml-auto text-slate-500 group-hover:text-slate-300 transition-colors text-lg">›</span>
      </button>

      {/* Email */}
      <button
        type="button"
        onClick={() => onSelect("email")}
        className="w-full flex items-center gap-4 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 hover:border-slate-500 rounded-xl px-5 py-4 text-left transition-all group min-h-[64px]"
      >
        <span className="text-orange-400 group-hover:scale-110 transition-transform">
          <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="m2 7 10 7 10-7" />
          </svg>
        </span>
        <div>
          <div className="text-white font-semibold text-base leading-tight">Email</div>
          <div className="text-slate-400 text-xs mt-0.5">Te mandamos un link a tu correo</div>
        </div>
        <span className="ml-auto text-slate-500 group-hover:text-slate-300 transition-colors text-lg">›</span>
      </button>

      {/* DNI — acceso alternativo, más discreto */}
      <button
        type="button"
        onClick={() => onSelect("dni")}
        className="w-full text-xs text-slate-500 hover:text-slate-300 transition-colors py-2 text-center"
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
    whatsapp: "Ingresar por WhatsApp",
    email: "Ingresar por Email",
    dni: "Ingresar con DNI",
  };

  return (
    <div>
      {metodo !== null && (
        <h2 className="text-lg font-semibold text-white mb-6 text-center">
          {titulos[metodo]}
        </h2>
      )}

      {metodo === null && <SelectorMetodo onSelect={setMetodo} />}
      {metodo === "whatsapp" && <FormWhatsApp onBack={() => setMetodo(null)} />}
      {metodo === "email" && <FormEmail onBack={() => setMetodo(null)} />}
      {metodo === "dni" && <FormDni onBack={() => setMetodo(null)} />}
    </div>
  );
}

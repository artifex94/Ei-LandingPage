"use client";

import { useActionState, useState } from "react";
import {
  loginConCredencial,

  enviarLinkWhatsApp,
  enviarMagicLinkEmail,
} from "./actions";

type Metodo = "password" | "whatsapp" | "magic";

const inputCls =
  "w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3.5 text-base text-white placeholder:text-slate-500 outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-300/20 min-h-[52px]";

const actionBtnCls =
  "inline-flex min-h-[54px] w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-base font-black transition disabled:cursor-not-allowed disabled:opacity-60";

function AlertError({ msg }: { msg: string }) {
  return <div role="alert" className="rounded-2xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-100">{msg}</div>;
}

function AlertOk({ msg }: { msg: string }) {
  return <div role="status" className="rounded-2xl border border-emerald-400/30 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-100">{msg}</div>;
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="mx-auto block min-h-[44px] text-sm font-bold text-slate-400 transition hover:text-white">
      Volver
    </button>
  );
}

function FormPassword() {
  const [state, action, pending] = useActionState(loginConCredencial, null);

  return (
    <form action={action} className="space-y-4">
      {state?.error && <AlertError msg={state.error} />}
      <input name="credencial" type="text" autoComplete="username" required className={inputCls} placeholder="Email o DNI" aria-label="Email o DNI" />
      <input name="password" type="password" autoComplete="current-password" required className={inputCls} placeholder="Contraseña" aria-label="Contraseña" />
      <button type="submit" disabled={pending} className={`${actionBtnCls} bg-orange-500 text-slate-950 hover:bg-orange-400`}>
        {pending ? <><Spinner /> Ingresando…</> : "Ingresar"}
      </button>
    </form>
  );
}

function FormWhatsApp({ onBack }: { onBack: () => void }) {
  const [state, action, pending] = useActionState(enviarLinkWhatsApp, null);

  return (
    <form action={action} className="space-y-4">
      {state?.error && <AlertError msg={state.error} />}
      {state?.ok && <AlertOk msg="Link enviado. Revisá tu WhatsApp." />}
      <input name="telefono" type="tel" required autoComplete="tel" className={inputCls} placeholder="Tu WhatsApp" aria-label="WhatsApp registrado" />
      <button type="submit" disabled={pending} className={`${actionBtnCls} bg-emerald-500 text-slate-950 hover:bg-emerald-400`}>
        {pending ? <><Spinner /> Enviando…</> : "Enviar link por WhatsApp"}
      </button>
      <BackButton onClick={onBack} />
    </form>
  );
}

function FormMagicEmail({ onBack }: { onBack: () => void }) {
  const [state, action, pending] = useActionState(enviarMagicLinkEmail, null);

  return (
    <form action={action} className="space-y-4">
      {state?.error && <AlertError msg={state.error} />}
      {state?.ok && <AlertOk msg="Link enviado. Revisá tu email." />}
      <input name="email" type="email" autoComplete="email" required className={inputCls} placeholder="Tu email" aria-label="Email para link de acceso" />
      <button type="submit" disabled={pending} className={`${actionBtnCls} bg-orange-500 text-slate-950 hover:bg-orange-400`}>
        {pending ? <><Spinner /> Enviando…</> : "Enviar link"}
      </button>
      <BackButton onClick={onBack} />
    </form>
  );
}

export function LoginTabs() {
  const [metodo, setMetodo] = useState<Metodo>("password");
  const isPassword = metodo === "password";

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">Mi Central</h1>
        <p className="mt-2 text-sm font-bold uppercase tracking-[0.24em] text-orange-300">Ingresá</p>
      </div>

      {metodo === "password" && <FormPassword />}
      {metodo === "whatsapp" && <FormWhatsApp onBack={() => setMetodo("password")} />}
      {metodo === "magic" && <FormMagicEmail onBack={() => setMetodo("password")} />}

      {isPassword && (
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-white/10 pt-4 text-sm">
          <button type="button" onClick={() => setMetodo("whatsapp")} className="min-h-[44px] font-bold text-slate-300 transition hover:text-white">
            WhatsApp
          </button>
          <span className="text-slate-700" aria-hidden>·</span>
          <button type="button" onClick={() => setMetodo("magic")} className="min-h-[44px] font-bold text-slate-300 transition hover:text-white">
            Link por email
          </button>
        </div>
      )}
    </div>
  );
}
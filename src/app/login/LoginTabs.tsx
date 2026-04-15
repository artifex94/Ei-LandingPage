"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { useActionState, useState } from "react";
import {
  loginConEmail,
  loginConDni,
  enviarOtpWhatsApp,
  verificarOtpWhatsApp,
} from "./actions";

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

// ─── Tab Email ────────────────────────────────────────────────────────────────

function LoginEmailForm() {
  const [state, action, pending] = useActionState(loginConEmail, null);

  return (
    <form action={action} className="flex flex-col gap-4">
      {state?.error && <AlertError msg={state.error} />}

      <div>
        <label htmlFor="email-input" className={labelCls}>Email</label>
        <input
          id="email-input"
          name="email"
          type="email"
          autoComplete="email"
          required
          className={inputCls}
          placeholder="tucorreo@ejemplo.com"
        />
      </div>

      <div>
        <label htmlFor="email-password" className={labelCls}>Contraseña</label>
        <input
          id="email-password"
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
        className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold rounded-lg px-4 py-3 min-h-[48px] text-base transition-colors"
      >
        {pending ? "Ingresando..." : "Ingresar"}
      </button>
    </form>
  );
}

// ─── Tab WhatsApp OTP ─────────────────────────────────────────────────────────

function LoginWhatsAppForm() {
  const [enviarState, enviarAction, enviarPending] = useActionState(enviarOtpWhatsApp, null);
  const [verificarState, verificarAction, verificarPending] = useActionState(verificarOtpWhatsApp, null);
  const [telefono, setTelefono] = useState("");

  const enPasoVerificar = enviarState?.step === "verify";

  if (!enPasoVerificar) {
    return (
      <form action={enviarAction} className="flex flex-col gap-4">
        {enviarState?.error && <AlertError msg={enviarState.error} />}

        <div>
          <label htmlFor="wsp-telefono" className={labelCls}>Número de WhatsApp</label>
          <input
            id="wsp-telefono"
            name="telefono"
            type="tel"
            required
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            className={inputCls}
            placeholder="+5493436575372"
          />
          <p className="text-xs text-slate-400 mt-1">Formato internacional: +54 9 343 XXX XXXX</p>
        </div>

        <button
          type="submit"
          disabled={enviarPending}
          className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold rounded-lg px-4 py-3 min-h-[48px] text-base transition-colors"
        >
          {enviarPending ? "Enviando código..." : "Enviar código por WhatsApp"}
        </button>
      </form>
    );
  }

  return (
    <form action={verificarAction} className="flex flex-col gap-4">
      <div className="bg-green-900/40 border border-green-700 text-green-300 rounded-lg px-4 py-3 text-sm">
        Código enviado al WhatsApp {telefono}
      </div>

      {verificarState?.error && <AlertError msg={verificarState.error} />}

      <input type="hidden" name="telefono" value={telefono} />

      <div>
        <label htmlFor="otp-token" className={labelCls}>Código de 6 dígitos</label>
        <input
          id="otp-token"
          name="token"
          type="text"
          inputMode="numeric"
          maxLength={6}
          required
          autoFocus
          className={`${inputCls} text-2xl tracking-widest text-center min-h-[56px]`}
          placeholder="000000"
        />
      </div>

      <button
        type="submit"
        disabled={verificarPending}
        className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold rounded-lg px-4 py-3 min-h-[48px] text-base transition-colors"
      >
        {verificarPending ? "Verificando..." : "Verificar código"}
      </button>
    </form>
  );
}

// ─── Tab DNI ──────────────────────────────────────────────────────────────────

function LoginDniForm() {
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
        className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold rounded-lg px-4 py-3 min-h-[48px] text-base transition-colors"
      >
        {pending ? "Ingresando..." : "Ingresar"}
      </button>
    </form>
  );
}

// ─── Tabs container ───────────────────────────────────────────────────────────

export function LoginTabs() {
  return (
    <Tabs.Root defaultValue="email">
      <Tabs.List
        className="flex gap-1 mb-6 p-1 bg-slate-700/60 rounded-xl"
        aria-label="Método de ingreso"
      >
        {[
          { value: "email", label: "Email" },
          { value: "whatsapp", label: "WhatsApp" },
          { value: "dni", label: "DNI" },
        ].map((tab) => (
          <Tabs.Trigger
            key={tab.value}
            value={tab.value}
            className="flex-1 py-2.5 text-sm font-medium rounded-lg text-slate-400 data-[state=active]:bg-slate-600 data-[state=active]:text-white data-[state=active]:shadow-sm min-h-[44px] transition-all"
          >
            {tab.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>

      <Tabs.Content value="email"><LoginEmailForm /></Tabs.Content>
      <Tabs.Content value="whatsapp"><LoginWhatsAppForm /></Tabs.Content>
      <Tabs.Content value="dni"><LoginDniForm /></Tabs.Content>
    </Tabs.Root>
  );
}

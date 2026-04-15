import Link from "next/link";
import { LoginTabs } from "./LoginTabs";

export const metadata = {
  title: "Ingresar — Escobar Instalaciones",
};

export default function LoginPage() {
  return (
    <main className="portal-login min-h-screen flex items-center justify-center bg-slate-900 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="h-10 w-10 bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-orange-500/20">
              EI
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white">
            Mi Portal
          </h1>
          <p className="text-slate-400 mt-2">Escobar Instalaciones</p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-xl p-8">
          <LoginTabs />

          <p className="mt-8 text-sm text-slate-400 text-center">
            ¿Problemas para ingresar?{" "}
            <a
              href="https://wa.me/5493436575372"
              className="text-orange-400 underline hover:text-orange-300 inline-flex items-center gap-1"
              target="_blank"
              rel="noopener noreferrer"
            >
              Escribinos al WhatsApp
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}

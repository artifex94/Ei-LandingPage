import Link from "next/link";
import { LoginTabs } from "./LoginTabs";

export const metadata = {
  title: "Ingresar",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:text-slate-900 focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg focus:font-medium"
      >
        Ir al contenido principal
      </a>

      <main
        id="main-content"
        tabIndex={-1}
        className="portal-login min-h-screen flex items-center justify-center bg-industrial-950 px-4 py-12 relative overflow-hidden"
      >
        {/* Rejilla de puntos — chasis de fondo */}
        <div
          className="absolute inset-0 opacity-[0.18]"
          aria-hidden="true"
          style={{
            backgroundImage: "radial-gradient(circle, #1E293B 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        {/* Biseles de esquina decorativos */}
        <div className="absolute top-0 left-0 w-24 h-24 border-l-2 border-t-2 border-industrial-700/40 pointer-events-none" aria-hidden="true" />
        <div className="absolute bottom-0 right-0 w-24 h-24 border-r-2 border-b-2 border-industrial-700/40 pointer-events-none" aria-hidden="true" />

        <div className="w-full max-w-md relative z-10">

          {/* Logo + encabezado */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center mb-5">
              <div
                aria-hidden="true"
                className="h-14 w-14 bg-tactical-500 rounded-lg flex items-center justify-center text-white font-bold text-xl
                           shadow-[0_0_24px_rgba(241,119,32,0.3)]
                           border border-tactical-600 border-b-[4px] border-b-tactical-600"
              >
                EI
              </div>
            </div>
            <h1 className="text-xl font-bold text-white tracking-[0.2em] uppercase font-mono">
              Acceso al Sistema
            </h1>
            <p className="text-slate-600 mt-2 text-xs tracking-widest font-mono uppercase">
              Escobar Instalaciones · Infraestructura
            </p>
          </div>

          {/* Tarjeta de autenticación */}
          <div className="bg-industrial-800 border border-industrial-700 rounded-lg shadow-[0_16px_40px_rgba(0,0,0,0.6)] overflow-hidden">
            {/* Barra de acento naranja — indicador de seguridad activa */}
            <div
              className="h-[3px] bg-gradient-to-r from-tactical-600 via-tactical-500 to-tactical-400"
              aria-hidden="true"
            />

            <div className="p-8">
              <LoginTabs />

              <div className="mt-8 pt-5 border-t border-industrial-700">
                <p className="text-xs text-slate-600 text-center">
                  ¿Problemas para ingresar?{" "}
                  <a
                    href="https://wa.me/5493436575372"
                    className="text-tactical-500 hover:text-tactical-400 transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Escribinos al WhatsApp
                  </a>
                </p>
              </div>
            </div>
          </div>

          {/* Indicador de estado del sistema */}
          <div className="mt-6 flex items-center justify-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-blue-500 animate-led-idle flex-shrink-0" aria-hidden="true" />
            <span className="text-[10px] text-slate-700 font-mono tracking-widest uppercase">
              Sistema en línea
            </span>
          </div>
        </div>
      </main>
    </>
  );
}

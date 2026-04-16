import type { Metadata } from "next";
import Link from "next/link";
import { LogoutButton } from "@/components/ui/LogoutButton";
import "./portal.css";

export const metadata: Metadata = {
  title: "Mi Portal — Escobar Instalaciones",
  robots: "noindex, nofollow",
};

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Skip-to-content — WCAG 2.4.1 */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:text-slate-900 focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg focus:text-lg focus:font-medium"
      >
        Ir al contenido principal
      </a>

      <div className="min-h-screen bg-slate-900 flex flex-col">
        <header className="bg-slate-800 border-b border-slate-700 px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <Link
              href="/portal/dashboard"
              className="flex items-center gap-2 group"
            >
              <div className="h-8 w-8 bg-orange-500 rounded-md flex items-center justify-center text-white font-bold text-sm shadow shadow-orange-500/20 group-hover:scale-105 transition-transform">
                EI
              </div>
              <span className="text-base font-semibold text-white">Escobar Instalaciones</span>
            </Link>
            <nav aria-label="Navegación principal del portal">
              <ul className="flex gap-6 text-sm" role="list">
                <li>
                  <Link
                    href="/portal/dashboard"
                    className="text-slate-300 hover:text-white min-h-[44px] flex items-center transition-colors"
                  >
                    Mis servicios
                  </Link>
                </li>
                <li>
                  <Link
                    href="/portal/pagos"
                    className="text-slate-300 hover:text-white min-h-[44px] flex items-center transition-colors"
                  >
                    Pagos
                  </Link>
                </li>
                <li>
                  <Link
                    href="/portal/solicitudes"
                    className="text-slate-300 hover:text-white min-h-[44px] flex items-center transition-colors"
                  >
                    Asistencia
                  </Link>
                </li>
                <li>
                  <Link
                    href="/portal/perfil"
                    className="text-slate-300 hover:text-white min-h-[44px] flex items-center transition-colors"
                  >
                    Mi perfil
                  </Link>
                </li>
                <li>
                  <LogoutButton />
                </li>
              </ul>
            </nav>
          </div>
        </header>

        <main
          id="main-content"
          tabIndex={-1}
          className="portal-main flex-1 max-w-4xl mx-auto w-full px-4 py-8"
        >
          {children}
        </main>

        <footer className="bg-slate-800 border-t border-slate-700 px-4 py-4 text-sm text-slate-400 text-center">
          Escobar Instalaciones — Soporte:{" "}
          <a
            href="https://wa.me/5493436575372"
            className="text-orange-400 underline hover:text-orange-300"
          >
            343-657-5372
          </a>
        </footer>
      </div>
    </>
  );
}

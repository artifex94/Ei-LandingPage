import { LoginTabs } from "./LoginTabs";
import { siteConfig } from "@/config/site";
import { BrandLockup } from "@/components/layout/BrandLockup";

export const metadata = {
  title: "Ingresar a Mi Central",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:left-4 focus-visible:top-4 focus-visible:z-50 focus-visible:rounded-lg focus-visible:bg-white focus-visible:px-4 focus-visible:py-2 focus-visible:font-medium focus-visible:text-slate-900 focus-visible:shadow-lg"
      >
        Ir al contenido principal
      </a>

      <main
        id="main-content"
        tabIndex={-1}
        className="portal-login relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-8 text-white"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(241,119,32,0.18),transparent_34%),linear-gradient(135deg,#020617_0%,#0f172a_55%,#111827_100%)]" aria-hidden="true" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          aria-hidden="true"
          style={{
            backgroundImage: "radial-gradient(circle, #334155 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-orange-400/10 bg-orange-500/[0.03] shadow-[0_0_120px_rgba(241,119,32,0.10)]" aria-hidden="true">
          <div className="radar-sweep absolute inset-10 rounded-full border border-orange-300/15" />
          <div className="absolute inset-24 rounded-full border border-dashed border-emerald-300/10" />
          <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-300 shadow-[0_0_28px_rgba(110,231,183,0.85)] motion-safe:animate-pulse" />
        </div>
        <div className="scanline pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-emerald-300/10 to-transparent" aria-hidden="true" />

        <section className="relative z-10 w-full max-w-[420px] rounded-[2rem] border border-white/10 bg-slate-900/86 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.62)] backdrop-blur-xl sm:p-8" aria-label="Acceso a Mi Central">
          <BrandLockup context="Acceso de clientes" className="mb-7 justify-center" />

          <LoginTabs />

          <p className="mt-5 text-center text-xs text-slate-500">
            ¿Necesitás ayuda?{" "}
            <a
              href={siteConfig.contact.whatsappLink}
              className="font-bold text-orange-300 underline-offset-4 transition hover:text-orange-200 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Escribinos por WhatsApp
            </a>
          </p>
        </section>
      </main>
    </>
  );
}

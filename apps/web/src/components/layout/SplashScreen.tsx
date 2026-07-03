"use client";

import Image from "next/image";
import { useEffect } from "react";

const SPLASH_VISTO = "eiSplashVisto";

/**
 * Cortina de marca de la landing: tapa el render progresivo (streaming +
 * hidratación) con el logo hasta que la página está lista. Salida en tres
 * capas para que NUNCA bloquee:
 *  1. CSS puro: animation con delay 2.2s la desvanece sola aunque el JS no
 *     cargue (el contenido SSR queda debajo en el DOM — SEO intacto).
 *  2. JS: al hidratar se adelanta el fade (.ei-splash-lista) — en conexiones
 *     rápidas dura lo que tarda la página real.
 *  3. Repetición: un script inline (corre ANTES del primer paint) la esconde
 *     al instante si ya se vio en esta sesión.
 * Con prefers-reduced-motion la cortina no existe (display:none en CSS).
 */
export default function SplashScreen() {
  useEffect(() => {
    const el = document.getElementById("ei-splash");
    if (!el) return;
    // Doble rAF: la página ya pintó detrás de la cortina antes del fade.
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => {
        el.classList.add("ei-splash-lista");
        try {
          sessionStorage.setItem(SPLASH_VISTO, "1");
        } catch {
          /* sin sessionStorage (modo privado estricto): la capa CSS cubre */
        }
      });
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div id="ei-splash" aria-hidden="true" className="ei-splash">
      <script
        // Visitante recurrente de la sesión: esconder antes del primer paint.
        dangerouslySetInnerHTML={{
          __html: `try{if(sessionStorage.${SPLASH_VISTO}==='1')document.getElementById('ei-splash').style.display='none'}catch(e){}`,
        }}
      />
      <div className="ei-splash-marca">
        <span className="relative inline-flex h-20 w-20 items-center justify-center">
          <Image
            src="/logo.png"
            alt=""
            fill
            sizes="80px"
            unoptimized
            priority
            className="logo-glow pointer-events-none select-none object-contain"
          />
          <Image
            src="/logo.png"
            alt=""
            width={80}
            height={80}
            unoptimized
            priority
            className="relative h-20 w-20 object-contain"
          />
        </span>
        <p className="font-display text-lg font-bold text-white">Escobar Instalaciones</p>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
          Seguridad electrónica
        </p>
        <span className="ei-splash-barra" />
      </div>
    </div>
  );
}

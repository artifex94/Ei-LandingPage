"use client";

import { useEffect, useRef, useState } from "react";
import { MousePointer2 } from "lucide-react";
import { MONITOR, calcularTransformMonitor } from "@/lib/ui/headerMonitor";

/**
 * Pantallita CCTV en el navbar (solo 2xl): muestra "lo que graba la cámara"
 * del header — un espejo DOM de la landing centrado en el mouse. No captura
 * píxeles: es un clon estático y sanitizado del <main> ([data-cctv-source])
 * dentro de una pantalla con overflow clip; un rAF con el mismo suavizado
 * exponencial del HeaderCamera panea translate(...) scale(...) para que el
 * punto bajo el cursor quede siempre en el crosshair central. Costo por
 * frame: una sola mutación de transform.
 *
 * El clon se reconstruye en idle cada 20s ("delay de señal") y queda inerte:
 * sin scripts/iframes, sin ids duplicados, imágenes eager, inert+aria-hidden,
 * animaciones congeladas por CSS (.cctv-clone en globals.css).
 */
export default function HeaderMonitor() {
  const holderRef = useRef<HTMLDivElement>(null);
  // El reloj se setea recién en el cliente (la hora real en SSR daría mismatch).
  const [hora, setHora] = useState("--:--:--");

  useEffect(() => {
    const holder = holderRef.current;
    if (!holder) return;

    // Anclado al borde izquierdo, encima de la cámara: necesita que el margen
    // lateral del container (max-w-[1600px]) deje lugar para no pisar el
    // logo → gate en 1760px.
    const desktop = window.matchMedia("(min-width: 1760px) and (pointer: fine)");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

    let raf = 0;
    let running = false;
    let lastFrame = 0;
    let curX = 0;
    let curY = 0;
    let tgtX = 0;
    let tgtY = 0;
    let lastClientX = window.innerWidth / 2;
    let lastClientY = window.innerHeight / 2;
    let rebuildTimer: ReturnType<typeof setInterval> | undefined;
    let clockTimer: ReturnType<typeof setInterval> | undefined;
    let conFeed = false;
    let siguiendo = false;

    const aplicar = () => {
      holder.style.transform = `translate(${curX}px, ${curY}px) scale(${MONITOR.SCALE})`;
    };

    const retarget = () => {
      const t = calcularTransformMonitor(
        lastClientX + window.scrollX,
        lastClientY + window.scrollY
      );
      tgtX = t.tx;
      tgtY = t.ty;
    };

    const loop = (now: number) => {
      const dt = lastFrame ? Math.min(now - lastFrame, 100) : 16.7;
      lastFrame = now;
      const k = 1 - Math.exp(-dt / MONITOR.TAU_MS);
      curX += (tgtX - curX) * k;
      curY += (tgtY - curY) * k;
      if (Math.abs(tgtX - curX) <= MONITOR.EPSILON && Math.abs(tgtY - curY) <= MONITOR.EPSILON) {
        curX = tgtX;
        curY = tgtY;
        running = false;
      } else {
        raf = requestAnimationFrame(loop);
      }
      aplicar();
    };

    const kick = () => {
      if (!running) {
        running = true;
        lastFrame = 0;
        raf = requestAnimationFrame(loop);
      }
    };

    const buildClone = () => {
      const source = document.querySelector<HTMLElement>("[data-cctv-source]");
      if (!source) return;
      const clone = source.cloneNode(true) as HTMLElement;
      // Sin esto, el rebuild de los 20s encontraría al propio clon como fuente.
      clone.removeAttribute("data-cctv-source");
      clone.querySelectorAll("script, iframe, noscript").forEach((el) => el.remove());
      clone.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
      clone.querySelectorAll("img").forEach((img) => {
        img.loading = "eager";
      });
      clone.setAttribute("inert", "");
      clone.setAttribute("aria-hidden", "true");
      holder.style.width = `${window.innerWidth}px`;
      holder.replaceChildren(clone);
    };

    const onMove = (e: MouseEvent) => {
      lastClientX = e.clientX;
      lastClientY = e.clientY;
      retarget();
      kick();
    };

    const onScroll = () => {
      retarget();
      kick();
    };

    const onResize = () => {
      buildClone();
      retarget();
      kick();
    };

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        running = false;
      } else {
        kick();
      }
    };

    // ── Grupo feed (clon + reloj): activo en 2xl, también con reduced-motion
    // (mostrar el encuadre estático es contenido, no animación). ────────────
    const attachFeed = () => {
      buildClone();
      retarget();
      curX = tgtX;
      curY = tgtY;
      aplicar();
      rebuildTimer = setInterval(() => {
        if (!document.hidden) buildClone();
      }, MONITOR.REBUILD_MS);
      const tick = () =>
        setHora(new Date().toLocaleTimeString("es-AR", { hour12: false }));
      tick();
      clockTimer = setInterval(tick, 1000);
      window.addEventListener("resize", onResize);
    };

    const detachFeed = () => {
      clearInterval(rebuildTimer);
      clearInterval(clockTimer);
      window.removeEventListener("resize", onResize);
      holder.replaceChildren();
    };

    // ── Grupo seguimiento (paneo hacia el mouse): 2xl && sin reduced-motion ─
    const attachFollow = () => {
      holder.dataset.monitorActive = "1";
      document.addEventListener("mousemove", onMove, { passive: true });
      window.addEventListener("scroll", onScroll, { passive: true });
      document.addEventListener("visibilitychange", onVisibility);
    };

    const detachFollow = () => {
      document.removeEventListener("mousemove", onMove);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibility);
      cancelAnimationFrame(raf);
      running = false;
      delete holder.dataset.monitorActive;
    };

    const sync = () => {
      const feed = desktop.matches;
      const follow = desktop.matches && !reduce.matches;
      if (feed && !conFeed) {
        conFeed = true;
        attachFeed();
      } else if (!feed && conFeed) {
        conFeed = false;
        detachFeed();
      }
      if (follow && !siguiendo) {
        siguiendo = true;
        attachFollow();
      } else if (!follow && siguiendo) {
        siguiendo = false;
        detachFollow();
      }
    };

    sync();
    desktop.addEventListener("change", sync);
    reduce.addEventListener("change", sync);
    return () => {
      desktop.removeEventListener("change", sync);
      reduce.removeEventListener("change", sync);
      if (siguiendo) {
        siguiendo = false;
        detachFollow();
      }
      if (conFeed) {
        conFeed = false;
        detachFeed();
      }
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      data-cctv-root
      className="pointer-events-none absolute left-3 top-1/2 hidden -translate-y-1/2 select-none min-[1760px]:block"
    >
      <div className="cctv-monitor">
        <div
          className="cctv-screen"
          style={{ width: MONITOR.SCREEN_W, height: MONITOR.SCREEN_H }}
        >
          <div ref={holderRef} className="cctv-clone" data-cctv-clone />
          <div className="cctv-overlay cctv-scanlines" />
          <div className="cctv-overlay cctv-vignette" />
          {/* El "mouse grabado": cursor con la punta en el punto rastreado */}
          <div className="cctv-overlay cctv-cursor">
            <MousePointer2 />
          </div>
          <div className="cctv-overlay cctv-hud font-mono">
            <span className="cctv-rec">REC</span>
            <span className="cctv-clock">{hora}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import {
  CursorFlechaWin,
  CursorManitoWin,
  CursorTextoWin,
} from "@/components/layout/CursoresWindows";
import {
  EVENTO_BUSQUEDA,
  MONITOR,
  calcularBarridoBusqueda,
  calcularDesvioCursor,
  calcularTransformMonitor,
  clasificarCursor,
} from "@/lib/ui/headerMonitor";

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
  const cursorRef = useRef<HTMLDivElement>(null);
  // El reloj se setea recién en el cliente (la hora real en SSR daría mismatch).
  const [hora, setHora] = useState("--:--:--");

  useEffect(() => {
    const holder = holderRef.current;
    if (!holder) return;

    // Anclado al borde izquierdo, encima de la cámara, desde 2xl. Entre 1536
    // y 1759px el margen del container no alcanza: el Navbar corre su
    // contenido con padding en ese rango para que la placa no pise el logo.
    const desktop = window.matchMedia("(min-width: 1536px) and (pointer: fine)");
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
      // El cursor dibujado se adelanta al paneo en el error de seguimiento:
      // el mouse "se movió primero" y la cámara lo alcanza.
      if (cursorRef.current) {
        const { dx, dy } = calcularDesvioCursor(curX, curY, tgtX, tgtY);
        cursorRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
      }
    };

    const retarget = () => {
      const t = calcularTransformMonitor(
        lastClientX + window.scrollX,
        lastClientY + window.scrollY
      );
      tgtX = t.tx;
      tgtY = t.ty;
    };

    // Modo búsqueda: el mouse "se escapó por arriba" (franja del navbar o
    // fuera de la ventana) y la cámara barre el sitio de lado a lado
    // buscándolo. El cursor dibujado desaparece del feed.
    let buscando = false;
    let inicioBusqueda = 0;

    const loop = (now: number) => {
      if (buscando) {
        const b = calcularBarridoBusqueda(
          now - inicioBusqueda,
          window.innerWidth,
          window.innerHeight,
          window.scrollX,
          window.scrollY
        );
        tgtX = b.tx;
        tgtY = b.ty;
      }
      const dt = lastFrame ? Math.min(now - lastFrame, 100) : 16.7;
      lastFrame = now;
      const k = 1 - Math.exp(-dt / MONITOR.TAU_MS);
      curX += (tgtX - curX) * k;
      curY += (tgtY - curY) * k;
      const convergido =
        Math.abs(tgtX - curX) <= MONITOR.EPSILON && Math.abs(tgtY - curY) <= MONITOR.EPSILON;
      if (convergido && !buscando) {
        curX = tgtX;
        curY = tgtY;
        running = false;
      } else {
        // Buscando, el target se mueve solo: el loop no se auto-detiene.
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

    // Espeja la forma del cursor real: hit-test cacheado por elemento (el
    // costo real es ~0: los browsers hacen este mismo hit-test por evento).
    let ultimoElemento: Element | null = null;
    const espejarFormaCursor = (x: number, y: number) => {
      const cursor = cursorRef.current;
      if (!cursor) return;
      const el = document.elementFromPoint(x, y);
      if (!el || el === ultimoElemento) return;
      ultimoElemento = el;
      const enCampoDeTexto = el.closest("input, textarea, [contenteditable]") !== null;
      cursor.dataset.tipo = clasificarCursor(
        getComputedStyle(el).cursor,
        el.tagName,
        enCampoDeTexto
      );
    };

    const entrarEnBusqueda = () => {
      if (buscando) return;
      buscando = true;
      inicioBusqueda = performance.now();
      holder.dataset.buscando = "1";
      if (cursorRef.current) cursorRef.current.dataset.tipo = "oculto";
      ultimoElemento = null;
      // La cámara del header acompaña el barrido (mismo seno, mismo reloj).
      window.dispatchEvent(
        new CustomEvent(EVENTO_BUSQUEDA, { detail: { activa: true, inicio: inicioBusqueda } })
      );
      kick();
    };

    const salirDeBusqueda = () => {
      if (!buscando) return;
      buscando = false;
      delete holder.dataset.buscando;
      window.dispatchEvent(new CustomEvent(EVENTO_BUSQUEDA, { detail: { activa: false } }));
    };

    const onMove = (e: MouseEvent) => {
      lastClientX = e.clientX;
      lastClientY = e.clientY;
      if (e.clientY <= MONITOR.ESCAPE_Y) {
        // "Se escapó por arriba": fuera del campo visual de la cámara.
        entrarEnBusqueda();
        return;
      }
      salirDeBusqueda();
      retarget();
      kick();
      espejarFormaCursor(e.clientX, e.clientY);
    };

    // Si el mouse sale de la ventana, la cámara también lo pierde.
    const onLeave = () => entrarEnBusqueda();

    const onScroll = () => {
      if (buscando) return; // el barrido ya sigue al scroll frame a frame
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
      document.documentElement.addEventListener("mouseleave", onLeave);
      window.addEventListener("scroll", onScroll, { passive: true });
      document.addEventListener("visibilitychange", onVisibility);
    };

    const detachFollow = () => {
      document.removeEventListener("mousemove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibility);
      cancelAnimationFrame(raf);
      running = false;
      salirDeBusqueda();
      ultimoElemento = null;
      if (cursorRef.current) cursorRef.current.dataset.tipo = "default";
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
      className="pointer-events-none absolute left-3 top-1/2 hidden -translate-y-1/2 select-none 2xl:block"
    >
      <div className="cctv-monitor">
        <div
          className="cctv-screen"
          style={{ width: MONITOR.SCREEN_W, height: MONITOR.SCREEN_H }}
        >
          <div ref={holderRef} className="cctv-clone" data-cctv-clone />
          <div className="cctv-overlay cctv-scanlines" />
          <div className="cctv-overlay cctv-vignette" />
          {/* El "mouse grabado": adopta la forma del cursor real (flecha /
              manito / I-beam vía data-tipo) y su transform (desvío por lag de
              captura) se muta por ref. */}
          <div
            ref={cursorRef}
            className="cctv-overlay cctv-cursor"
            data-cctv-cursor
            data-tipo="default"
          >
            <CursorFlechaWin className="cctv-cursor-default" />
            <CursorManitoWin className="cctv-cursor-pointer" />
            <CursorTextoWin className="cctv-cursor-text" />
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

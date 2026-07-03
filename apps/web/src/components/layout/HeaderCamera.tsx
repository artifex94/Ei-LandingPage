"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { CAM, CAM_REST_DEG, CAM_WALL_SHIFT_X } from "@/lib/ui/headerCamera";
import { EVENTO_BUSQUEDA, calcularPuntoBusquedaViewport } from "@/lib/ui/headerMonitor";

const DEG = 180 / Math.PI;

/**
 * Cámara de vigilancia decorativa colgada del header (solo desktop): sigue al
 * cursor con la mirada y dispara un flash de LED al frente en cada click,
 * como si registrara una foto. 100% decorativa: aria-hidden y
 * pointer-events-none, no intercepta nada.
 *
 * El seguimiento vive fuera de React: refs + mutación directa de
 * style.transform en un rAF que se auto-detiene al converger. El transform
 * declarado en el JSX es solo la pose de reposo del SSR y nunca cambia de
 * valor, así React no pisa la mutación imperativa en los re-renders del flash.
 */
export default function HeaderCamera() {
  const bodyRef = useRef<HTMLDivElement>(null);
  const carrierRef = useRef<HTMLDivElement>(null);
  // Luz de captura: prende instantánea al presionar (pointerdown), se
  // mantiene mientras el botón esté presionado y se desvanece al soltar.
  const [pressed, setPressed] = useState(false);
  // Al tope de la página el nav no tiene línea inferior: la cámara se sujeta
  // de la pared izquierda de la ventana. Con la línea dura visible (scrollY >
  // SCROLL_UMBRAL, mismo umbral del Navbar) cuelga de ella. SSR asume tope.
  const [wall, setWall] = useState(true);

  useEffect(() => {
    const body = bodyRef.current;
    const carrier = carrierRef.current;
    if (!body || !carrier) return;

    const desktop = window.matchMedia("(min-width: 1024px) and (pointer: fine)");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

    let raf = 0;
    let running = false;
    let measureScheduled = false;
    let cur = CAM_REST_DEG;
    let target = CAM_REST_DEG;
    let pivot = { x: 0, y: 0 };
    let idleTimer: ReturnType<typeof setTimeout> | undefined;
    let attached = false;

    const measure = () => {
      const rect = body.getBoundingClientRect();
      pivot = {
        x: rect.left + rect.width * CAM.PIVOT.x,
        y: rect.top + rect.height * CAM.PIVOT.y,
      };
    };

    const scheduleMeasure = () => {
      if (measureScheduled) return;
      measureScheduled = true;
      requestAnimationFrame(() => {
        measureScheduled = false;
        measure();
      });
    };

    let lastFrame = 0;

    // Cuando el monitor entra en modo búsqueda, la cámara acompaña el barrido
    // apuntando al mismo punto de mira (mismo seno, mismo reloj → en fase).
    let busca = false;
    let buscaInicio = 0;

    const loop = (now: number) => {
      if (busca) {
        const p = calcularPuntoBusquedaViewport(
          now - buscaInicio,
          window.innerWidth,
          window.innerHeight
        );
        const aim = Math.atan2(p.y - pivot.y, p.x - pivot.x) * DEG;
        target = Math.min(CAM.AIM_MAX, Math.max(CAM.AIM_MIN, aim)) - CAM.A0;
      }
      // Suavizado exponencial en tiempo real: mismo ritmo a cualquier fps.
      const dt = lastFrame ? Math.min(now - lastFrame, 100) : 16.7;
      lastFrame = now;
      cur += (target - cur) * (1 - Math.exp(-dt / CAM.TAU_MS));
      if (Math.abs(target - cur) <= CAM.EPSILON && !busca) {
        cur = target;
        running = false;
      } else {
        // Buscando, el punto de mira se mueve solo: el loop sigue vivo.
        raf = requestAnimationFrame(loop);
      }
      body.style.transform = `rotate(${cur}deg)`;
    };

    const kick = () => {
      if (!running) {
        running = true;
        lastFrame = 0;
        raf = requestAnimationFrame(loop);
      }
    };

    const reposo = () => {
      target = CAM_REST_DEG;
      kick();
    };

    const onMove = (e: MouseEvent) => {
      // En búsqueda el barrido manda; el monitor avisa cuándo se reencuentra
      // (su listener corre antes: se monta primero en el Navbar).
      if (busca) return;
      const aim = Math.atan2(e.clientY - pivot.y, e.clientX - pivot.x) * DEG;
      target = Math.min(CAM.AIM_MAX, Math.max(CAM.AIM_MIN, aim)) - CAM.A0;
      kick();
      clearTimeout(idleTimer);
      idleTimer = setTimeout(reposo, CAM.IDLE_MS);
    };

    const onDown = () => {
      if (reduce.matches) return;
      setPressed(true);
    };

    const onUp = () => setPressed(false);

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        running = false;
      } else {
        measure();
        kick();
      }
    };

    const onBusqueda = (e: Event) => {
      const detail = (e as CustomEvent<{ activa: boolean; inicio?: number }>).detail;
      busca = !!detail?.activa;
      if (busca) {
        buscaInicio = detail.inicio ?? performance.now();
        clearTimeout(idleTimer);
        kick();
      }
    };

    // ── Grupo seguimiento (mouse): desktop && sin reduced-motion ────────────
    const attach = () => {
      measure();
      body.dataset.camActive = "1";
      document.addEventListener("mousemove", onMove, { passive: true });
      document.addEventListener("pointerdown", onDown, { passive: true });
      document.addEventListener("pointerup", onUp, { passive: true });
      document.addEventListener("pointercancel", onUp);
      window.addEventListener("blur", onUp);
      document.documentElement.addEventListener("mouseleave", reposo);
      document.addEventListener("visibilitychange", onVisibility);
      window.addEventListener("resize", scheduleMeasure);
      window.addEventListener("scroll", scheduleMeasure, { passive: true });
      window.addEventListener(EVENTO_BUSQUEDA, onBusqueda);
      // El pivote se corre al re-asentarse el soporte (pared ↔ techo).
      carrier.addEventListener("transitionend", measure);
    };

    const detach = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
      window.removeEventListener("blur", onUp);
      document.documentElement.removeEventListener("mouseleave", reposo);
      setPressed(false);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", scheduleMeasure);
      window.removeEventListener("scroll", scheduleMeasure);
      window.removeEventListener(EVENTO_BUSQUEDA, onBusqueda);
      carrier.removeEventListener("transitionend", measure);
      clearTimeout(idleTimer);
      cancelAnimationFrame(raf);
      running = false;
      busca = false;
      cur = target = CAM_REST_DEG;
      body.style.transform = `rotate(${CAM_REST_DEG}deg)`;
      delete body.dataset.camActive;
    };

    // ── Grupo anclaje (pared ↔ techo): solo desktop — es corrección de
    // layout, corre también bajo reduced-motion (re-asiento instantáneo). ───
    const onScrollAnclaje = () => setWall(window.scrollY <= CAM.SCROLL_UMBRAL);

    const attachAnclaje = () => {
      onScrollAnclaje();
      window.addEventListener("scroll", onScrollAnclaje, { passive: true });
    };

    const detachAnclaje = () => {
      window.removeEventListener("scroll", onScrollAnclaje);
    };

    let anclado = false;

    const sync = () => {
      const enDesktop = desktop.matches;
      const conSeguimiento = enDesktop && !reduce.matches;
      if (enDesktop && !anclado) {
        anclado = true;
        attachAnclaje();
      } else if (!enDesktop && anclado) {
        anclado = false;
        detachAnclaje();
      }
      if (conSeguimiento && !attached) {
        attached = true;
        attach();
      } else if (!conSeguimiento && attached) {
        attached = false;
        detach();
      }
    };

    sync();
    desktop.addEventListener("change", sync);
    reduce.addEventListener("change", sync);
    return () => {
      desktop.removeEventListener("change", sync);
      reduce.removeEventListener("change", sync);
      if (anclado) {
        anclado = false;
        detachAnclaje();
      }
      if (attached) {
        attached = false;
        detach();
      }
    };
  }, []);

  const ledStyle = {
    left: `${CAM.LENS_FRONT.x * 100}%`,
    top: `${CAM.LENS_FRONT.y * 100}%`,
    // Dirección del haz en convención conic (0 = arriba, + horario): el
    // barril del asset apunta A0 grados bajo la horizontal derecha.
    "--cam-beam-dir": `${90 + CAM.A0}deg`,
  } as CSSProperties;

  const luz = pressed ? " cam-on" : "";

  const seatTransition = `transform ${CAM.SEAT_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`;

  return (
    <div
      aria-hidden="true"
      data-flash={pressed ? "1" : "0"}
      className="pointer-events-none absolute left-3 top-full hidden select-none lg:block"
    >
      <div
        ref={carrierRef}
        data-cam-wall={wall ? "1" : "0"}
        style={{
          transform: wall ? `translateX(${CAM_WALL_SHIFT_X}px)` : "translateX(0px)",
          transition: seatTransition,
        }}
      >
        <div className="relative" style={{ width: CAM.RENDER_W, height: CAM.RENDER_W }}>
          <div
            data-cam-mount
            className="absolute inset-0"
            style={{
              transform: wall ? "rotate(-90deg)" : "rotate(0deg)",
              transformOrigin: `${CAM.PIVOT.x * 100}% ${CAM.PIVOT.y * 100}%`,
              transition: seatTransition,
            }}
          >
            <Image
              src="/images/cctv-layers/cam-mount.svg"
              alt=""
              width={CAM.RENDER_W}
              height={CAM.RENDER_W}
              unoptimized
              className="absolute inset-0"
            />
          </div>
          <div
            ref={bodyRef}
            data-cam-body
            className="absolute inset-0"
            style={{
              transform: `rotate(${CAM_REST_DEG}deg)`,
              transformOrigin: `${CAM.PIVOT.x * 100}% ${CAM.PIVOT.y * 100}%`,
            }}
          >
            <Image
              src="/images/cctv-layers/cam-body.svg"
              alt=""
              width={CAM.RENDER_W}
              height={CAM.RENDER_W}
              unoptimized
              className="absolute inset-0"
            />
            <span className={`cam-flash${luz}`} style={ledStyle} />
            <span className={`cam-led${luz}`} style={ledStyle} />
          </div>
        </div>
      </div>
    </div>
  );
}

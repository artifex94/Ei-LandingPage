"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { CAM, CAM_REST_DEG } from "@/lib/ui/headerCamera";

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
  const [flashKey, setFlashKey] = useState(0);

  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;

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

    const loop = (now: number) => {
      // Suavizado exponencial en tiempo real: mismo ritmo a cualquier fps.
      const dt = lastFrame ? Math.min(now - lastFrame, 100) : 16.7;
      lastFrame = now;
      cur += (target - cur) * (1 - Math.exp(-dt / CAM.TAU_MS));
      if (Math.abs(target - cur) <= CAM.EPSILON) {
        cur = target;
        running = false;
      } else {
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
      const aim = Math.atan2(e.clientY - pivot.y, e.clientX - pivot.x) * DEG;
      target = Math.min(CAM.AIM_MAX, Math.max(CAM.AIM_MIN, aim)) - CAM.A0;
      kick();
      clearTimeout(idleTimer);
      idleTimer = setTimeout(reposo, CAM.IDLE_MS);
    };

    const onClick = () => {
      if (reduce.matches) return;
      setFlashKey((k) => k + 1);
    };

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        running = false;
      } else {
        measure();
        kick();
      }
    };

    const attach = () => {
      measure();
      body.dataset.camActive = "1";
      document.addEventListener("mousemove", onMove, { passive: true });
      document.addEventListener("click", onClick);
      document.documentElement.addEventListener("mouseleave", reposo);
      document.addEventListener("visibilitychange", onVisibility);
      window.addEventListener("resize", scheduleMeasure);
      window.addEventListener("scroll", scheduleMeasure, { passive: true });
    };

    const detach = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("click", onClick);
      document.documentElement.removeEventListener("mouseleave", reposo);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", scheduleMeasure);
      window.removeEventListener("scroll", scheduleMeasure);
      clearTimeout(idleTimer);
      cancelAnimationFrame(raf);
      running = false;
      cur = target = CAM_REST_DEG;
      body.style.transform = `rotate(${CAM_REST_DEG}deg)`;
      delete body.dataset.camActive;
    };

    const sync = () => {
      const activa = desktop.matches && !reduce.matches;
      if (activa && !attached) {
        attached = true;
        attach();
      } else if (!activa && attached) {
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
      if (attached) {
        attached = false;
        detach();
      }
    };
  }, []);

  const ledStyle = {
    left: `${CAM.LENS_FRONT.x * 100}%`,
    top: `${CAM.LENS_FRONT.y * 100}%`,
    animationDuration: `${CAM.FLASH_MS}ms`,
  };

  return (
    <div
      aria-hidden="true"
      data-flash={flashKey}
      className="pointer-events-none absolute left-3 top-full hidden select-none lg:block"
    >
      <div className="relative" style={{ width: CAM.RENDER_W, height: CAM.RENDER_W }}>
        <Image
          src="/images/cctv-layers/cam-mount.svg"
          alt=""
          width={CAM.RENDER_W}
          height={CAM.RENDER_W}
          unoptimized
          className="absolute inset-0"
        />
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
          {flashKey > 0 && (
            <>
              <span key={`flash-${flashKey}`} className="cam-flash" style={ledStyle} />
              <span key={`led-${flashKey}`} className="cam-led-on" style={ledStyle} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

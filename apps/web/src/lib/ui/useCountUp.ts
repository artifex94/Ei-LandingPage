"use client";

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";

// useLayoutEffect dispara warning al renderizar en el server; alias SSR-safe.
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export interface UseCountUpResult<T extends HTMLElement> {
  ref: RefObject<T | null>;
  value: number;
  done: boolean;
}

/**
 * Anima un número de 0 al valor final con requestAnimationFrame al entrar en
 * viewport, una sola vez. El SSR y el primer render del cliente muestran el
 * valor final (sin hydration mismatch, número real en el HTML para SEO y
 * lectores de pantalla); el reset a 0 ocurre en un layout effect antes del
 * paint, así el valor final nunca "flashea" arriba del fold.
 * Con prefers-reduced-motion: reduce no anima.
 */
export function useCountUp<T extends HTMLElement>(
  to: number,
  durationMs = 1400
): UseCountUpResult<T> {
  const ref = useRef<T>(null);
  const [value, setValue] = useState(() => to);
  const [done, setDone] = useState(false);
  const doneRef = useRef(false);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el || doneRef.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frameId = 0;

    const run = () => {
      setValue(0);
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min((now - start) / durationMs, 1);
        setValue(Math.round(to * easeOutCubic(t)));
        if (t < 1) {
          frameId = requestAnimationFrame(tick);
        } else {
          doneRef.current = true;
          setDone(true);
        }
      };
      frameId = requestAnimationFrame(tick);
    };

    const rect = el.getBoundingClientRect();
    const enViewport = rect.top < window.innerHeight && rect.bottom > 0;
    let observer: IntersectionObserver | undefined;

    if (enViewport) {
      run();
    } else {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            observer?.disconnect();
            run();
          }
        },
        { threshold: 0.4 }
      );
      observer.observe(el);
    }

    return () => {
      cancelAnimationFrame(frameId);
      observer?.disconnect();
      // Si StrictMode desmonta a mitad de animación, el próximo effect reinicia
      // desde 0 (doneRef sigue false); si ya terminó, no vuelve a animar.
      if (!doneRef.current) setValue(to);
    };
  }, [to, durationMs]);

  return { ref, value, done };
}

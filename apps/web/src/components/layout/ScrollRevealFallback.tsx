"use client";

import { useEffect } from "react";

/**
 * Fallback para navegadores sin CSS scroll-driven animations
 * (animation-timeline: view()): un IntersectionObserver agrega .in-view a los
 * .reveal-on-scroll / .reveal-item para que transicionen igual. El CSS de
 * .in-view vive bajo @supports not (...), así que en navegadores con soporte
 * nativo este componente no hace nada y no hay doble animación.
 */
export default function ScrollRevealFallback() {
  useEffect(() => {
    if (typeof CSS !== "undefined" && CSS.supports("animation-timeline: view()")) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const elements = document.querySelectorAll<HTMLElement>(".reveal-on-scroll, .reveal-item");
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px" }
    );
    for (const el of elements) observer.observe(el);

    return () => observer.disconnect();
  }, []);

  return null;
}

// Cursores estilo Windows clásico para el monitor CCTV, recreados como SVG
// (no se embeben los .cur originales de Microsoft: son assets con copyright;
// la silueta clásica del cursor es genérica y acá está redibujada).
// Cada forma es el mismo path dos veces: contorno oscuro debajo + cuerpo
// blanco encima, el esquema visual del set clásico de Windows.

interface CursorProps {
  className?: string;
}

/** Flecha estándar (hotspot: punta, en 0,0 del viewBox). */
export function CursorFlechaWin({ className }: CursorProps) {
  const d = "M1 0.5 L1 12.5 L4.2 9.8 L6.1 14.3 L8.5 13.3 L6.5 8.9 L10.6 8.6 Z";
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
      <path d={d} fill="#0f172a" stroke="#0f172a" strokeWidth="2.2" strokeLinejoin="round" />
      <path d={d} fill="#f8fafc" />
    </svg>
  );
}

/** Manito de link (hotspot: yema del índice, arriba al centro-izquierda). */
export function CursorManitoWin({ className }: CursorProps) {
  const d =
    "M5.2 1.6 c0-1 1.7-1 1.7 0 V6.2 l0.5 0.1 V3.9 c0-1 1.7-1 1.7 0 v2.6 l0.5 0.1 V4.9 c0-0.9 1.6-0.9 1.6 0 V7 l0.5 0.1 V5.9 c0-0.9 1.5-0.9 1.5 0 V9.6 c0 3.1-1.9 4.9-4.5 4.9 c-2 0-3.2-0.9-4.2-2.6 L2.7 9.2 c-0.6-1 0.7-2 1.5-1.1 l1 1.2 Z";
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
      <path d={d} fill="#0f172a" stroke="#0f172a" strokeWidth="2" strokeLinejoin="round" />
      <path d={d} fill="#f8fafc" />
    </svg>
  );
}

/** I-beam de texto (hotspot: centro). */
export function CursorTextoWin({ className }: CursorProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
      <g stroke="#0f172a" strokeWidth="3.2" strokeLinecap="round">
        <path d="M5.5 1.5 h5 M8 1.5 v13 M5.5 14.5 h5" fill="none" />
      </g>
      <g stroke="#f8fafc" strokeWidth="1.3" strokeLinecap="round">
        <path d="M5.5 1.5 h5 M8 1.5 v13 M5.5 14.5 h5" fill="none" />
      </g>
    </svg>
  );
}

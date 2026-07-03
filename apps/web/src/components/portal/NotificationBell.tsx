"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  Bell, AlertTriangle, AlertCircle, Info, CheckCircle2, X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { fechaRelativaAR } from "@/lib/fecha-ar";
import type { NotificacionItem, SeveridadFeed } from "@/lib/notificaciones-feed";

const STORAGE_KEY = "micentral:notif:lastSeenAt";

// `lastSeenAt` vive en localStorage tratado como store externo: así se lee sin
// setState-en-effect, se comparte entre las dos instancias de la campana
// (desktop/mobile) y reacciona a escrituras locales y entre pestañas.
const notifStore = new EventTarget();

function leerLastSeen(): number {
  if (typeof window === "undefined") return 0;
  return Number(localStorage.getItem(STORAGE_KEY) ?? 0);
}

function escribirLastSeen(value: number) {
  localStorage.setItem(STORAGE_KEY, String(value));
  notifStore.dispatchEvent(new Event("change"));
}

function subscribeLastSeen(cb: () => void) {
  notifStore.addEventListener("change", cb);
  window.addEventListener("storage", cb);
  return () => {
    notifStore.removeEventListener("change", cb);
    window.removeEventListener("storage", cb);
  };
}

const ICONO_SEVERIDAD: Record<SeveridadFeed, LucideIcon> = {
  critico: AlertTriangle,
  alerta: AlertCircle,
  info: Info,
  exito: CheckCircle2,
};

const COLOR_SEVERIDAD: Record<SeveridadFeed, string> = {
  critico: "text-red-400",
  alerta: "text-tactical-400",
  info: "text-blue-400",
  exito: "text-emerald-400",
};

type Variant = "desktop" | "mobile";

interface NotificationBellProps {
  items: NotificacionItem[];
  variant: Variant;
}

export function NotificationBell({ items, variant }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [marcado, setMarcado] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const botonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  // Snapshot del servidor = null → el badge no se pinta en SSR y se calcula
  // recién tras hidratar, sin mismatch (el server no conoce localStorage).
  const lastSeenRaw = useSyncExternalStore(subscribeLastSeen, leerLastSeen, () => null);
  const hydrated = lastSeenRaw !== null;
  const lastSeen = lastSeenRaw ?? 0;

  // Items "nuevos" (excluye pinned: su fecha es siempre `now`).
  const nuevos = items.filter((i) => !i.pinned && i.fecha > lastSeen).length;
  const badge = hydrated && !marcado ? nuevos : 0;
  const hayMora = items.some((i) => i.id === "fin:grace");

  function abrir() {
    setOpen(true);
    setMarcado(true); // el badge baja a 0; los dots siguen visibles hasta cerrar
  }

  function cerrar() {
    setOpen(false);
    escribirLastSeen(Date.now()); // limpia los dots para la próxima apertura
  }

  function marcarTodasLeidas() {
    escribirLastSeen(Date.now());
    setMarcado(true);
  }

  // Cerrar con click afuera (desktop: el panel vive dentro del wrapper).
  useEffect(() => {
    if (!open || variant !== "desktop") return;
    function onDown(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        cerrar();
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, variant]);

  // Escape cierra; mover foco al panel al abrir y de vuelta al botón al cerrar.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        cerrar();
        botonRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const Boton = (
    <button
      ref={botonRef}
      type="button"
      onClick={() => (open ? cerrar() : abrir())}
      aria-label={badge > 0 ? `Notificaciones, ${badge} nuevas` : "Notificaciones"}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-controls={open ? panelId : undefined}
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-tactical-500/60"
    >
      <Bell
        className={`h-5 w-5 ${hayMora ? "text-tactical-400" : ""}`}
        strokeWidth={1.9}
        aria-hidden="true"
      />
      {badge > 0 && (
        <span
          aria-hidden="true"
          className={`absolute -top-0.5 -right-0.5 min-w-[18px] rounded-full px-1.5 py-0.5 text-center text-[11px] font-bold leading-none text-white ${
            hayMora ? "bg-tactical-500" : "bg-red-500"
          }`}
        >
          {badge > 99 ? "99+" : badge}
        </span>
      )}
      {/* Anuncio para lectores de pantalla sin robar foco. */}
      <span aria-live="polite" className="sr-only">
        {badge > 0 ? `${badge} notificaciones nuevas` : ""}
      </span>
    </button>
  );

  const Cabecera = (
    <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
      <h2 className="text-sm font-bold text-white">Notificaciones</h2>
      <div className="flex items-center gap-2">
        {badge > 0 && (
          <button
            type="button"
            onClick={marcarTodasLeidas}
            className="text-xs font-semibold text-tactical-400 transition-colors hover:text-tactical-300"
          >
            Marcar todas como leídas
          </button>
        )}
        {variant === "mobile" && (
          <button
            type="button"
            onClick={cerrar}
            aria-label="Cerrar notificaciones"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-white/[0.06] hover:text-white"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );

  const Lista =
    items.length === 0 ? (
      <EmptyState
        icon={Bell}
        title="No tenés notificaciones"
        description="Acá vas a ver los avisos de tu servicio y tu cuenta."
        className="border-0 bg-transparent px-4 py-10"
      />
    ) : (
      <ul role="list" className="divide-y divide-white/5 overflow-y-auto max-h-[60vh] lg:max-h-96">
        {items.map((item) => (
          <FeedItemRow
            key={item.id}
            item={item}
            esNuevo={item.pinned ? true : item.fecha > lastSeen}
            onNavegar={cerrar}
          />
        ))}
      </ul>
    );

  const Panel = (
    <div
      ref={panelRef}
      id={panelId}
      role="dialog"
      aria-label="Notificaciones"
      tabIndex={-1}
      className={
        variant === "desktop"
          ? "absolute right-0 top-full z-40 mt-2 w-96 overflow-hidden rounded-xl border border-white/10 bg-industrial-900 shadow-2xl focus:outline-none"
          : "fixed left-0 right-0 top-14 z-40 max-h-[80vh] overflow-hidden border-b border-white/10 bg-industrial-900 shadow-2xl focus:outline-none"
      }
    >
      {Cabecera}
      {Lista}
    </div>
  );

  if (variant === "mobile") {
    return (
      <>
        {Boton}
        {open && (
          <>
            <div
              className="fixed inset-x-0 bottom-0 top-14 z-30 bg-black/50"
              aria-hidden="true"
              onClick={cerrar}
            />
            {Panel}
          </>
        )}
      </>
    );
  }

  return (
    <div ref={wrapperRef} className="relative">
      {Boton}
      {open && Panel}
    </div>
  );
}

// ── Fila de notificación ───────────────────────────────────────────────────────

function FeedItemRow({
  item,
  esNuevo,
  onNavegar,
}: {
  item: NotificacionItem;
  esNuevo: boolean;
  onNavegar: () => void;
}) {
  const Icono = ICONO_SEVERIDAD[item.severidad];

  const contenido = (
    <>
      <Icono
        className={`mt-0.5 h-4 w-4 flex-shrink-0 ${COLOR_SEVERIDAD[item.severidad]}`}
        strokeWidth={2}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-snug text-white">{item.titulo}</p>
        {item.detalle && (
          <p className="mt-0.5 line-clamp-2 text-xs text-slate-400">{item.detalle}</p>
        )}
        <p className="mt-1 text-[11px] text-slate-500">{fechaRelativaAR(item.fecha)}</p>
      </div>
      {esNuevo && (
        <span className="mt-1.5 flex-shrink-0">
          <span className="block h-2 w-2 rounded-full bg-tactical-500" aria-hidden="true" />
          <span className="sr-only">Nuevo</span>
        </span>
      )}
    </>
  );

  const base = `flex gap-3 px-4 py-3 ${
    item.pinned ? "border-l-2 border-tactical-500 bg-tactical-500/[0.06]" : ""
  }`;

  if (item.href) {
    return (
      <li>
        <Link
          href={item.href}
          onClick={onNavegar}
          className={`${base} transition-colors hover:bg-white/[0.04]`}
        >
          {contenido}
        </Link>
      </li>
    );
  }

  return <li className={base}>{contenido}</li>;
}

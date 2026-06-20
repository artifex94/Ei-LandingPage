/** Transición breve por ruta: confirma el cambio de contexto sin bloquear interacción. */
export default function PortalTemplate({ children }: { children: React.ReactNode }) {
  return <div className="portal-page-enter">{children}</div>;
}

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma/client";
import { createHmac } from "crypto";

export const metadata = { robots: "noindex, nofollow" };

// Verifica firma HMAC del token de un solo uso: `token = HMAC(secret, ref:ts)`
function verificarToken(ref: string, token: string | null): boolean {
  if (!token) return false;
  const secret = process.env.SOFTGUARD_EMBED_SECRET;
  if (!secret) return false;

  const [tsStr, sig] = token.split(".");
  if (!tsStr || !sig) return false;

  const ts = parseInt(tsStr, 10);
  if (isNaN(ts)) return false;

  // Token válido por 5 minutos
  const ahora = Math.floor(Date.now() / 1000);
  if (ahora - ts > 300) return false;

  const expected = createHmac("sha256", secret)
    .update(`${ref}:${tsStr}`)
    .digest("hex");

  return sig === expected;
}

export default async function EmbedCuentaPage({
  params,
  searchParams,
}: {
  params: Promise<{ softguard_ref: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { softguard_ref } = await params;
  const { token } = await searchParams;

  if (!verificarToken(softguard_ref, token ?? null)) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-red-400 font-bold">Acceso no autorizado</p>
          <p className="text-slate-500 text-sm mt-1">El token es inválido o expiró. Abrí de nuevo desde DSS.</p>
        </div>
      </div>
    );
  }

  const cuenta = await prisma.cuenta.findUnique({
    where: { softguard_ref },
    include: {
      perfil: true,
      pagos: {
        where: { estado: { in: ["PENDIENTE", "VENCIDO"] } },
        orderBy: [{ anio: "asc" }, { mes: "asc" }],
        take: 5,
      },
      ordenes_trabajo: {
        where: { estado: { notIn: ["COMPLETADA", "CANCELADA"] } },
        orderBy: { created_at: "desc" },
        take: 5,
      },
    },
  });

  if (!cuenta) notFound();

  const deudaTotal = cuenta.pagos.reduce((s, p) => s + Number(p.importe), 0);
  const MESES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  const ESTADO_OT: Record<string, string> = {
    SOLICITADA: "Solicitada", ASIGNADA: "Asignada",
    EN_RUTA: "En ruta", EN_SITIO: "En sitio",
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 space-y-4 text-sm">
      {/* Header compacto */}
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 bg-orange-700 rounded-md flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
          EI
        </div>
        <div>
          <p className="font-bold text-white leading-tight">{cuenta.perfil.nombre}</p>
          <p className="text-slate-400 text-xs">{cuenta.descripcion} · Ref. {cuenta.softguard_ref}</p>
        </div>
        <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
          cuenta.estado === "ACTIVA" ? "bg-emerald-500/20 text-emerald-300" :
          cuenta.estado === "SUSPENDIDA_PAGO" ? "bg-red-500/20 text-red-400" :
          "bg-slate-700 text-slate-400"
        }`}>
          {cuenta.estado.replace("_", " ")}
        </span>
      </div>

      {/* Contacto */}
      <div className="rounded-lg bg-slate-900 border border-slate-800 p-3 space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Contacto</p>
        {cuenta.perfil.telefono && (
          <a href={`https://wa.me/549${cuenta.perfil.telefono.replace(/\D/g, "")}`}
            target="_blank" rel="noopener noreferrer"
            className="block text-emerald-400 text-xs">
            WhatsApp {cuenta.perfil.telefono}
          </a>
        )}
        {cuenta.perfil.email && (
          <p className="text-slate-400 text-xs">{cuenta.perfil.email}</p>
        )}
        {cuenta.calle && (
          <p className="text-slate-400 text-xs">{cuenta.calle}, {cuenta.localidad}</p>
        )}
      </div>

      {/* Deuda */}
      {cuenta.pagos.length > 0 ? (
        <div className="rounded-lg bg-red-900/30 border border-red-700/50 p-3 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-red-400">
            Deuda: ${deudaTotal.toLocaleString("es-AR")}
          </p>
          {cuenta.pagos.map((p) => (
            <p key={p.id} className="text-xs text-red-300">
              {MESES[p.mes - 1]} {p.anio} — ${Number(p.importe).toLocaleString("es-AR")}
              {p.estado === "VENCIDO" ? " (vencido)" : ""}
            </p>
          ))}
        </div>
      ) : (
        <div className="rounded-lg bg-emerald-900/20 border border-emerald-700/40 p-3">
          <p className="text-xs text-emerald-400">Al día con los pagos</p>
        </div>
      )}

      {/* OTs abiertas */}
      {cuenta.ordenes_trabajo.length > 0 && (
        <div className="rounded-lg bg-slate-900 border border-slate-800 p-3 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">OTs abiertas</p>
          {cuenta.ordenes_trabajo.map((ot) => (
            <div key={ot.id} className="flex items-center justify-between gap-2">
              <p className="text-xs text-white line-clamp-1">{ot.descripcion}</p>
              <span className="text-[10px] text-slate-400 flex-shrink-0">{ESTADO_OT[ot.estado] ?? ot.estado}</span>
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-slate-700 text-center pt-2">
        Escobar Instalaciones — iframe DSS
      </p>
    </div>
  );
}

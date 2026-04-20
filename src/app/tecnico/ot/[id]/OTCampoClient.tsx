"use client";

import { useState, useTransition, useRef } from "react";
import Link from "next/link";
import { cambiarEstadoOT, registrarGPS, subirFotosOT, guardarFirmaCliente } from "@/lib/actions/ot";
import type { EstadoOT } from "@/generated/prisma/client";

const TIPO_LABEL: Record<string, string> = {
  INSTALACION: "Instalación", CORRECTIVO: "Correctivo",
  PREVENTIVO: "Preventivo",   RETIRO: "Retiro",
};

type OTData = {
  id: string; numero: number; tipo: string; descripcion: string;
  estado: string; fecha_visita: string | null; notas_admin: string | null;
  hora_salida: string | null; hora_llegada: string | null; hora_fin: string | null;
  conformidad_firmada: boolean; firma_cliente_url: string | null; fotos: string[];
  clienteNombre: string; clienteTelefono: string | null; direccion: string | null;
};

export function OTCampoClient({ ot: otInicial }: { ot: OTData }) {
  const [ot, setOt] = useState(otInicial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [firmando, setFirmando] = useState(false);
  const [notasTecnico, setNotasTecnico] = useState("");
  const [kmFinal, setKmFinal] = useState("");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dibujando = useRef(false);

  // GPS helper
  function obtenerGPS(): Promise<{ lat: number; lng: number }> {
    return new Promise((res, rej) =>
      navigator.geolocation.getCurrentPosition(
        (p) => res({ lat: p.coords.latitude, lng: p.coords.longitude }),
        (e) => rej(new Error(`GPS no disponible: ${e.message}`)),
        { enableHighAccuracy: true, timeout: 10000 }
      )
    );
  }

  function avanzarEstado(nuevoEstado: EstadoOT) {
    setError(null);
    startTransition(async () => {
      try {
        // Capturar GPS antes de cambiar estado si aplica
        if (nuevoEstado === "EN_RUTA" || nuevoEstado === "EN_SITIO" || nuevoEstado === "COMPLETADA") {
          try {
            const { lat, lng } = await obtenerGPS();
            const tipo =
              nuevoEstado === "EN_RUTA"    ? "salida" :
              nuevoEstado === "EN_SITIO"   ? "checkin" : "checkout";
            await registrarGPS(ot.id, tipo, lat, lng);
          } catch {
            // GPS es best-effort — no bloquear el flujo
          }
        }

        await cambiarEstadoOT(ot.id, nuevoEstado, {
          notas_tecnico: notasTecnico || undefined,
          km_final: kmFinal ? parseInt(kmFinal, 10) : undefined,
        });

        setOt((prev) => ({
          ...prev,
          estado: nuevoEstado,
          hora_salida:   nuevoEstado === "EN_RUTA"    ? new Date().toISOString() : prev.hora_salida,
          hora_llegada:  nuevoEstado === "EN_SITIO"   ? new Date().toISOString() : prev.hora_llegada,
          hora_fin:      nuevoEstado === "COMPLETADA" ? new Date().toISOString() : prev.hora_fin,
        }));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error desconocido");
      }
    });
  }

  function handleFotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append("fotos", f));
    startTransition(async () => {
      try {
        const nuevas = await subirFotosOT(ot.id, fd);
        setOt((prev) => ({ ...prev, fotos: [...prev.fotos, ...nuevas] }));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error subiendo fotos");
      }
    });
    e.target.value = "";
  }

  // Canvas firma
  function iniciarTrazo(e: React.PointerEvent<HTMLCanvasElement>) {
    dibujando.current = true;
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d")!;
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  }

  function trazar(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!dibujando.current) return;
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d")!;
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#1e293b";
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  }

  function finTrazo() { dibujando.current = false; }

  function limpiarFirma() {
    const canvas = canvasRef.current!;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
  }

  function confirmarFirma() {
    const canvas = canvasRef.current!;
    const dataUrl = canvas.toDataURL("image/png");
    startTransition(async () => {
      try {
        const url = await guardarFirmaCliente(ot.id, dataUrl);
        setOt((prev) => ({ ...prev, firma_cliente_url: url, conformidad_firmada: true }));
        setFirmando(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error guardando firma");
      }
    });
  }

  const completada = ot.estado === "COMPLETADA" || ot.estado === "CANCELADA";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/tecnico" className="text-slate-400 hover:text-white mt-1">←</Link>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-500">#{String(ot.numero).padStart(4, "0")}</span>
            <span className="text-xs text-slate-400 bg-slate-700 px-2 py-0.5 rounded">{TIPO_LABEL[ot.tipo]}</span>
          </div>
          <h1 className="text-lg font-bold text-white mt-0.5">{ot.clienteNombre}</h1>
          {ot.direccion && <p className="text-xs text-slate-400">{ot.direccion}</p>}
          {ot.clienteTelefono && (
            <a href={`https://wa.me/549${ot.clienteTelefono.replace(/\D/g, "")}`}
               target="_blank" rel="noopener noreferrer"
               className="text-xs text-emerald-400">WhatsApp ↗</a>
          )}
        </div>
      </div>

      {/* Descripción */}
      <div className="rounded-xl bg-slate-800 border border-slate-700 p-4">
        <p className="text-xs text-slate-500 mb-1">Trabajo a realizar</p>
        <p className="text-sm text-white">{ot.descripcion}</p>
        {ot.notas_admin && (
          <p className="text-xs text-amber-400 mt-2 border-t border-slate-700 pt-2">
            Nota: {ot.notas_admin}
          </p>
        )}
      </div>

      {/* Tiempos */}
      {(ot.hora_salida || ot.hora_llegada || ot.hora_fin) && (
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { label: "Salida",  val: ot.hora_salida },
            { label: "Llegada", val: ot.hora_llegada },
            { label: "Fin",     val: ot.hora_fin },
          ].map(({ label, val }) => (
            <div key={label} className={`rounded-lg p-3 ${val ? "bg-slate-800 border border-slate-700" : "bg-slate-800/30 border border-slate-800"}`}>
              <p className="text-xs text-slate-500">{label}</p>
              <p className={`text-sm font-bold ${val ? "text-white" : "text-slate-700"}`}>
                {val ? new Date(val).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }) : "—"}
              </p>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>
      )}

      {/* Botones de avance */}
      {!completada && (
        <div className="space-y-3">
          {ot.estado === "ASIGNADA" && (
            <button onClick={() => avanzarEstado("EN_RUTA")} disabled={pending}
              className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-lg disabled:opacity-50 transition-colors">
              🚗 Salir hacia el cliente
            </button>
          )}

          {ot.estado === "EN_RUTA" && (
            <button onClick={() => avanzarEstado("EN_SITIO")} disabled={pending}
              className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-lg disabled:opacity-50 transition-colors">
              📍 Llegué al sitio
            </button>
          )}

          {ot.estado === "EN_SITIO" && (
            <div className="space-y-3">
              <div>
                <label htmlFor="notas-tec" className="block text-xs text-slate-400 mb-1">Notas del trabajo (opcional)</label>
                <textarea id="notas-tec" value={notasTecnico} onChange={(e) => setNotasTecnico(e.target.value)}
                  rows={3} placeholder="Materiales usados, observaciones…"
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 text-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label htmlFor="km-final" className="block text-xs text-slate-400 mb-1">Km del vehículo al regresar (opcional)</label>
                <input id="km-final" type="number" value={kmFinal} onChange={(e) => setKmFinal(e.target.value)}
                  placeholder="Ej: 80450"
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <button onClick={() => avanzarEstado("COMPLETADA")} disabled={pending}
                className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-lg disabled:opacity-50 transition-colors">
                ✓ Completar OT
              </button>
            </div>
          )}
        </div>
      )}

      {completada && ot.estado === "COMPLETADA" && (
        <div className="rounded-xl bg-emerald-900/30 border border-emerald-700 p-4 text-center">
          <p className="text-emerald-400 font-bold">OT completada</p>
          {ot.hora_fin && (
            <p className="text-xs text-emerald-600 mt-1">
              {new Date(ot.hora_fin).toLocaleString("es-AR")}
            </p>
          )}
        </div>
      )}

      {/* Fotos */}
      {(ot.estado === "EN_SITIO" || completada) && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-300">Fotos ({ot.fotos.length})</p>
            {!completada && (
              <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs transition-colors">
                + Agregar fotos
                <input type="file" accept="image/*" multiple capture="environment"
                  className="sr-only" onChange={handleFotos} disabled={pending} />
              </label>
            )}
          </div>
          {ot.fotos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {ot.fotos.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Foto ${i + 1}`}
                    className="rounded-lg object-cover aspect-square w-full" />
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Firma del cliente */}
      {(ot.estado === "EN_SITIO" || completada) && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-300">Firma del cliente</p>

          {ot.firma_cliente_url ? (
            <div className="rounded-xl bg-white p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ot.firma_cliente_url} alt="Firma" className="max-h-24 mx-auto" />
              <p className="text-xs text-center text-emerald-600 mt-1">Conformidad firmada</p>
            </div>
          ) : firmando ? (
            <div className="space-y-2">
              <div className="rounded-xl border-2 border-slate-600 bg-white overflow-hidden touch-none">
                <canvas
                  ref={canvasRef}
                  width={360}
                  height={160}
                  className="w-full"
                  style={{ touchAction: "none" }}
                  onPointerDown={iniciarTrazo}
                  onPointerMove={trazar}
                  onPointerUp={finTrazo}
                />
              </div>
              <div className="flex gap-2">
                <button onClick={limpiarFirma}
                  className="flex-1 py-2 rounded-lg border border-slate-600 text-slate-300 text-sm hover:bg-slate-700 transition-colors">
                  Limpiar
                </button>
                <button onClick={confirmarFirma} disabled={pending}
                  className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium disabled:opacity-50 transition-colors">
                  {pending ? "Guardando…" : "Confirmar firma"}
                </button>
              </div>
              <p className="text-xs text-slate-500 text-center">El cliente firma con el dedo en la pantalla</p>
            </div>
          ) : !completada ? (
            <button onClick={() => setFirmando(true)}
              className="w-full py-3 rounded-xl border-2 border-dashed border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-300 text-sm transition-colors">
              ✍ Tomar firma del cliente
            </button>
          ) : (
            <p className="text-xs text-slate-500">Sin firma registrada</p>
          )}
        </div>
      )}
    </div>
  );
}

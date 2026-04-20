"use client";

interface DiaClima {
  fecha: string;
  weathercode: number;
  temp_max: number;
  temp_min: number;
}

interface ClimaWidgetProps {
  dias: DiaClima[];
  hoyIso?: string;
}

function emojiClima(code: number): { emoji: string; label: string } {
  if (code === 0) return { emoji: "☀️", label: "Despejado" };
  if (code <= 3) return { emoji: "⛅", label: "Parcial" };
  if (code === 45 || code === 48) return { emoji: "🌫️", label: "Niebla" };
  if (code >= 51 && code <= 67) return { emoji: "🌧️", label: "Lluvia" };
  if (code >= 80 && code <= 82) return { emoji: "🌦️", label: "Lluvias" };
  if (code >= 95) return { emoji: "⛈️", label: "Tormenta" };
  return { emoji: "🌤️", label: "Variable" };
}

const DIAS_SEMANA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export function ClimaWidget({ dias, hoyIso }: ClimaWidgetProps) {
  if (!dias.length) return null;

  // hoyIso debe venir del servidor (Server Component padre) para evitar mismatch
  // de hidratación. Si no se pasa, el primer día del forecast se trata como hoy.
  const hoyStr = hoyIso ?? dias[0].fecha;

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
        Clima · Victoria, ER
      </p>
      <div className="grid grid-cols-7 gap-1">
        {dias.map((dia) => {
          const fecha = new Date(dia.fecha + "T12:00:00");
          const esHoy = dia.fecha === hoyStr;
          const { emoji, label } = emojiClima(dia.weathercode);
          const diaNombre = DIAS_SEMANA[fecha.getDay()];

          return (
            <div
              key={dia.fecha}
              className={`flex flex-col items-center gap-0.5 rounded-lg px-1 py-2 ${
                esHoy ? "bg-indigo-500/20 ring-1 ring-indigo-500/50" : ""
              }`}
            >
              <span
                className={`text-[10px] font-semibold uppercase ${
                  esHoy ? "text-indigo-300" : "text-slate-500"
                }`}
              >
                {diaNombre}
              </span>
              <span className="text-xl leading-none" title={label}>
                {emoji}
              </span>
              <span className="text-[10px] font-bold text-white">
                {Math.round(dia.temp_max)}°
              </span>
              <span className="text-[10px] text-slate-500">
                {Math.round(dia.temp_min)}°
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

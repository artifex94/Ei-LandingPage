import { fetchWeatherForecast } from "@/lib/weather";
import { WeatherCard } from "./WeatherCard";

export async function WeatherForecast() {
  const days = await fetchWeatherForecast();

  if (!days) {
    return (
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 px-4 py-3 flex items-center gap-3">
        <span className="text-slate-500 text-sm">🌐 Pronóstico no disponible momentáneamente.</span>
      </div>
    );
  }

  return (
    <section aria-label="Pronóstico meteorológico 7 días">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-white">
          Pronóstico 7 días — Victoria, Entre Ríos
        </p>
        <div className="flex items-center gap-3 text-[10px] text-slate-500">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            Seguro
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-yellow-400" />
            Precaución
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
            Riesgo
          </span>
        </div>
      </div>

      <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-700">
        {days.map((day) => (
          <WeatherCard key={day.date} day={day} />
        ))}
      </div>
    </section>
  );
}

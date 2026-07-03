import { MessageCircle, Quote, Star } from "lucide-react";
import { siteConfig } from "@/config/site";

type Testimonio = {
  quote: string;
  name: string;
  zone: string;
};

// Cargar opiniones reales acá. Ejemplo de formato:
// { quote: "Respondieron al instante cuando saltó la alarma.", name: "María G.", zone: "Victoria" }
const testimonios: Testimonio[] = [];

const opinionLink = `${siteConfig.contact.whatsappLink}?text=${encodeURIComponent(
  "Hola, soy cliente de Escobar Instalaciones y quiero dejar mi opinión:",
)}`;

export default function OpinionsSection() {
  const hayTestimonios = testimonios.length > 0;

  return (
    <section
      id="opiniones"
      aria-labelledby="opinions-heading"
      className="relative scroll-mt-24 overflow-hidden bg-slate-950 py-16 text-white sm:py-20"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_15%,rgba(241,119,32,0.10),transparent_32%)]" />
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-15 mix-blend-screen"
        style={{ backgroundImage: "url('/images/victoria-security-texture.webp')" }}
      />
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 2xl:max-w-[1600px] 2xl:px-12">
        <div className="reveal-on-scroll mb-9 max-w-3xl">
          <p className="mb-3 text-sm font-black uppercase tracking-[0.25em] text-orange-400">Opiniones</p>
          <h2
            id="opinions-heading"
            className="hud-title text-balance text-2xl font-black tracking-tight sm:text-3xl md:text-4xl"
          >
            Lo que dicen quienes ya nos eligen
          </h2>
        </div>

        {hayTestimonios && (
          <div className="reveal-on-scroll mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {testimonios.map((t) => (
              <figure
                key={`${t.name}-${t.quote.slice(0, 12)}`}
                className="relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-900/65 p-5"
              >
                <div
                  className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.08] mix-blend-screen"
                  style={{ backgroundImage: "url('/images/victoria-security-texture.webp')" }}
                />
                <Quote className="relative h-6 w-6 text-orange-300" aria-hidden="true" />
                <blockquote className="relative mt-3 flex-1 text-sm leading-6 text-slate-200">
                  {t.quote}
                </blockquote>
                <figcaption className="relative mt-4 border-t border-white/10 pt-3 text-sm">
                  <span className="font-bold text-white">{t.name}</span>
                  <span className="text-slate-400"> · {t.zone}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        )}

        <div className="reveal-on-scroll relative flex flex-col gap-5 overflow-hidden rounded-2xl border border-white/10 bg-slate-900/65 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div
            className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.08] mix-blend-screen"
            style={{ backgroundImage: "url('/images/victoria-security-texture.webp')" }}
          />
          <div className="relative max-w-xl">
            <div className="mb-3 flex gap-1 text-orange-300" aria-hidden="true">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-5 w-5 fill-current" />
              ))}
            </div>
            <h3 className="text-lg font-bold text-white sm:text-xl">
              ¿Sos cliente? Contanos cómo fue tu experiencia
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Tu opinión nos ayuda a mejorar y orienta a quien está por dar el paso.
            </p>
          </div>
          <a
            href={opinionLink}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative inline-flex min-h-[52px] shrink-0 items-center justify-center gap-2 rounded-xl bg-orange-500 px-7 py-3 text-base font-bold text-slate-950 transition hover:-translate-y-0.5 hover:bg-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:ring-offset-2 focus:ring-offset-slate-950"
          >
            <MessageCircle className="h-5 w-5" />
            Dejar mi opinión
          </a>
        </div>
      </div>
    </section>
  );
}

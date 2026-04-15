import React from 'react';
import { Clock, Zap, Shield } from 'lucide-react';

export default function FeaturesSection() {
  return (
    <section id="nosotros" className="py-24 bg-slate-800 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-orange-500 font-bold tracking-wide uppercase text-sm mb-2">¿Por qué elegirnos?</h2>
          <h3 className="text-3xl md:text-4xl font-extrabold text-white mb-4">Seguridad sin compromisos</h3>
          <p className="text-slate-400 text-lg">
            Combinamos experiencia técnica con el mejor equipamiento del mercado para brindarte una solución robusta y confiable.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            { icon: <Clock className="w-8 h-8 text-white" />, title: "Monitoreo 24/7", desc: "Vigilancia ininterrumpida desde nuestro centro de control. Tu propiedad nunca queda desprotegida.", color: "bg-blue-600" },
            { icon: <Zap className="w-8 h-8 text-white" />, title: "Instalación Rápida", desc: "Técnicos certificados que realizan instalaciones limpias y eficientes en menos de 48 horas.", color: "bg-orange-500" },
            { icon: <Shield className="w-8 h-8 text-white" />, title: "Equipos Certificados", desc: "Trabajamos únicamente con marcas líderes en seguridad electrónica y domótica.", color: "bg-slate-600" }
          ].map((feature, idx) => (
            <div key={idx} className="group p-8 rounded-2xl bg-slate-900/50 border border-slate-700 hover:border-orange-500/50 hover:shadow-xl hover:shadow-orange-500/5 transition-all duration-300">
              <div className={`w-14 h-14 rounded-xl ${feature.color} flex items-center justify-center mb-6 shadow-lg transform group-hover:scale-110 transition-transform duration-300`}>
                {feature.icon}
              </div>
              <h4 className="text-xl font-bold text-white mb-3">{feature.title}</h4>
              <p className="text-slate-400 leading-relaxed">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
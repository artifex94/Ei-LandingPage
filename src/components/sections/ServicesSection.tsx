import React from 'react';
import { Bell, Camera, Lock, CheckCircle, ChevronRight } from 'lucide-react';

export default function ServicesSection() {
  return (
    <section id="servicios" className="py-24 bg-slate-900 text-white relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute top-0 right-0 w-1/3 h-full bg-slate-800/20 skew-x-12 transform origin-top"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
          <div className="max-w-2xl">
            <h2 className="text-orange-500 font-bold tracking-wide uppercase text-sm mb-2">Nuestros Servicios</h2>
            <h3 className="text-3xl md:text-4xl font-extrabold text-white mb-4">Soluciones integrales de seguridad</h3>
            <p className="text-slate-400 text-lg">
              Adaptamos cada sistema a la arquitectura de tu propiedad y a tus necesidades específicas de seguridad.
            </p>
          </div>
          <a href="#contacto" className="hidden md:flex items-center gap-2 text-white font-bold hover:text-orange-500 transition-colors">
            Ver todos los planes <ChevronRight className="w-5 h-5" />
          </a>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            { title: "Alarmas Inteligentes", desc: "Sistemas anti-intrusión con sensores de movimiento, rotura de cristal y apertura. Control total desde tu smartphone.", icon: <Bell className="w-6 h-6" />, features: ["App móvil incluida", "Batería de respaldo", "Aviso a policía"] },
            { title: "Cámaras de Seguridad", desc: "Circuitos cerrados de TV (CCTV) con grabación en la nube. Visión nocturna y detección de personas con IA.", icon: <Camera className="w-6 h-6" />, features: ["Calidad 4K/HD", "Audio bidireccional", "Acceso remoto"] },
            { title: "Control de Acceso", desc: "Gestiona quién entra y sale. Ideal para oficinas, edificios y barrios cerrados. Biometría y tarjetas RFID.", icon: <Lock className="w-6 h-6" />, features: ["Registro de horarios", "Reconocimiento facial", "Gestión de visitas"] }
          ].map((service, idx) => (
            <div key={idx} className="bg-slate-800 rounded-2xl p-8 border border-slate-700 hover:border-orange-500/50 transition-all hover:-translate-y-1 group">
              <div className="w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center mb-6 text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                {service.icon}
              </div>
              <h4 className="text-xl font-bold mb-3">{service.title}</h4>
              <p className="text-slate-400 mb-6 text-sm leading-relaxed">
                {service.desc}
              </p>
              <ul className="space-y-3 border-t border-slate-700 pt-6">
                {service.features.map((feat, i) => (
                  <li key={i} className="flex items-center text-sm text-slate-300">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    {feat}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
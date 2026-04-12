import React from 'react';
import { Phone, Star } from 'lucide-react';
import WhatsAppForm from '@/components/forms/WhatsAppForm';
import { siteConfig } from '@/config/site';

export default function ContactSection() {
  return (
    <section id="contacto" className="py-24 bg-slate-50 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
          <div className="grid lg:grid-cols-2">
            <div className="p-10 lg:p-16 bg-slate-900 text-white flex flex-col justify-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
              
              <h3 className="text-3xl font-bold mb-6 relative z-10">¿Listo para proteger tu hogar?</h3>
              <p className="text-slate-300 text-lg mb-8 relative z-10">
                Solicita una visita técnica gratuita. Un experto evaluará los puntos vulnerables de tu propiedad y diseñará un plan a medida.
              </p>
              
              <div className="space-y-6 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-orange-500">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Llámanos ahora</p>
                    <p className="font-bold text-lg">{siteConfig.contact.phoneDisplay}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-orange-500">
                    <Star className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Experiencia comprobada</p>
                    <p className="font-bold text-lg">Más de 20 años en el sector</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-10 lg:p-16 bg-white">
              <WhatsAppForm />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
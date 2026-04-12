import React from 'react';
import { Shield, Clock, Camera, Bell, Lock, ChevronRight } from 'lucide-react';

export default function HeroSection() {
  return (
    <section id="inicio" className="relative min-h-screen flex items-center pt-20 bg-slate-900 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-[30%] -right-[10%] w-[70%] h-[70%] rounded-full bg-orange-500/5 blur-[120px]"></div>
          <div className="absolute top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-500/5 blur-[100px]"></div>
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1558002038-1091a166111c?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-10 mix-blend-overlay"></div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full py-12 md:py-0">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700 backdrop-blur-sm mb-8">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              <span className="text-slate-300 text-xs font-bold tracking-wide uppercase">Sistema Activo 24/7</span>
            </div>
            
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white leading-tight mb-6">
              Protegemos <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">
                lo que más valoras
              </span>
            </h1>
            
            <p className="text-lg sm:text-xl text-slate-400 mb-10 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              Expertos en seguridad electrónica. Instalación de alarmas, cámaras y domótica con monitoreo inteligente para tu hogar o empresa.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <a href="#contacto" className="px-8 py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-lg transition-all transform hover:-translate-y-1 shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2">
                Solicitar Presupuesto
                <ChevronRight className="w-5 h-5" />
              </a>
              <a href="#servicios" className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-lg transition-all border border-slate-700 flex items-center justify-center">
                Ver Servicios
              </a>
            </div>

            <div className="mt-12 flex items-center justify-center lg:justify-start gap-8 text-slate-500">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-orange-500" />
                <span className="text-sm font-medium">Garantía Asegurada</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-500" />
                <span className="text-sm font-medium">Soporte Rápido</span>
              </div>
            </div>
          </div>

          <div className="relative lg:h-[600px] flex items-center justify-center">
             {/* Abstract visual representation of security */}
             <div className="relative w-full max-w-md aspect-square">
                <div className="absolute inset-0 bg-gradient-to-tr from-orange-500/20 to-transparent rounded-full blur-3xl animate-pulse"></div>
                <div className="relative z-10 bg-slate-800 rounded-3xl border border-slate-700 shadow-2xl overflow-hidden">
                  <div className="p-4 border-b border-slate-700 bg-slate-900/50 flex justify-between items-center">
                    <div className="flex gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                    <div className="text-xs font-mono text-slate-400">SYSTEM_STATUS: SECURE</div>
                  </div>
                  <div className="p-6 space-y-6">
                    {/* Mock UI Elements */}
                    <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-xl border border-slate-700/50">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-green-500/10 rounded-lg">
                          <Camera className="w-6 h-6 text-green-500" />
                        </div>
                        <div>
                          <div className="text-white font-bold">Cámara Frontal</div>
                          <div className="text-xs text-green-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                            Grabando en vivo
                          </div>
                        </div>
                      </div>
                      <div className="text-slate-400 text-xs font-mono">REC ●</div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-xl border border-slate-700/50">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-orange-500/10 rounded-lg">
                          <Lock className="w-6 h-6 text-orange-500" />
                        </div>
                        <div>
                          <div className="text-white font-bold">Cerradura Inteligente</div>
                          <div className="text-xs text-slate-400">Puerta Principal</div>
                        </div>
                      </div>
                      <div className="px-3 py-1 bg-orange-500/20 text-orange-400 text-xs font-bold rounded-full">
                        CERRADO
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-xl border border-slate-700/50">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-500/10 rounded-lg">
                          <Bell className="w-6 h-6 text-blue-500" />
                        </div>
                        <div>
                          <div className="text-white font-bold">Sensores de Movimiento</div>
                          <div className="text-xs text-slate-400">Jardín y Garage</div>
                        </div>
                      </div>
                      <div className="px-3 py-1 bg-blue-500/20 text-blue-400 text-xs font-bold rounded-full">
                        ACTIVO
                      </div>
                    </div>
                  </div>
                  {/* Graph/Wave visual */}
                  <div className="h-32 bg-slate-900/50 mt-4 relative overflow-hidden">
                     <svg className="absolute bottom-0 left-0 w-full h-full text-orange-500/20" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <path d="M0 50 Q 25 80 50 50 T 100 50 V 100 H 0 Z" fill="currentColor" />
                     </svg>
                     <svg className="absolute bottom-0 left-0 w-full h-full text-orange-500/10" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <path d="M0 60 Q 25 90 50 60 T 100 60 V 100 H 0 Z" fill="currentColor" />
                     </svg>
                  </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </section>
  );
}
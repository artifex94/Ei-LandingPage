"use client";

import React, { useState, useEffect } from 'react';
import { Shield, CheckCircle, Camera, Bell, Phone, Lock, Menu, X, Clock, Zap, ChevronRight, Star } from 'lucide-react';

export default function Home() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Efecto para cambiar el estilo del navbar al hacer scroll
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Inicio', href: '#inicio' },
    { name: 'Servicios', href: '#servicios' },
    { name: 'Nosotros', href: '#nosotros' },
    { name: 'Contacto', href: '#contacto' },
  ];

  return (
    <div className="font-sans text-slate-800 bg-slate-50 min-h-screen selection:bg-orange-500 selection:text-white">
      
      {/* --- NAVBAR --- */}
      <nav className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? 'bg-slate-900/95 backdrop-blur-md shadow-lg py-2' : 'bg-transparent py-4'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center gap-2 group cursor-pointer">
              <div className="flex items-center justify-center h-10 w-10 bg-orange-500 rounded-lg text-white font-bold text-xl shadow-lg shadow-orange-500/20 group-hover:scale-105 transition-transform">
                EI
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold tracking-tight text-white leading-none">ESCOBAR</span>
                <span className="text-[10px] text-orange-500 font-bold tracking-[0.2em] uppercase">Instalaciones</span>
              </div>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <a key={link.name} href={link.href} className="text-sm font-medium text-slate-300 hover:text-white transition-colors relative after:content-[''] after:absolute after:left-0 after:-bottom-1 after:w-0 after:h-0.5 after:bg-orange-500 after:transition-all hover:after:w-full">
                  {link.name}
                </a>
              ))}
              <a href="#contacto" className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-full font-bold text-sm transition-all transform hover:-translate-y-0.5 hover:shadow-lg hover:shadow-orange-500/25 flex items-center gap-2">
                <Phone className="w-4 h-4" />
                <span>Solicitar Asesor</span>
              </a>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-white p-2 hover:bg-white/10 rounded-lg transition-colors">
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <div className={`md:hidden absolute top-full left-0 w-full bg-slate-900 border-t border-slate-800 shadow-xl transition-all duration-300 ease-in-out overflow-hidden ${isMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="px-4 py-6 space-y-4">
            {navLinks.map((link) => (
              <a key={link.name} href={link.href} onClick={() => setIsMenuOpen(false)} className="block text-lg font-medium text-slate-300 hover:text-orange-500 transition-colors">
                {link.name}
              </a>
            ))}
            <a href="#contacto" onClick={() => setIsMenuOpen(false)} className="block w-full text-center bg-orange-500 text-white font-bold py-3 rounded-lg hover:bg-orange-600 transition-colors">
              Solicitar Asesor Ahora
            </a>
          </div>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <section id="inicio" className="relative min-h-screen flex items-center pt-20 bg-slate-900 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-[30%] -right-[10%] w-[70%] h-[70%] rounded-full bg-orange-500/5 blur-[120px]"></div>
            <div className="absolute top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-500/5 blur-[100px]"></div>
            {/* Optional: Add a subtle pattern or image here */}
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

      {/* --- FEATURES / NOSOTROS --- */}
      <section id="nosotros" className="py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-orange-500 font-bold tracking-wide uppercase text-sm mb-2">¿Por qué elegirnos?</h2>
            <h3 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">Seguridad sin compromisos</h3>
            <p className="text-slate-600 text-lg">
              Combinamos experiencia técnica con el mejor equipamiento del mercado para brindarte una solución robusta y confiable.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Clock className="w-8 h-8 text-white" />,
                title: "Monitoreo 24/7",
                desc: "Vigilancia ininterrumpida desde nuestro centro de control. Tu propiedad nunca queda desprotegida.",
                color: "bg-blue-600"
              },
              {
                icon: <Zap className="w-8 h-8 text-white" />,
                title: "Instalación Rápida",
                desc: "Técnicos certificados que realizan instalaciones limpias y eficientes en menos de 48 horas.",
                color: "bg-orange-500"
              },
              {
                icon: <Shield className="w-8 h-8 text-white" />,
                title: "Equipos Certificados",
                desc: "Trabajamos únicamente con marcas líderes en seguridad electrónica y domótica.",
                color: "bg-slate-800"
              }
            ].map((feature, idx) => (
              <div key={idx} className="group p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:border-orange-100 hover:shadow-xl hover:shadow-orange-500/5 transition-all duration-300">
                <div className={`w-14 h-14 rounded-xl ${feature.color} flex items-center justify-center mb-6 shadow-lg transform group-hover:scale-110 transition-transform duration-300`}>
                  {feature.icon}
                </div>
                <h4 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h4>
                <p className="text-slate-600 leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- SERVICES --- */}
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
              {
                title: "Alarmas Inteligentes",
                desc: "Sistemas anti-intrusión con sensores de movimiento, rotura de cristal y apertura. Control total desde tu smartphone.",
                icon: <Bell className="w-6 h-6" />,
                features: ["App móvil incluida", "Batería de respaldo", "Aviso a policía"]
              },
              {
                title: "Cámaras de Seguridad",
                desc: "Circuitos cerrados de TV (CCTV) con grabación en la nube. Visión nocturna y detección de personas con IA.",
                icon: <Camera className="w-6 h-6" />,
                features: ["Calidad 4K/HD", "Audio bidireccional", "Acceso remoto"]
              },
              {
                title: "Control de Acceso",
                desc: "Gestiona quién entra y sale. Ideal para oficinas, edificios y barrios cerrados. Biometría y tarjetas RFID.",
                icon: <Lock className="w-6 h-6" />,
                features: ["Registro de horarios", "Reconocimiento facial", "Gestión de visitas"]
              }
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
          
          <div className="mt-12 text-center md:hidden">
            <a href="#contacto" className="inline-flex items-center gap-2 text-white font-bold hover:text-orange-500 transition-colors">
              Ver todos los planes <ChevronRight className="w-5 h-5" />
            </a>
          </div>
        </div>
      </section>

      {/* --- LEAD CAPTURE / CTA SECTION --- */}
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
                      <p className="font-bold text-lg">+54 9 34 3657-5372</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-orange-500">
                      <Star className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Experiencia comprobada</p>
                      <p className="font-bold text-lg">Más de 10 años en el sector</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-10 lg:p-16 bg-white">
                <form className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Nombre</label>
                      <input type="text" className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all" placeholder="Juan Pérez" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Teléfono</label>
                      <input type="tel" className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all" placeholder="11 1234 5678" />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Servicio de interés</label>
                    <select className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all text-slate-600">
                      <option>Selecciona una opción</option>
                      <option>Alarma para Hogar</option>
                      <option>Cámaras de Seguridad</option>
                      <option>Seguridad para Empresas</option>
                      <option>Otro</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Mensaje (Opcional)</label>
                    <textarea className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all h-32 resize-none" placeholder="Cuéntanos más sobre lo que necesitas..."></textarea>
                  </div>

                  <button type="button" className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-orange-500/25 transition-all transform hover:-translate-y-1">
                    ENVIAR CONSULTA
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-slate-950 text-slate-400 py-12 border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center justify-center h-8 w-8 bg-orange-500 rounded text-white font-bold text-sm">EI</div>
                <span className="text-lg font-bold text-white">ESCOBAR INSTALACIONES</span>
              </div>
              <p className="text-sm leading-relaxed max-w-xs">
                Brindamos tranquilidad a familias y empresas a través de soluciones de seguridad electrónica de vanguardia.
              </p>
            </div>
            
            <div>
              <h4 className="text-white font-bold mb-4">Servicios</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-orange-500 transition-colors">Alarmas Monitoreadas</a></li>
                <li><a href="#" className="hover:text-orange-500 transition-colors">Videovigilancia</a></li>
                <li><a href="#" className="hover:text-orange-500 transition-colors">Control de Acceso</a></li>
                <li><a href="#" className="hover:text-orange-500 transition-colors">Domótica</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-4">Contacto</h4>
              <ul className="space-y-2 text-sm">
                <li>admin@instalacionescob.ar</li>
                <li>+54 9 34 3657-5372</li>
                <li>Victoria, Entre Ríos, Argentina</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-slate-900 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs">&copy; {new Date().getFullYear()} Escobar Instalaciones. Todos los derechos reservados.</p>
            <div className="flex gap-4">
              {/* Social Icons placeholders */}
              <div className="w-8 h-8 bg-slate-900 rounded-full flex items-center justify-center hover:bg-orange-500 hover:text-white transition-colors cursor-pointer">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" /></svg>
              </div>
              <div className="w-8 h-8 bg-slate-900 rounded-full flex items-center justify-center hover:bg-orange-500 hover:text-white transition-colors cursor-pointer">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772 4.902 4.902 0 011.772-1.153c.636-.247 1.363-.416 2.427-.465 1.024-.047 1.379-.06 3.808-.06zm1.493 5.454a3.463 3.463 0 100 6.92 3.463 3.463 0 000-6.92zm6.534 0a1.285 1.285 0 100 2.57 1.285 1.285 0 000-2.57z" clipRule="evenodd" /></svg>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp */}
      <a href="https://wa.me/+5493436575372" className="fixed bottom-6 right-6 z-50 bg-green-500 text-white p-4 rounded-full shadow-xl hover:bg-green-600 transition-all hover:scale-110 flex items-center justify-center group">
        <span className="absolute right-full mr-3 bg-white text-slate-800 px-3 py-1 rounded-lg text-sm font-bold shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          ¡Escríbenos!
        </span>
        <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
      </a>
    </div>
  );
}

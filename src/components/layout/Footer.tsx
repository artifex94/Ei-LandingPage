import React from 'react';
import { siteConfig } from '@/config/site';

export default function Footer() {
  return (
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
              <li>{siteConfig.contact.email}</li>
              <li>{siteConfig.contact.phoneDisplay}</li>
              <li>{siteConfig.contact.location}</li>
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
  );
}
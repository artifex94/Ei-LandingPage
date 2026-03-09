import React, { useState, ChangeEvent, FormEvent } from 'react';

// 1. Definimos la estructura de nuestros datos con TypeScript
interface FormData {
  nombre: string;
  telefono: string;
  servicio: string;
  mensaje: string;
}

const WhatsAppForm: React.FC = () => {
  // 2. Creamos el estado inicial del formulario
  const [formData, setFormData] = useState<FormData>({
    nombre: '',
    telefono: '',
    servicio: '',
    mensaje: ''
  });

  // 3. Función para actualizar el estado cuando el usuario escribe
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name } = e.target;
    let { value } = e.target;

    // Si el campo es el teléfono, filtramos para aceptar solo números.
    if (name === 'telefono') {
      value = value.replace(/[^0-9]/g, '');
    }

    setFormData({
      ...formData,
      [name]: value
    });
  };

  // 4. Función que se ejecuta al presionar "Enviar consulta"
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // Evitamos que la página se recargue

    // Validación 1: Aseguramos que los campos obligatorios tengan datos.
    if (!formData.nombre || !formData.telefono || !formData.servicio) {
      // El navegador ya se encarga de esto con `required`, pero es una buena segunda capa.
      return;
    }

    // Validación 2: Verificamos que el nombre tenga al menos dos palabras (nombre y apellido).
    const palabrasEnNombre = formData.nombre.trim().split(' ').filter(p => p.length > 0);
    if (palabrasEnNombre.length < 2) {
      alert('Por favor, ingresa tu nombre y apellido.');
      return; // Detenemos el envío si el nombre no es válido.
    }

    // Número de destino (sin el signo +)
    const numeroDestino = '5493436575372';

    // Construimos el mensaje base
    let textoMensaje = `Hola, mi nombre es ${formData.nombre}. Necesito el servicio de: ${formData.servicio}. Por favor, comuníquense a mi número: ${formData.telefono}.`;

    // Si el usuario escribió un mensaje opcional, lo agregamos al final
    if (formData.mensaje.trim() !== '') {
      textoMensaje += `\n\nAdicionalmente, dejo esta consulta: ${formData.mensaje}`;
    }

    // Codificamos el texto para que sea seguro en una URL
    const mensajeCodificado = encodeURIComponent(textoMensaje);

    // Creamos el enlace oficial de WhatsApp
    const urlWhatsApp = `https://wa.me/${numeroDestino}?text=${mensajeCodificado}`;

    // Abrimos el enlace en una pestaña nueva
    window.open(urlWhatsApp, '_blank');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Campo: Nombre */}
        <div className="space-y-2">
          <label htmlFor="nombre" className="text-sm font-bold text-slate-700">Nombre y apellido</label>
          <input
            type="text"
            id="nombre"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
            placeholder="Juan Pérez"
          />
        </div>

        {/* Campo: Teléfono */}
        <div className="space-y-2">
          <label htmlFor="telefono" className="text-sm font-bold text-slate-700">Teléfono</label>
          <input
            type="tel"
            id="telefono"
            name="telefono"
            value={formData.telefono}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
            placeholder="11 1234 5678"
          />
        </div>
      </div>

      {/* Campo: Servicio de interés */}
      <div className="space-y-2">
        <label htmlFor="servicio" className="text-sm font-bold text-slate-700">Servicio de interés</label>
        <select
          id="servicio"
          name="servicio"
          value={formData.servicio}
          onChange={handleChange}
          required
          className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all text-slate-600"
        >
          <option value="" disabled>Selecciona una opción</option>
          <option value="Alarma para hogar">Alarma para hogar</option>
          <option value="Cámaras de seguridad">Cámaras de seguridad</option>
          <option value="Seguridad para empresas">Seguridad para empresas</option>
          <option value="Otros">Otros</option>
        </select>
      </div>

      {/* Campo: Mensaje opcional */}
      <div className="space-y-2">
        <label htmlFor="mensaje" className="text-sm font-bold text-slate-700">Mensaje (Opcional)</label>
        <textarea
          id="mensaje"
          name="mensaje"
          value={formData.mensaje}
          onChange={handleChange}
          className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all h-32 resize-none"
          placeholder="Cuéntanos más sobre lo que necesitas..."
        />
      </div>

      {/* Botón de envío */}
      <button 
        type="submit" 
        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-orange-500/25 transition-all transform hover:-translate-y-1"
      >
        ENVIAR CONSULTA
      </button>
    </form>
  );
};

export default WhatsAppForm;

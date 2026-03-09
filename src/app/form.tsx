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
    servicio: 'Alarma para hogar', // Valor por defecto
    mensaje: ''
  });

  // 3. Función para actualizar el estado cuando el usuario escribe
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // 4. Función que se ejecuta al presionar "Enviar consulta"
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // Evitamos que la página se recargue

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
    <div style={{ maxWidth: '400px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h2>Formulario de Contacto</h2>
      
      {/* 5. Renderizamos el formulario */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        
        {/* Campo: Nombre */}
        <div>
          <label htmlFor="nombre">Nombre:</label><br />
          <input
            type="text"
            id="nombre"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            required
            style={{ width: '100%', padding: '8px' }}
          />
        </div>

        {/* Campo: Teléfono */}
        <div>
          <label htmlFor="telefono">Teléfono:</label><br />
          <input
            type="tel"
            id="telefono"
            name="telefono"
            value={formData.telefono}
            onChange={handleChange}
            required
            style={{ width: '100%', padding: '8px' }}
          />
        </div>

        {/* Campo: Servicio de interés */}
        <div>
          <label htmlFor="servicio">Servicio de interés:</label><br />
          <select
            id="servicio"
            name="servicio"
            value={formData.servicio}
            onChange={handleChange}
            style={{ width: '100%', padding: '8px' }}
          >
            <option value="Alarma para hogar">Alarma para hogar</option>
            <option value="Cámaras de seguridad">Cámaras de seguridad</option>
            <option value="Seguridad para empresas">Seguridad para empresas</option>
            <option value="Otros">Otros</option>
          </select>
        </div>

        {/* Campo: Mensaje opcional */}
        <div>
          <label htmlFor="mensaje">Mensaje (opcional):</label><br />
          <textarea
            id="mensaje"
            name="mensaje"
            value={formData.mensaje}
            onChange={handleChange}
            rows={4}
            style={{ width: '100%', padding: '8px' }}
          />
        </div>

        {/* Botón de envío */}
        <button 
          type="submit" 
          style={{ padding: '10px', backgroundColor: '#25D366', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
        >
          Enviar consulta
        </button>
      </form>
    </div>
  );
};

export default WhatsAppForm;
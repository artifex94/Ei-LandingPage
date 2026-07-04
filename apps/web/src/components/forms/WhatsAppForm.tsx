"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { siteConfig } from '@/config/site';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';

// Validación con las reglas nativas de react-hook-form (via register) en vez
// de Zod + resolver: mismas reglas y mensajes, sin cargar ~266 kB de Zod en
// el bundle público de la landing.
interface FormData {
  nombre: string;
  telefono: string;
  servicio: string;
  mensaje?: string;
}

const WhatsAppForm: React.FC = () => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      nombre: '',
      telefono: '',
      servicio: '',
      mensaje: ''
    }
  });

  // 4. Función tipada y segura que se ejecuta solo si la validación es exitosa
  const onSubmit = async (data: FormData) => {
    // Simulamos una pequeña demora de red/procesamiento para evitar múltiples clics
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Número de destino obtenido de variables de entorno o constante global
    const numeroDestino = siteConfig.contact.whatsappNumber;

    // Construimos el mensaje base
    let textoMensaje = `Hola, mi nombre es ${data.nombre}. Quiero un presupuesto para: ${data.servicio}. Mi teléfono es: ${data.telefono}.`;

    // Si el usuario escribió un mensaje opcional, lo agregamos al final
    if (data.mensaje && data.mensaje.trim() !== '') {
      textoMensaje += `\n\nAdicionalmente, dejo esta consulta: ${data.mensaje}`;
    }

    // Codificamos el texto para que sea seguro en una URL
    const mensajeCodificado = encodeURIComponent(textoMensaje);

    // Creamos el enlace oficial de WhatsApp
    const urlWhatsApp = `https://wa.me/${numeroDestino}?text=${mensajeCodificado}`;

    // Abrimos el enlace en una pestaña nueva
    window.open(urlWhatsApp, '_blank');
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {/* Campo: Nombre */}
        <div className="space-y-2">
          <label htmlFor="nombre" className="text-sm font-bold text-slate-200">Nombre y apellido</label>
          <Input
            id="nombre"
            placeholder="Juan Pérez"
            error={errors.nombre?.message}
            {...register('nombre', {
              required: 'El nombre es obligatorio',
              minLength: { value: 2, message: 'El nombre es obligatorio' },
              validate: (val) =>
                val.trim().split(/\s+/).length >= 2 || 'Por favor, ingresa tu nombre y apellido',
            })}
          />
        </div>

        {/* Campo: Teléfono */}
        <div className="space-y-2">
          <label htmlFor="telefono" className="text-sm font-bold text-slate-200">Teléfono</label>
          <Input
            type="tel"
            id="telefono"
            placeholder="11 1234 5678"
            error={errors.telefono?.message}
            {...register('telefono', {
              required: 'Ingresa un teléfono válido (mín. 8 dígitos)',
              minLength: { value: 8, message: 'Ingresa un teléfono válido (mín. 8 dígitos)' },
              onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                e.target.value = e.target.value.replace(/[^0-9]/g, '');
              }
            })}
          />
        </div>
      </div>

      {/* Campo: Servicio de interés */}
      <div className="space-y-2">
        <label htmlFor="servicio" className="text-sm font-bold text-slate-200">Servicio de interés</label>
        <Select
          id="servicio"
          error={errors.servicio?.message}
          {...register('servicio', { required: 'Por favor selecciona un servicio' })}
        >
          <option value="" disabled>Selecciona una opción</option>
          <option value="Alarma para hogar">Alarma para hogar</option>
          <option value="Cámaras de seguridad">Cámaras de seguridad</option>
          <option value="Seguridad para empresas">Seguridad para empresas</option>
          <option value="Otros">Otros</option>
        </Select>
      </div>

      {/* Campo: Mensaje opcional */}
      <div className="space-y-2">
        <label htmlFor="mensaje" className="text-sm font-bold text-slate-200">Mensaje (Opcional)</label>
        <Textarea
          id="mensaje"
          placeholder="Cuéntanos más sobre lo que necesitas..."
          className="h-24"
          error={errors.mensaje?.message}
          {...register('mensaje')}
        />
      </div>

      {/* Botón de envío */}
      <Button
        type="submit"
        isLoading={isSubmitting}
        loadingText="Abriendo WhatsApp..."
        className="whitespace-nowrap"
      >
        <span className="sm:hidden">Pedir presupuesto</span>
        <span className="hidden sm:inline">Solicitar presupuesto</span>
      </Button>
    </form>
  );
};

export default WhatsAppForm;

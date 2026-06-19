"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { siteConfig } from '@/config/site';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';

// 1. Definimos el esquema de validación con Zod
const formSchema = z.object({
  nombre: z.string()
    .min(2, 'El nombre es obligatorio')
    .refine((val) => val.trim().split(/\s+/).length >= 2, {
      message: 'Por favor, ingresa tu nombre y apellido',
    }),
  telefono: z.string()
    .min(8, 'Ingresa un teléfono válido (mín. 8 dígitos)'),
  servicio: z.string().min(1, 'Por favor selecciona un servicio'),
  mensaje: z.string().optional(),
});

// 2. Inferimos la interfaz de TypeScript automáticamente desde el esquema
type FormData = z.infer<typeof formSchema>;

const WhatsAppForm: React.FC = () => {
  // 3. Configuramos React Hook Form conectándolo con el resolver de Zod
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
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
    let textoMensaje = `Hola, mi nombre es ${data.nombre}. Necesito el servicio de: ${data.servicio}. Por favor, comuníquense a mi número: ${data.telefono}.`;

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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Campo: Nombre */}
        <div className="space-y-2">
          <label htmlFor="nombre" className="text-sm font-bold text-slate-200">Nombre y apellido</label>
          <Input 
            id="nombre" 
            placeholder="Juan Pérez" 
            error={errors.nombre?.message} 
            {...register('nombre')} 
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
          {...register('servicio')}
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
          className="h-32"
          error={errors.mensaje?.message}
          {...register('mensaje')}
        />
      </div>

      {/* Botón de envío */}
      <Button 
        type="submit" 
        isLoading={isSubmitting}
        loadingText="Abriendo WhatsApp..."
      >
        ENVIAR CONSULTA
      </Button>
    </form>
  );
};

export default WhatsAppForm;

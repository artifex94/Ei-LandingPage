/**
 * Crea una semana completa de TareaAgendada para el técnico de ejemplo.
 * Uso: set -a && source .env.local && set +a && npx tsx scripts/seed-tareas-semana.ts
 */

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// Lunes de la semana actual
function getLunes(): Date {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const diff = (hoy.getDay() + 6) % 7;
  hoy.setDate(hoy.getDate() - diff);
  return hoy;
}

function addDias(base: Date, n: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

async function main() {
  const tecnico = await prisma.perfil.findFirst({
    where: { email: "tecnico@ejemplo.com" },
    select: { id: true, nombre: true },
  });

  if (!tecnico) {
    console.error("✗ No se encontró el técnico tecnico@ejemplo.com");
    process.exit(1);
  }

  console.log(`\n📋 Creando tareas para: ${tecnico.nombre} (${tecnico.id})`);
  const lunes = getLunes();

  // Traer una cuenta real para asociar algunas tareas
  const cuentas = await prisma.cuenta.findMany({
    where: { estado: "ACTIVA" },
    select: { id: true, calle: true, localidad: true },
    take: 5,
  });

  const cuenta = (i: number) => cuentas[i % cuentas.length] ?? null;

  const TAREAS: {
    diasOffset: number;
    titulo: string;
    descripcion: string;
    hora_inicio: string;
    hora_fin: string;
    prioridad: "ALTA" | "MEDIA" | "BAJA";
    estado: "PENDIENTE" | "EN_CURSO" | "COMPLETADA";
    cuentaIdx?: number;
  }[] = [
    // Lunes
    { diasOffset: 0, titulo: "Instalación alarma residencial", descripcion: "Instalar central DSC Power 1616 + 4 sensores PIR + contactos magnéticos.", hora_inicio: "08:00", hora_fin: "11:00", prioridad: "ALTA", estado: "COMPLETADA", cuentaIdx: 0 },
    { diasOffset: 0, titulo: "Revisión panel de control", descripcion: "Chequear batería de respaldo y actualizar firmware.", hora_inicio: "13:00", hora_fin: "14:30", prioridad: "MEDIA", estado: "COMPLETADA", cuentaIdx: 1 },
    { diasOffset: 0, titulo: "Cambio sensor PIR", descripcion: "Sensor con falla reportada por el cliente. Llevar repuesto.", hora_inicio: "16:00", hora_fin: "17:00", prioridad: "BAJA", estado: "COMPLETADA" },

    // Martes
    { diasOffset: 1, titulo: "Instalación cámara exterior", descripcion: "Cámara IP Hikvision 2MP con visión nocturna. Acceso a techo.", hora_inicio: "09:00", hora_fin: "12:00", prioridad: "MEDIA", estado: "COMPLETADA", cuentaIdx: 2 },
    { diasOffset: 1, titulo: "Mantenimiento preventivo mensual", descripcion: "Limpieza de sensores, prueba de sirena, verificación de comunicación.", hora_inicio: "14:00", hora_fin: "15:30", prioridad: "BAJA", estado: "COMPLETADA", cuentaIdx: 0 },

    // Miércoles
    { diasOffset: 2, titulo: "Correctivo — alarma no comunica", descripcion: "El sistema no reporta al centro de monitoreo. Revisar módulo GSM.", hora_inicio: "08:30", hora_fin: "10:30", prioridad: "ALTA", estado: "COMPLETADA", cuentaIdx: 3 },
    { diasOffset: 2, titulo: "Instalación Starlink — negocio", descripcion: "Instalación y configuración Starlink Business. Llevar cable ethernet cat6.", hora_inicio: "13:00", hora_fin: "16:00", prioridad: "MEDIA", estado: "COMPLETADA", cuentaIdx: 1 },
    { diasOffset: 2, titulo: "Reposición batería central", descripcion: "Batería agotada según reporte de monitoreo.", hora_inicio: "17:00", hora_fin: "18:00", prioridad: "ALTA", estado: "COMPLETADA" },

    // Jueves
    { diasOffset: 3, titulo: "Sistema domótica — seguimiento", descripcion: "Segunda visita. Integrar escenas con Alexa y ajustar sensores de movimiento.", hora_inicio: "09:00", hora_fin: "13:00", prioridad: "MEDIA", estado: "COMPLETADA", cuentaIdx: 4 },
    { diasOffset: 3, titulo: "Visita técnica preventiva", descripcion: "Revisión programada trimestral del sistema.", hora_inicio: "15:00", hora_fin: "16:30", prioridad: "BAJA", estado: "COMPLETADA", cuentaIdx: 2 },

    // Viernes
    { diasOffset: 4, titulo: "Retiro equipo — baja de servicio", descripcion: "Cliente solicitó baja. Retirar central, teclado y sensores.", hora_inicio: "08:00", hora_fin: "10:00", prioridad: "MEDIA", estado: "COMPLETADA", cuentaIdx: 3 },
    { diasOffset: 4, titulo: "Instalación 3 cámaras CCTV", descripcion: "Sistema de 3 cámaras para local comercial. Incluye NVR y monitor.", hora_inicio: "11:00", hora_fin: "15:00", prioridad: "ALTA", estado: "EN_CURSO", cuentaIdx: 0 },
    { diasOffset: 4, titulo: "Configuración app cliente", descripcion: "Enseñar al cliente cómo usar la app móvil y configurar notificaciones.", hora_inicio: "16:00", hora_fin: "17:00", prioridad: "BAJA", estado: "PENDIENTE", cuentaIdx: 0 },

    // Sábado
    { diasOffset: 5, titulo: "Urgente — alarma activada sin causa", descripcion: "Monitoreo reporta activaciones falsas repetidas. Revisar sensores.", hora_inicio: "09:00", hora_fin: "10:30", prioridad: "ALTA", estado: "PENDIENTE", cuentaIdx: 1 },
    { diasOffset: 5, titulo: "Mantenimiento antena Starlink", descripcion: "Limpieza del dish y revisión del cable de alimentación.", hora_inicio: "12:00", hora_fin: "13:00", prioridad: "BAJA", estado: "PENDIENTE", cuentaIdx: 2 },

    // Domingo
    { diasOffset: 6, titulo: "Guardia de emergencia", descripcion: "Disponibilidad telefónica. Solo si hay incidente crítico.", hora_inicio: "10:00", hora_fin: "12:00", prioridad: "MEDIA", estado: "PENDIENTE" },
  ];

  let creadas = 0;

  for (const t of TAREAS) {
    const fecha = addDias(lunes, t.diasOffset);
    const cuentaAsoc = t.cuentaIdx !== undefined ? cuenta(t.cuentaIdx) : null;

    await prisma.tareaAgendada.create({
      data: {
        titulo:       t.titulo,
        descripcion:  t.descripcion,
        fecha,
        hora_inicio:  t.hora_inicio,
        hora_fin:     t.hora_fin,
        prioridad:    t.prioridad,
        estado:       t.estado,
        tecnico_id:   tecnico.id,
        cuenta_id:    cuentaAsoc?.id ?? null,
      },
    });

    const diaLabel = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"][t.diasOffset];
    console.log(`   ✓ ${diaLabel} ${t.hora_inicio} — ${t.titulo}`);
    creadas++;
  }

  console.log(`\n✅ ${creadas} tareas creadas para la semana del ${lunes.toLocaleDateString("es-AR")}\n`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Error fatal:", e);
  prisma.$disconnect();
  process.exit(1);
});

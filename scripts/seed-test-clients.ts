/**
 * Script de seed — datos de prueba para visualizar el portal
 * Ejecutar: npx tsx scripts/seed-test-clients.ts
 */

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createClient } from "@supabase/supabase-js";

// Prisma 7 requiere adapter explícito (igual que en src/lib/prisma/client.ts)
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL_UNPOOLED! });
const prisma = new PrismaClient({ adapter } as never);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function getOrCreateAuthUser(email: string, nombre: string): Promise<string> {
  const { data: list } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  const existing = list?.users?.find((u) => u.email === email);
  if (existing) return existing.id;

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: "Prueba1234!",
    email_confirm: true,
    user_metadata: { nombre },
  });
  if (error) throw new Error(`Error creando auth user ${email}: ${error.message}`);
  return data.user.id;
}

async function main() {
  // ─────────────────────────────────────────────────────────────────────────
  // 1. cliente@prueba.com — TODOS los campos completados
  // ─────────────────────────────────────────────────────────────────────────
  const idPrueba1 = await getOrCreateAuthUser("cliente@prueba.com", "Ramiro Escobar García");

  await prisma.perfil.upsert({
    where: { email: "cliente@prueba.com" },
    create: {
      id: idPrueba1,
      nombre: "Ramiro Escobar García",
      email: "cliente@prueba.com",
      dni: "30123456",
      telefono: "3436575001",
      rol: "CLIENTE",
      activo: true,
      tipo_titular: "RESIDENCIAL",
      fecha_alta_softguard: new Date("2022-03-15"),
    },
    update: {
      nombre: "Ramiro Escobar García",
      dni: "30123456",
      telefono: "3436575001",
      activo: true,
      tipo_titular: "RESIDENCIAL",
      fecha_alta_softguard: new Date("2022-03-15"),
    },
  });

  // Cuenta 1 — ALARMA con todos los campos y sensores completos
  const cuenta1 = await prisma.cuenta.upsert({
    where: { softguard_ref: "TST-001" },
    create: {
      softguard_ref: "TST-001",
      perfil_id: idPrueba1,
      descripcion: "Casa Palermo — Av. Santa Fe 1234",
      categoria: "ALARMA_MONITOREO",
      estado: "ACTIVA",
      costo_mensual: 22000,
      calle: "Av. Santa Fe 1234",
      localidad: "Palermo",
      provincia: "Buenos Aires",
      codigo_postal: "1414",
      zona_geografica: "CABA Norte",
      notas_tecnicas: "Panel DSC Power 1616. Revisión bianual. Llave de repuesto en caja fuerte.",
    },
    update: {
      descripcion: "Casa Palermo — Av. Santa Fe 1234",
      calle: "Av. Santa Fe 1234",
      localidad: "Palermo",
      provincia: "Buenos Aires",
      codigo_postal: "1414",
      zona_geografica: "CABA Norte",
      notas_tecnicas: "Panel DSC Power 1616. Revisión bianual. Llave de repuesto en caja fuerte.",
      costo_mensual: 22000,
      estado: "ACTIVA",
    },
  });

  // Sensores cuenta 1
  const sensoresCuenta1 = [
    { codigo_zona: "Z01", etiqueta: "Entrada principal", tipo: "CONTACTO_MAGNETICO" as const, bateria: "OPTIMA" as const, activa: true, alerta_mant: false, ultima_activacion: new Date("2026-04-10T08:30:00") },
    { codigo_zona: "Z02", etiqueta: "Living comedor",    tipo: "SENSOR_PIR" as const,          bateria: "ADVERTENCIA" as const, activa: true, alerta_mant: true, ultima_activacion: new Date("2026-04-12T22:15:00") },
    { codigo_zona: "Z03", etiqueta: "Habitación principal", tipo: "SENSOR_PIR" as const,      bateria: "OPTIMA" as const, activa: true, alerta_mant: false, ultima_activacion: new Date("2026-04-11T07:00:00") },
    { codigo_zona: "Z04", etiqueta: "Garage",            tipo: "CONTACTO_MAGNETICO" as const,  bateria: "CRITICA" as const,    activa: true, alerta_mant: true, ultima_activacion: new Date("2026-03-28T19:45:00") },
    { codigo_zona: "Z05", etiqueta: "Patio trasero",     tipo: "SENSOR_PIR" as const,          bateria: "OPTIMA" as const, activa: false, alerta_mant: false, ultima_activacion: null },
    { codigo_zona: "Z06", etiqueta: "Teclado principal", tipo: "TECLADO_CONTROL" as const,     bateria: null, activa: true, alerta_mant: false, ultima_activacion: new Date("2026-04-15T10:00:00") },
    { codigo_zona: "Z07", etiqueta: "Detector de humo cocina", tipo: "DETECTOR_HUMO" as const, bateria: "OPTIMA" as const, activa: true, alerta_mant: false, ultima_activacion: null },
    { codigo_zona: "Z08", etiqueta: "Botón pánico dormitorio", tipo: "PANICO" as const,        bateria: "ADVERTENCIA" as const, activa: true, alerta_mant: false, ultima_activacion: null },
  ];

  for (const s of sensoresCuenta1) {
    await prisma.sensor.upsert({
      where: { cuenta_id_codigo_zona: { cuenta_id: cuenta1.id, codigo_zona: s.codigo_zona } },
      create: { cuenta_id: cuenta1.id, ...s },
      update: { etiqueta: s.etiqueta, tipo: s.tipo, bateria: s.bateria, activa: s.activa, alerta_mant: s.alerta_mant, ultima_activacion: s.ultima_activacion },
    });
  }

  // Cuenta 2 — CÁMARA CCTV (EN_MANTENIMIENTO)
  const cuenta2 = await prisma.cuenta.upsert({
    where: { softguard_ref: "TST-002" },
    create: {
      softguard_ref: "TST-002",
      perfil_id: idPrueba1,
      descripcion: "Local comercial — Corrientes 5678",
      categoria: "CAMARA_CCTV",
      estado: "EN_MANTENIMIENTO",
      costo_mensual: 18000,
      calle: "Av. Corrientes 5678",
      localidad: "Almagro",
      provincia: "Buenos Aires",
      codigo_postal: "1195",
      zona_geografica: "CABA Centro",
      notas_tecnicas: "8 cámaras Hikvision 4MP. NVR en oficina trasera. Password: ver gestor de contraseñas.",
    },
    update: {
      estado: "EN_MANTENIMIENTO",
      calle: "Av. Corrientes 5678",
      localidad: "Almagro",
      provincia: "Buenos Aires",
      codigo_postal: "1195",
      zona_geografica: "CABA Centro",
      notas_tecnicas: "8 cámaras Hikvision 4MP. NVR en oficina trasera. Password: ver gestor de contraseñas.",
    },
  });

  const sensoresCuenta2 = [
    { codigo_zona: "C01", etiqueta: "Cámara fachada norte", tipo: "CAMARA_IP" as const, bateria: null, activa: true, alerta_mant: true, ultima_activacion: new Date("2026-04-01T00:00:00") },
    { codigo_zona: "C02", etiqueta: "Cámara caja registradora", tipo: "CAMARA_IP" as const, bateria: null, activa: true, alerta_mant: false, ultima_activacion: new Date("2026-04-15T09:30:00") },
    { codigo_zona: "C03", etiqueta: "Módulo domótica luces", tipo: "MODULO_DOMOTICA" as const, bateria: null, activa: false, alerta_mant: true, ultima_activacion: null },
  ];

  for (const s of sensoresCuenta2) {
    await prisma.sensor.upsert({
      where: { cuenta_id_codigo_zona: { cuenta_id: cuenta2.id, codigo_zona: s.codigo_zona } },
      create: { cuenta_id: cuenta2.id, ...s },
      update: { etiqueta: s.etiqueta, tipo: s.tipo, activa: s.activa, alerta_mant: s.alerta_mant, ultima_activacion: s.ultima_activacion },
    });
  }

  // Pagos para cuenta1 — historial variado
  const pagosCuenta1 = [
    { mes: 1, anio: 2026, estado: "PAGADO" as const,    metodo: "MERCADOPAGO" as const,           acreditado_en: new Date("2026-01-05"), registrado_por: "Sistema MP" },
    { mes: 2, anio: 2026, estado: "PAGADO" as const,    metodo: "TRANSFERENCIA_BANCARIA" as const, acreditado_en: new Date("2026-02-08"), registrado_por: "Admin" },
    { mes: 3, anio: 2026, estado: "PAGADO" as const,    metodo: "EFECTIVO" as const,               acreditado_en: new Date("2026-03-03"), registrado_por: "Admin" },
    { mes: 4, anio: 2026, estado: "PENDIENTE" as const, metodo: null,                              acreditado_en: null, registrado_por: null },
  ];

  for (const p of pagosCuenta1) {
    await prisma.pago.upsert({
      where: { cuenta_id_mes_anio: { cuenta_id: cuenta1.id, mes: p.mes, anio: p.anio } },
      create: { cuenta_id: cuenta1.id, importe: 22000, ...p },
      update: { estado: p.estado, metodo: p.metodo, acreditado_en: p.acreditado_en, registrado_por: p.registrado_por },
    });
  }

  // Pagos para cuenta2
  const pagosCuenta2 = [
    { mes: 2, anio: 2026, estado: "PAGADO" as const,    metodo: "TALO_CVU" as const, acreditado_en: new Date("2026-02-10"), registrado_por: "Sistema Talo" },
    { mes: 3, anio: 2026, estado: "VENCIDO" as const,   metodo: null, acreditado_en: null, registrado_por: null },
    { mes: 4, anio: 2026, estado: "PROCESANDO" as const, metodo: "TRANSFERENCIA_BANCARIA" as const, acreditado_en: null, registrado_por: null },
  ];

  for (const p of pagosCuenta2) {
    await prisma.pago.upsert({
      where: { cuenta_id_mes_anio: { cuenta_id: cuenta2.id, mes: p.mes, anio: p.anio } },
      create: { cuenta_id: cuenta2.id, importe: 18000, ...p },
      update: { estado: p.estado, metodo: p.metodo, acreditado_en: p.acreditado_en, registrado_por: p.registrado_por },
    });
  }

  // Solicitudes de mantenimiento para cuenta1
  await prisma.solicitudMantenimiento.createMany({
    data: [
      { cuenta_id: cuenta1.id, descripcion: "Sensor Z02 dispara alarmas falsas en horario nocturno", estado: "EN_PROCESO", prioridad: "ALTA", creada_en: new Date("2026-04-10"), resuelta_en: null },
      { cuenta_id: cuenta1.id, descripcion: "Cambio de batería en sensor de garage (Z04)", estado: "PENDIENTE", prioridad: "MEDIA", creada_en: new Date("2026-04-14"), resuelta_en: null },
      { cuenta_id: cuenta1.id, descripcion: "Actualización de código de usuario en teclado", estado: "RESUELTA", prioridad: "BAJA", creada_en: new Date("2026-03-20"), resuelta_en: new Date("2026-03-22") },
    ],
    skipDuplicates: true,
  });

  console.log("✅ cliente@prueba.com — datos completos cargados");

  // ─────────────────────────────────────────────────────────────────────────
  // 2. cliente@prueba3.com — SIN: dni, tipo_titular, fecha_alta_softguard
  //    Cuenta SIN: calle, localidad, provincia, codigo_postal, notas_tecnicas
  //    Sensores SIN bateria, sin ultima_activacion
  //    Pagos: solo PENDIENTE del mes actual
  // ─────────────────────────────────────────────────────────────────────────
  const idPrueba3 = await getOrCreateAuthUser("cliente@prueba3.com", "Laura Fernández");

  await prisma.perfil.upsert({
    where: { email: "cliente@prueba3.com" },
    create: {
      id: idPrueba3,
      nombre: "Laura Fernández",
      email: "cliente@prueba3.com",
      telefono: "3436575003",
      // Sin dni, sin tipo_titular, sin fecha_alta_softguard
      rol: "CLIENTE",
      activo: true,
    },
    update: {
      nombre: "Laura Fernández",
      telefono: "3436575003",
    },
  });

  const cuenta3 = await prisma.cuenta.upsert({
    where: { softguard_ref: "TST-003" },
    create: {
      softguard_ref: "TST-003",
      perfil_id: idPrueba3,
      descripcion: "Domicilio particular",
      categoria: "ALARMA_MONITOREO",
      estado: "ACTIVA",
      costo_mensual: 20000,
      zona_geografica: "GBA Norte",
      // Sin calle, localidad, provincia, codigo_postal, notas_tecnicas
    },
    update: {
      descripcion: "Domicilio particular",
      zona_geografica: "GBA Norte",
      calle: null,
      localidad: null,
      provincia: null,
      codigo_postal: null,
      notas_tecnicas: null,
    },
  });

  await prisma.sensor.upsert({
    where: { cuenta_id_codigo_zona: { cuenta_id: cuenta3.id, codigo_zona: "Z01" } },
    create: { cuenta_id: cuenta3.id, codigo_zona: "Z01", etiqueta: "Puerta entrada", tipo: "CONTACTO_MAGNETICO", activa: true, alerta_mant: false /* sin bateria, sin ultima_activacion */ },
    update: { etiqueta: "Puerta entrada", activa: true, alerta_mant: false, bateria: null, ultima_activacion: null },
  });
  await prisma.sensor.upsert({
    where: { cuenta_id_codigo_zona: { cuenta_id: cuenta3.id, codigo_zona: "Z02" } },
    create: { cuenta_id: cuenta3.id, codigo_zona: "Z02", etiqueta: "Pasillo interno", tipo: "SENSOR_PIR", activa: true, alerta_mant: false },
    update: { etiqueta: "Pasillo interno", activa: true, alerta_mant: false, bateria: null, ultima_activacion: null },
  });

  // Solo pago del mes actual (pendiente)
  await prisma.pago.upsert({
    where: { cuenta_id_mes_anio: { cuenta_id: cuenta3.id, mes: 4, anio: 2026 } },
    create: { cuenta_id: cuenta3.id, mes: 4, anio: 2026, importe: 20000, estado: "PENDIENTE" },
    update: { estado: "PENDIENTE" },
  });

  console.log("✅ cliente@prueba3.com — datos parciales (sin DNI, sin dirección completa)");

  // ─────────────────────────────────────────────────────────────────────────
  // 3. cliente@prueba4.com — CON: dni, tipo_titular, fecha_alta_softguard
  //    Cuenta CON: calle, localidad, provincia, codigo_postal, notas_tecnicas
  //    SIN: zona_geografica, teléfono en perfil
  //    Sensores CON bateria y ultima_activacion
  //    Pagos: 2 vencidos (mora visible) — sin pagos recientes
  // ─────────────────────────────────────────────────────────────────────────
  const idPrueba4 = await getOrCreateAuthUser("cliente@prueba4.com", "Marcos Villanueva");

  await prisma.perfil.upsert({
    where: { email: "cliente@prueba4.com" },
    create: {
      id: idPrueba4,
      nombre: "Marcos Villanueva",
      email: "cliente@prueba4.com",
      dni: "28456789",
      // Sin telefono
      rol: "CLIENTE",
      activo: true,
      tipo_titular: "COMERCIAL",
      fecha_alta_softguard: new Date("2023-07-01"),
    },
    update: {
      nombre: "Marcos Villanueva",
      dni: "28456789",
      tipo_titular: "COMERCIAL",
      fecha_alta_softguard: new Date("2023-07-01"),
      telefono: null,
    },
  });

  const cuenta4 = await prisma.cuenta.upsert({
    where: { softguard_ref: "TST-004" },
    create: {
      softguard_ref: "TST-004",
      perfil_id: idPrueba4,
      descripcion: "Oficina Belgrano — Cabildo 987",
      categoria: "DOMOTICA",
      estado: "SUSPENDIDA_PAGO",
      costo_mensual: 25000,
      calle: "Cabildo 987",
      localidad: "Belgrano",
      provincia: "Buenos Aires",
      codigo_postal: "1428",
      notas_tecnicas: "Sistema KNX. Controlador Weinzierl USB. Programación en ETS5.",
      // Sin zona_geografica
    },
    update: {
      descripcion: "Oficina Belgrano — Cabildo 987",
      calle: "Cabildo 987",
      localidad: "Belgrano",
      provincia: "Buenos Aires",
      codigo_postal: "1428",
      notas_tecnicas: "Sistema KNX. Controlador Weinzierl USB. Programación en ETS5.",
      zona_geografica: null,
      estado: "SUSPENDIDA_PAGO",
    },
  });

  await prisma.sensor.upsert({
    where: { cuenta_id_codigo_zona: { cuenta_id: cuenta4.id, codigo_zona: "D01" } },
    create: { cuenta_id: cuenta4.id, codigo_zona: "D01", etiqueta: "Módulo luces sala", tipo: "MODULO_DOMOTICA", activa: true, alerta_mant: false, bateria: "OPTIMA", ultima_activacion: new Date("2026-02-20T14:00:00") },
    update: { etiqueta: "Módulo luces sala", activa: true, alerta_mant: false, bateria: "OPTIMA", ultima_activacion: new Date("2026-02-20T14:00:00") },
  });
  await prisma.sensor.upsert({
    where: { cuenta_id_codigo_zona: { cuenta_id: cuenta4.id, codigo_zona: "D02" } },
    create: { cuenta_id: cuenta4.id, codigo_zona: "D02", etiqueta: "Módulo persianas oficina", tipo: "MODULO_DOMOTICA", activa: false, alerta_mant: true, bateria: "CRITICA", ultima_activacion: new Date("2026-01-10T09:00:00") },
    update: { etiqueta: "Módulo persianas oficina", activa: false, alerta_mant: true, bateria: "CRITICA", ultima_activacion: new Date("2026-01-10T09:00:00") },
  });

  // 2 meses vencidos (activa la pantalla de mora)
  for (const [mes, anio] of [[2, 2026], [3, 2026]]) {
    await prisma.pago.upsert({
      where: { cuenta_id_mes_anio: { cuenta_id: cuenta4.id, mes, anio } },
      create: { cuenta_id: cuenta4.id, mes, anio, importe: 25000, estado: "VENCIDO" },
      update: { estado: "VENCIDO" },
    });
  }

  console.log("✅ cliente@prueba4.com — datos parciales complementarios (con DNI/dirección, sin teléfono, en mora)");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

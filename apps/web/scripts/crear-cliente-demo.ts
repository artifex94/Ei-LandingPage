/**
 * Crea el entorno de PRUEBA de punta a punta pedido por Ramiro (2026-07-03):
 *   - cliente.demo@escobarinstalaciones.ar → Perfil CLIENTE + Cuenta demo con
 *     sensores y eventos de alarma realistas (algunos NUEVOS: aparecen en la
 *     cola de /monitoreo y en la actividad del portal).
 *   - demo.admin@escobarinstalaciones.ar → Perfil ADMIN para verificar las
 *     pantallas de administración.
 *
 * ⚠ TEMPORAL: cuentas de prueba sobre la base real. Eliminar con
 *   `npx tsx --env-file=.env.local scripts/crear-cliente-demo.ts --borrar`
 *   cuando termine el testeo (borra eventos, sensores, cuenta, perfiles y
 *   usuarios de Auth de este script; no toca nada más).
 *
 * Idempotente: re-ejecutar no duplica.
 *
 * Uso: npx tsx --env-file=.env.local scripts/crear-cliente-demo.ts
 */

import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const CLIENTE = {
  email: "cliente.demo@escobarinstalaciones.ar",
  password: "Cliente.Demo2026!",
  nombre: "Demo Cliente Portal",
};

const ADMIN = {
  email: "demo.admin@escobarinstalaciones.ar",
  password: "Admin.Demo2026.Ciclo!",
  nombre: "Demo Admin",
};

const SG_REF_DEMO = "DEMO-9999";

async function upsertAuth(email: string, password: string): Promise<string> {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (!error) return data.user.id;
  if (!error.message.includes("already been registered")) throw error;
  const { data: list } = await supabaseAdmin.auth.admin.listUsers();
  const existing = list?.users?.find((u) => u.email === email);
  if (!existing) throw new Error(`No se pudo recuperar ${email}`);
  await supabaseAdmin.auth.admin.updateUserById(existing.id, { password });
  return existing.id;
}

async function borrar() {
  console.log("── Borrando entorno demo ────────────────────────────────────");
  const cuenta = await prisma.cuenta.findUnique({ where: { softguard_ref: SG_REF_DEMO } });
  if (cuenta) {
    await prisma.eventoAlarma.deleteMany({ where: { cuenta_id: cuenta.id } });
    await prisma.sensor.deleteMany({ where: { cuenta_id: cuenta.id } });
    await prisma.cuenta.delete({ where: { id: cuenta.id } });
    console.log("  ✓ Eventos, sensores y cuenta demo borrados");
  }
  const { data: list } = await supabaseAdmin.auth.admin.listUsers();
  for (const email of [CLIENTE.email, ADMIN.email]) {
    const u = list?.users?.find((x) => x.email === email);
    if (u) {
      await prisma.perfil.deleteMany({ where: { id: u.id } });
      await supabaseAdmin.auth.admin.deleteUser(u.id);
      console.log(`  ✓ ${email} borrado (perfil + auth)`);
    }
  }
  console.log("── Entorno demo eliminado ───────────────────────────────────");
}

async function crear() {
  console.log("── Crear entorno demo de punta a punta ─────────────────────\n");

  // 1. Cliente
  const clienteId = await upsertAuth(CLIENTE.email, CLIENTE.password);
  await prisma.perfil.upsert({
    where: { id: clienteId },
    create: {
      id: clienteId,
      nombre: CLIENTE.nombre,
      email: CLIENTE.email,
      rol: "CLIENTE",
      activo: true,
      tipo_titular: "RESIDENCIAL",
    },
    update: { rol: "CLIENTE", activo: true },
  });
  console.log(`✓ Cliente demo (${clienteId})`);

  // 2. Admin
  const adminId = await upsertAuth(ADMIN.email, ADMIN.password);
  await prisma.perfil.upsert({
    where: { id: adminId },
    create: {
      id: adminId,
      nombre: ADMIN.nombre,
      email: ADMIN.email,
      rol: "ADMIN",
      activo: true,
    },
    update: { rol: "ADMIN", activo: true },
  });
  console.log(`✓ Admin demo (${adminId})`);

  // 3. Cuenta demo del cliente
  const cuenta = await prisma.cuenta.upsert({
    where: { softguard_ref: SG_REF_DEMO },
    create: {
      softguard_ref: SG_REF_DEMO,
      perfil_id: clienteId,
      descripcion: "Casa Demo — Ciclo de pruebas",
      categoria: "ALARMA_MONITOREO",
      estado: "ACTIVA",
      calle: "Rawson 255",
      localidad: "Victoria",
      provincia: "Entre Ríos",
      zona_geografica: "Centro",
    },
    update: { perfil_id: clienteId, estado: "ACTIVA" },
  });
  console.log(`✓ Cuenta demo (${cuenta.id}, ref ${SG_REF_DEMO})`);

  // 4. Sensores
  const sensores = [
    { codigo_zona: "Z01", etiqueta: "PIR living", tipo: "SENSOR_PIR" },
    { codigo_zona: "Z02", etiqueta: "Puerta principal", tipo: "CONTACTO_MAGNETICO" },
    { codigo_zona: "Z03", etiqueta: "Teclado entrada", tipo: "TECLADO_CONTROL" },
  ] as const;
  for (const s of sensores) {
    await prisma.sensor.upsert({
      where: { cuenta_id_codigo_zona: { cuenta_id: cuenta.id, codigo_zona: s.codigo_zona } },
      create: { cuenta_id: cuenta.id, ...s, activa: true, bateria: "OPTIMA" },
      update: { activa: true },
    });
  }
  console.log(`✓ ${sensores.length} sensores`);

  // 5. Eventos realistas (últimos días; los NUEVOS aparecen en /monitoreo)
  const hace = (horas: number) => new Date(Date.now() - horas * 3_600_000);
  const eventos = [
    { codigo: "E602", descripcion: "Test periódico recibido", zona: null, prioridad: 6, estado: "PROCESADO_NO_ALERTA", fecha_evento: hace(70) },
    { codigo: "E401", descripcion: "Desarmado por usuario 1", zona: "Z03", prioridad: 5, estado: "PROCESADO", fecha_evento: hace(56) },
    { codigo: "E301", descripcion: "Corte de energía AC", zona: null, prioridad: 3, estado: "PROCESADO", fecha_evento: hace(49), resolucion: "Corte de zona, EDEERSA confirmó reposición." },
    { codigo: "R301", descripcion: "Restauración de energía AC", zona: null, prioridad: 5, estado: "PROCESADO", fecha_evento: hace(47) },
    { codigo: "E130", descripcion: "Alarma de robo — PIR living", zona: "Z01", prioridad: 1, estado: "PROCESADO", fecha_evento: hace(30), resolucion: "Falsa alarma: mascota. Cliente avisado por WhatsApp." },
    { codigo: "R130", descripcion: "Restauración alarma de robo", zona: "Z01", prioridad: 4, estado: "PROCESADO", fecha_evento: hace(29.8) },
    { codigo: "E602", descripcion: "Test periódico recibido", zona: null, prioridad: 6, estado: "PROCESADO_NO_ALERTA", fecha_evento: hace(22) },
    { codigo: "E383", descripcion: "Tamper de sensor — Puerta principal", zona: "Z02", prioridad: 2, estado: "NUEVO", fecha_evento: hace(3) },
    { codigo: "E602", descripcion: "Test periódico recibido", zona: null, prioridad: 6, estado: "PROCESADO_NO_ALERTA", fecha_evento: hace(1.5) },
    { codigo: "E130", descripcion: "Alarma de robo — Puerta principal", zona: "Z02", prioridad: 1, estado: "NUEVO", fecha_evento: hace(0.4) },
  ] as const;

  // Idempotencia simple: borrar los eventos demo previos y recrear.
  await prisma.eventoAlarma.deleteMany({ where: { cuenta_id: cuenta.id } });
  for (const e of eventos) {
    await prisma.eventoAlarma.create({
      data: {
        cuenta_id: cuenta.id,
        softguard_ref: SG_REF_DEMO,
        fecha_evento: e.fecha_evento,
        codigo: e.codigo,
        descripcion: e.descripcion,
        zona: e.zona,
        prioridad: e.prioridad,
        estado: e.estado,
        resolucion: "resolucion" in e ? (e as { resolucion?: string }).resolucion : undefined,
        operador_softguard: "Demo",
      },
    });
  }
  console.log(`✓ ${eventos.length} eventos (2 NUEVOS en la cola de monitoreo)\n`);

  console.log("── Credenciales demo (BORRAR al terminar: --borrar) ────────");
  console.log(`  /portal  ${CLIENTE.email}  /  ${CLIENTE.password}`);
  console.log(`  /admin   ${ADMIN.email}  /  ${ADMIN.password}`);
}

const modo = process.argv.includes("--borrar") ? borrar : crear;
modo()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

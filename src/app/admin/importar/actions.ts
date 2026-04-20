"use server";

import { Readable } from "stream";
import { parse } from "csv-parse";
import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma/client";

const rowSchema = z.object({
  codigo_cuenta: z.string().min(1),
  nombre: z.string().min(1),
  dni: z.string().optional().transform((v) => v || undefined),
  telefono: z.string().optional().transform((v) => v || undefined),
  direccion: z.string().min(1),
  tipo_servicio: z.enum(["ALARMA", "DOMOTICA", "CAMARA", "STARLINK", "OTRO"]),
  activa: z
    .string()
    .transform((v) => ["SI", "si", "true", "1", "TRUE"].includes(v)),
  zonas: z
    .string()
    .optional()
    .transform((v) => {
      if (!v) return [];
      try {
        return JSON.parse(v) as Array<{
          codigo: string;
          nombre: string;
          tipo: string;
          activa: boolean;
        }>;
      } catch {
        return [];
      }
    }),
});

const CATEGORIA_MAP: Record<string, string> = {
  ALARMA: "ALARMA_MONITOREO",
  DOMOTICA: "DOMOTICA",
  CAMARA: "CAMARA_CCTV",
  STARLINK: "ANTENA_STARLINK",
  OTRO: "OTRO",
};

export interface ImportResult {
  ok: number;
  errores: string[];
}

export async function importarCsvSoftguard(
  formData: FormData
): Promise<ImportResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const perfil = await prisma.perfil.findUnique({ where: { id: user.id } });
  if (perfil?.rol !== "ADMIN") {
    return { ok: 0, errores: ["Sin permisos de administrador."] };
  }

  const archivo = formData.get("csv") as File | null;
  if (!archivo || archivo.size === 0) {
    return { ok: 0, errores: ["No se recibió ningún archivo."] };
  }
  // Validación de tipo en servidor — el atributo `accept` del input es solo UX,
  // puede bypassarse con herramientas como curl o Burp.
  const MIME_CSV_PERMITIDOS = new Set([
    "text/csv",
    "text/plain",
    "application/csv",
    "application/vnd.ms-excel",
  ]);
  const extension = archivo.name.split(".").pop()?.toLowerCase();
  if (extension !== "csv" || !MIME_CSV_PERMITIDOS.has(archivo.type)) {
    return { ok: 0, errores: ["Solo se aceptan archivos .csv."] };
  }
  // Límite de 5MB — un CSV de Softguard con 500 cuentas y zonas no supera 1MB.
  // Previene DoS por agotamiento de memoria.
  const MAX_SIZE_BYTES = 5 * 1024 * 1024;
  if (archivo.size > MAX_SIZE_BYTES) {
    return { ok: 0, errores: ["El archivo supera el límite de 5MB."] };
  }

  const buffer = Buffer.from(await archivo.arrayBuffer());
  const resultado: ImportResult = { ok: 0, errores: [] };
  const adminAuth = createAdminClient();

  const stream = Readable.from(buffer);
  const parser = stream.pipe(
    parse({ columns: true, skip_empty_lines: true, trim: true })
  );

  for await (const rawRow of parser) {
    const parsed = rowSchema.safeParse(rawRow);
    if (!parsed.success) {
      resultado.errores.push(
        `Fila inválida (${rawRow.codigo_cuenta ?? "?"}): ${parsed.error.issues[0]?.message}`
      );
      continue;
    }

    const { codigo_cuenta, nombre, dni, telefono, direccion, tipo_servicio, activa, zonas } =
      parsed.data;

    try {
      // Buscar perfil existente por DNI
      let perfilId: string;
      const perfilExistente = dni
        ? await prisma.perfil.findUnique({ where: { dni } })
        : null;

      if (perfilExistente) {
        perfilId = perfilExistente.id;
        await prisma.perfil.update({
          where: { id: perfilId },
          data: { nombre, ...(telefono && { telefono }) },
        });
      } else {
        const emailInterno = dni
          ? `dni_${dni}@${process.env.ADMIN_EMAIL_DOMAIN!}`
          : `cuenta_${codigo_cuenta}@${process.env.ADMIN_EMAIL_DOMAIN!}`;

        // Crear usuario en Supabase Auth
        const { data: authData, error: authError } =
          await adminAuth.auth.admin.createUser({
            email: emailInterno,
            user_metadata: { nombre, ...(dni && { dni }) },
            email_confirm: true,
          });

        if (authError) {
          // Usuario Auth ya existe — buscar perfil en BD por email (camino rápido)
          const perfilPorEmail = await prisma.perfil.findFirst({
            where: { email: emailInterno },
            select: { id: true },
          });
          if (perfilPorEmail) {
            perfilId = perfilPorEmail.id;
          } else {
            // Auth existe pero no hay Perfil — obtener el ID de Auth y crear el perfil
            const { data: page1 } = await adminAuth.auth.admin.listUsers({ page: 1, perPage: 1000 });
            const found = page1?.users?.find((u) => u.email === emailInterno);
            if (!found) {
              resultado.errores.push(`Error auth para ${codigo_cuenta}: ${authError.message}`);
              continue;
            }
            perfilId = found.id;
            await prisma.perfil.create({
              data: {
                id: perfilId,
                nombre,
                ...(dni && { dni }),
                ...(telefono && { telefono }),
                email: emailInterno,
                rol: "CLIENTE",
              },
            });
          }
        } else {
          perfilId = authData.user.id;
          await prisma.perfil.create({
            data: {
              id: perfilId,
              nombre,
              ...(dni && { dni }),
              ...(telefono && { telefono }),
              email: emailInterno,
              rol: "CLIENTE",
            },
          });
        }
      }

      // Upsert de la cuenta
      const cuenta = await prisma.cuenta.upsert({
        where: { softguard_ref: codigo_cuenta },
        create: {
          softguard_ref: codigo_cuenta,
          perfil_id: perfilId,
          descripcion: direccion,
          categoria: CATEGORIA_MAP[tipo_servicio] as never,
          estado: activa ? "ACTIVA" : "SUSPENDIDA_PAGO",
          costo_mensual: 20000,
        },
        update: {
          estado: activa ? "ACTIVA" : "SUSPENDIDA_PAGO",
          descripcion: direccion,
          perfil_id: perfilId,
        },
      });

      // Upsert de sensores
      for (const zona of zonas) {
        await prisma.sensor.upsert({
          where: {
            cuenta_id_codigo_zona: {
              cuenta_id: cuenta.id,
              codigo_zona: zona.codigo,
            },
          },
          create: {
            cuenta_id: cuenta.id,
            codigo_zona: zona.codigo,
            etiqueta: zona.nombre,
            tipo: zona.tipo as never,
            activa: zona.activa,
          },
          update: {
            etiqueta: zona.nombre,
            activa: zona.activa,
          },
        });
      }

      resultado.ok++;
    } catch (e) {
      resultado.errores.push(
        `Error procesando ${codigo_cuenta}: ${String(e)}`
      );
    }
  }

  return resultado;
}

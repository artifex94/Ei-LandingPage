import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

async function verificarAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const perfil = await prisma.perfil.findUnique({ where: { id: user.id } });
  return perfil?.rol === "ADMIN" ? perfil : null;
}

export async function GET(req: NextRequest) {
  const admin = await verificarAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const tipo = searchParams.get("tipo") ?? "clientes";

  const mesRaw  = Number(searchParams.get("mes")  ?? new Date().getMonth() + 1);
  const anioRaw = Number(searchParams.get("anio") ?? new Date().getFullYear());

  // Validar rangos para evitar NaN o valores fuera de rango en el where de Prisma
  if (!Number.isInteger(mesRaw)  || mesRaw  < 1 || mesRaw  > 12)
    return NextResponse.json({ error: "Mes inválido (1–12)." }, { status: 400 });
  if (!Number.isInteger(anioRaw) || anioRaw < 2020 || anioRaw > 2100)
    return NextResponse.json({ error: "Año inválido." }, { status: 400 });

  const mes  = mesRaw;
  const anio = anioRaw;

  let rows: Record<string, unknown>[] = [];
  let nombre = "";

  if (tipo === "clientes") {
    const clientes = await prisma.perfil.findMany({
      where: { rol: "CLIENTE" },
      include: {
        cuentas: {
          where: { estado: { not: "BAJA_DEFINITIVA" } },
          select: { descripcion: true, categoria: true, costo_mensual: true, estado: true },
        },
      },
      orderBy: { nombre: "asc" },
      take: 10_000,
    });

    rows = clientes.map((c) => ({
      Nombre: c.nombre,
      DNI: c.dni ?? "",
      Email: c.email ?? "",
      Teléfono: c.telefono ?? "",
      Tipo: c.tipo_titular ?? "",
      Activo: c.activo ? "Sí" : "No",
      "Cuentas activas": c.cuentas.length,
      Alta: new Date(c.created_at).toLocaleDateString("es-AR"),
    }));
    nombre = "clientes";
  }

  else if (tipo === "cuentas") {
    const cuentas = await prisma.cuenta.findMany({
      include: { perfil: { select: { nombre: true, telefono: true, email: true } } },
      orderBy: { descripcion: "asc" },
      take: 10_000,
    });

    rows = cuentas.map((c) => ({
      Descripción: c.descripcion,
      "Ref. Softguard": c.softguard_ref,
      Cliente: c.perfil.nombre,
      Teléfono: c.perfil.telefono ?? "",
      Email: c.perfil.email ?? "",
      Categoría: c.categoria,
      Estado: c.estado,
      "Costo mensual": Number(c.costo_mensual),
      Localidad: c.localidad ?? "",
      Provincia: c.provincia ?? "",
    }));
    nombre = "cuentas";
  }

  else if (tipo === "pagos") {
    const MESES = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

    const pagos = await prisma.pago.findMany({
      where: { mes, anio },
      include: {
        cuenta: {
          include: { perfil: { select: { nombre: true, telefono: true } } },
        },
      },
      orderBy: { cuenta: { perfil: { nombre: "asc" } } },
    });

    rows = pagos.map((p) => ({
      Período: `${MESES[p.mes]} ${p.anio}`,
      Cliente: p.cuenta.perfil.nombre,
      Teléfono: p.cuenta.perfil.telefono ?? "",
      Cuenta: p.cuenta.descripcion,
      Estado: p.estado,
      Importe: Number(p.importe),
      Método: p.metodo ?? "",
      "Acreditado en": p.acreditado_en ? new Date(p.acreditado_en).toLocaleDateString("es-AR") : "",
      "Registrado por": p.registrado_por ?? "",
    }));
    nombre = `pagos_${mes}_${anio}`;
  }

  else {
    return NextResponse.json({ error: "Tipo inválido. Usá: clientes, cuentas, pagos" }, { status: 400 });
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);

  // Ancho automático de columnas
  const cols = rows.length > 0
    ? Object.keys(rows[0]).map((k) => ({
        wch: Math.max(k.length, ...rows.map((r) => String(r[k] ?? "").length)) + 2,
      }))
    : [];
  ws["!cols"] = cols;

  XLSX.utils.book_append_sheet(wb, ws, nombre.slice(0, 31));

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nombre}_${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}

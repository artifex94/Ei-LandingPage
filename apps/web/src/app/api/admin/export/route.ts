import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getSesionReal } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";

async function verificarAdmin() {
  const sesion = await getSesionReal();
  if (!sesion || sesion.perfil.rol !== "ADMIN") return null;
  return sesion.perfil;
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
      include: {
        perfil: { select: { nombre: true, telefono: true, email: true } },
        pagos: {
          where: { estado: { in: ["PENDIENTE", "VENCIDO"] } },
          select: { importe: true, estado: true },
        },
      },
      orderBy: { descripcion: "asc" },
      take: 10_000,
    });

    rows = cuentas.map((c) => {
      const deudaTotal = c.pagos.reduce((s, p) => s + Number(p.importe), 0);
      const tieneVencidos = c.pagos.some((p) => p.estado === "VENCIDO");
      return {
        Descripción: c.descripcion,
        "Ref. Softguard": c.softguard_ref,
        Cliente: c.perfil.nombre,
        Teléfono: c.perfil.telefono ?? "",
        Email: c.perfil.email ?? "",
        Categoría: c.categoria,
        Estado: c.estado,
        "Deuda pendiente": deudaTotal,
        "Mora": tieneVencidos ? "Sí" : "No",
        "Costo mensual": Number(c.costo_mensual),
        Localidad: c.localidad ?? "",
        Provincia: c.provincia ?? "",
      };
    });
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
      "Ref. Softguard": p.cuenta.softguard_ref,
      Estado: p.estado,
      Importe: Number(p.importe),
      Método: p.metodo ?? "",
      "Acreditado en": p.acreditado_en ? new Date(p.acreditado_en).toLocaleDateString("es-AR") : "",
      "Registrado por": p.registrado_por ?? "",
    }));
    nombre = `pagos_${mes}_${anio}`;
  }

  else if (tipo === "morosidad") {
    const MESES = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const ahora = new Date();
    const mesAhora = ahora.getMonth() + 1;
    const anioAhora = ahora.getFullYear();

    const pagosVencidos = await prisma.pago.findMany({
      where: {
        OR: [
          { estado: "VENCIDO" },
          {
            estado: "PENDIENTE",
            OR: [
              { anio: { lt: anioAhora } },
              { anio: anioAhora, mes: { lt: mesAhora } },
            ],
          },
        ],
      },
      include: {
        cuenta: { include: { perfil: { select: { nombre: true, telefono: true, email: true } } } },
      },
      orderBy: [{ cuenta: { perfil: { nombre: "asc" } } }, { anio: "asc" }, { mes: "asc" }],
      take: 10_000,
    });

    rows = pagosVencidos.map((p) => ({
      Cliente: p.cuenta.perfil.nombre,
      Teléfono: p.cuenta.perfil.telefono ?? "",
      Email: p.cuenta.perfil.email ?? "",
      Cuenta: p.cuenta.descripcion,
      Período: `${MESES[p.mes]} ${p.anio}`,
      Estado: p.estado,
      Importe: Number(p.importe),
    }));
    nombre = `morosidad_${new Date().toISOString().slice(0, 10)}`;
  }

  else if (tipo === "ots") {
    const TIPO_LABEL: Record<string, string> = {
      INSTALACION: "Instalación", CORRECTIVO: "Correctivo",
      PREVENTIVO: "Preventivo", RETIRO: "Retiro",
    };
    const ESTADO_LABEL: Record<string, string> = {
      SOLICITADA: "Solicitada", ASIGNADA: "Asignada", EN_RUTA: "En ruta",
      EN_SITIO: "En sitio", COMPLETADA: "Completada", CANCELADA: "Cancelada",
    };

    const ots = await prisma.ordenTrabajo.findMany({
      include: {
        perfil:  { select: { nombre: true, telefono: true } },
        cuenta:  { select: { descripcion: true, perfil: { select: { nombre: true, telefono: true } } } },
        tecnico: { include: { perfil: { select: { nombre: true } } } },
      },
      orderBy: { numero: "desc" },
      take: 10_000,
    });

    rows = ots.map((o) => ({
      "Nro.": String(o.numero).padStart(4, "0"),
      Tipo: TIPO_LABEL[o.tipo] ?? o.tipo,
      Estado: ESTADO_LABEL[o.estado] ?? o.estado,
      Descripción: o.descripcion,
      Cliente: o.cuenta?.perfil.nombre ?? o.perfil?.nombre ?? "",
      Teléfono: o.cuenta?.perfil.telefono ?? o.perfil?.telefono ?? "",
      Cuenta: o.cuenta?.descripcion ?? "",
      Técnico: o.tecnico?.perfil.nombre ?? "",
      "Fecha visita": o.fecha_visita
        ? new Date(o.fecha_visita).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
        : "",
      Conformidad: o.conformidad_firmada ? "Sí" : "No",
      Creada: new Date(o.created_at).toLocaleDateString("es-AR"),
    }));
    nombre = `ots_${new Date().toISOString().slice(0, 10)}`;
  }

  else {
    return NextResponse.json({ error: "Tipo inválido. Usá: clientes, cuentas, pagos, morosidad, ots" }, { status: 400 });
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

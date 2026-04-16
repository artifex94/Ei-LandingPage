/**
 * Máquina de estados financiero — PDF PRD §2.3
 *
 * Función pura: sin efectos, sin imports de React ni de Prisma.
 * Se puede usar en Server Components, layouts y scripts de cron.
 */

export type EstadoFinanciero =
  | { tipo: "ACTIVE" }
  | { tipo: "GRACE_PERIOD"; dias_mora: number }
  | { tipo: "SUSPENDED"; dias_mora: number }
  | { tipo: "PAYMENT_IN_REVIEW" };

export interface PagoParaEstado {
  estado: string;
  mes: number;
  anio: number;
}

/**
 * Calcula el estado financiero de una cuenta a partir de su estado en BD
 * y sus pagos pendientes/vencidos/procesando.
 *
 * @param estadoCuenta  - EstadoCuenta del modelo Prisma (string)
 * @param pagos         - Pagos con estado PENDIENTE | VENCIDO | PROCESANDO
 * @param overrideActivo - Si hay un override de suspensión activo
 * @param overrideExpira - Fecha de expiración del override
 */
export function calcularEstadoFinanciero(
  estadoCuenta: string,
  pagos: PagoParaEstado[],
  overrideActivo = false,
  overrideExpira: Date | null = null
): EstadoFinanciero {
  // Override activo y vigente → forzar ACTIVE temporalmente
  if (overrideActivo && overrideExpira && overrideExpira > new Date()) {
    return { tipo: "ACTIVE" };
  }

  // Cuenta marcada como suspendida manualmente en BD
  if (estadoCuenta === "SUSPENDIDA_PAGO") {
    return { tipo: "SUSPENDED", dias_mora: calcDPD(pagos) };
  }

  // Pago en proceso de verificación manual
  if (pagos.some((p) => p.estado === "PROCESANDO")) {
    return { tipo: "PAYMENT_IN_REVIEW" };
  }

  const dpd = calcDPD(pagos);
  if (dpd >= 15) return { tipo: "SUSPENDED", dias_mora: dpd };
  if (dpd >= 1)  return { tipo: "GRACE_PERIOD", dias_mora: dpd };
  return { tipo: "ACTIVE" };
}

/**
 * Days Past Due: días transcurridos desde el vencimiento del pago más antiguo impago.
 * Vencimiento = último día del mes indicado en el pago.
 */
function calcDPD(pagos: PagoParaEstado[]): number {
  const impagos = pagos.filter(
    (p) => p.estado === "VENCIDO" || p.estado === "PENDIENTE"
  );
  if (!impagos.length) return 0;

  // Pago más antiguo (menor anio, luego menor mes)
  const oldest = impagos.reduce((a, b) =>
    a.anio < b.anio || (a.anio === b.anio && a.mes < b.mes) ? a : b
  );

  // Último día del mes del pago
  // new Date(año, mes, 0): mes en JS es 0-indexed, por eso mes sin restar
  // Ej: mes=4 (abril) → new Date(2026, 4, 0) = 30 de abril de 2026 ✓
  const vencimiento = new Date(oldest.anio, oldest.mes, 0);

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const diffMs = hoy.getTime() - vencimiento.getTime();
  return Math.max(0, Math.floor(diffMs / 86_400_000));
}

/**
 * Calcula el peor estado financiero entre múltiples cuentas.
 * Útil para el portal layout (banner global / modal bloqueante).
 */
export function peorEstadoFinanciero(
  estados: EstadoFinanciero[]
): EstadoFinanciero {
  if (estados.some((e) => e.tipo === "SUSPENDED")) {
    const maxDPD = Math.max(
      ...estados
        .filter((e): e is Extract<EstadoFinanciero, { tipo: "SUSPENDED" }> => e.tipo === "SUSPENDED")
        .map((e) => e.dias_mora)
    );
    return { tipo: "SUSPENDED", dias_mora: maxDPD };
  }
  if (estados.some((e) => e.tipo === "GRACE_PERIOD")) {
    const maxDPD = Math.max(
      ...estados
        .filter((e): e is Extract<EstadoFinanciero, { tipo: "GRACE_PERIOD" }> => e.tipo === "GRACE_PERIOD")
        .map((e) => e.dias_mora)
    );
    return { tipo: "GRACE_PERIOD", dias_mora: maxDPD };
  }
  if (estados.some((e) => e.tipo === "PAYMENT_IN_REVIEW")) {
    return { tipo: "PAYMENT_IN_REVIEW" };
  }
  return { tipo: "ACTIVE" };
}

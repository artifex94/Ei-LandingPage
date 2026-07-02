/**
 * Arma, en el server, los motivos de mensaje aplicables a un cliente con sus textos
 * YA construidos (strings serializables) para pasarlos a `BotonEnviarWhatsApp` (client).
 *
 * Así las plantillas (que importan `siteConfig`) se ejecutan del lado server y el cliente
 * solo recibe data — evita pasar funciones a través del límite RSC.
 */

import { siteConfig } from "@/config/site";
import { resumenDeudaCuentas } from "./billing-deuda";
import { etiquetaCuenta } from "./whatsapp";
import {
  ETIQUETA_MOTIVO,
  mensajeRecordatorioPago,
  mensajeVencimientoProximo,
  mensajeConfirmacionPago,
  mensajeMoraSuspension,
  mensajeCambioTarifa,
  mensajeReactivacionServicio,
  mensajeBienvenida,
  mensajeVisitaTecnica,
  mensajePruebaAlarma,
  mensajeSinComunicacion,
  mensajeActualizarDatos,
  mensajeAvisoGeneral,
  type MotivoMensaje,
  type DeudaPorCuenta,
} from "./whatsapp-templates";

// Una confirmación de pago solo tiene sentido si el pago se acreditó hace poco.
const CONFIRMACION_RECIENTE_MS = 10 * 24 * 60 * 60 * 1000;

// A partir de cuántos períodos impagos la cobranza también ofrece el aviso de mora (tono más firme).
const UMBRAL_MORA = 3;

export interface PagoParaMotivos {
  mes: number;
  anio: number;
  importe: number;
  estado: string;
  acreditadoEnISO?: string | null; // fecha real de acreditación (para confirmación)
}

export interface MotivoOpcion {
  motivo: MotivoMensaje;
  label: string;
  mensaje: string; // texto pre-construido (editable luego en el preview)
}

/** Pagos de UNA cuenta, ya agrupados, para armar el desglose por cuenta (titulares con 2+ cuentas). */
export interface PagosPorCuenta {
  etiqueta: string;
  pagos: PagoParaMotivos[];
}

/** Cuenta con sus pagos ya proyectados a `PagoParaMotivos`, insumo de `agruparPagosPorCuenta`. */
export interface CuentaParaAgrupar {
  descripcion?: string | null;
  calle?: string | null;
  softguard_ref?: string | null;
  pagos: PagoParaMotivos[];
}

/**
 * Agrupa los pagos de un titular por cuenta para el desglose de mensajería. SIN gate: agrupa
 * SIEMPRE, sea cual sea la cantidad de cuentas — la decisión de si el desglose se MUESTRA queda
 * en un solo lugar: `motivosDeCobranza` descarta las cuentas sin deuda y el template colapsa al
 * formato clásico (sin viñetas) cuando queda una sola cuenta con deuda. Así todos los callers
 * (cobros, morosidad, mensajería, ficha de cliente) comparten la MISMA política.
 */
export function agruparPagosPorCuenta(cuentas: CuentaParaAgrupar[]): PagosPorCuenta[] {
  return cuentas.map((c) => ({
    etiqueta: etiquetaCuenta({ descripcion: c.descripcion, calle: c.calle, softguardRef: c.softguard_ref }),
    pagos: c.pagos,
  }));
}

/**
 * Motivos disponibles según los pagos del cliente:
 *   - RECORDATORIO_PAGO   si hay deuda (PENDIENTE/VENCIDO)
 *   - VENCIMIENTO_PROXIMO si hay un PENDIENTE del período corriente Y todavía no venció
 *   - CONFIRMACION_PAGO   si está al día y hay un pago acreditado en los últimos días
 *   - LIBRE               siempre (el operador redacta)
 *
 * IMPORTANTE: pasá los pagos COMPLETOS (toda la deuda impaga + pagos recientes), no un
 * subconjunto paginado, o el monto/los meses del recordatorio saldrán mal.
 *
 * `pagosPorCuenta` es opcional (ver `agruparPagosPorCuenta`): cuando viene, acá se arma el
 * desglose (`resumenDeudaCuentas` por grupo) que viaja a
 * `mensajeRecordatorioPago`/`mensajeMoraSuspension`, Y el agregado (total/meses adeudados) se
 * DERIVA del mismo desglose (flatten pre-filtro de $0) en vez del parámetro `pagos` — así total
 * y desglose salen de la MISMA fuente por construcción y no pueden desincronizarse. Sin
 * `pagosPorCuenta`, el agregado sigue saliendo de `pagos` como siempre (retrocompatible).
 */
export function motivosDeCobranza(
  nombreContacto: string,
  pagos: PagoParaMotivos[],
  pagosPorCuenta?: PagosPorCuenta[],
): MotivoOpcion[] {
  const opciones: MotivoOpcion[] = [];
  const resumen = pagosPorCuenta
    ? resumenDeudaCuentas(pagosPorCuenta.flatMap((g) => g.pagos))
    : resumenDeudaCuentas(pagos);
  // Solo cuentas CON deuda: en la ficha de cliente los grupos traen también pagos
  // acreditados recientes, y una cuenta al día no debe aparecer como "· *Local*: $0".
  const desglose: DeudaPorCuenta[] | undefined = pagosPorCuenta
    ?.map((g) => {
      const r = resumenDeudaCuentas(g.pagos);
      return { etiqueta: g.etiqueta, monto: r.deudaTotal, meses: r.mesesAdeudados };
    })
    .filter((d) => d.monto > 0);

  if (resumen.deudaTotal > 0) {
    opciones.push({
      motivo: "RECORDATORIO_PAGO",
      label: ETIQUETA_MOTIVO.RECORDATORIO_PAGO,
      mensaje: mensajeRecordatorioPago({
        nombreContacto,
        deudaTotal: resumen.deudaTotal,
        mesesAdeudados: resumen.mesesAdeudados,
        desglose,
      }),
    });

    // Mora acumulada: además del recordatorio, ofrecé el aviso de tono más firme.
    // Es una opción adicional (no reemplaza al recordatorio): el operador elige el tono.
    if (resumen.mesesAdeudados.length >= UMBRAL_MORA) {
      opciones.push({
        motivo: "MORA_SUSPENSION",
        label: ETIQUETA_MOTIVO.MORA_SUSPENSION,
        mensaje: mensajeMoraSuspension({
          nombreContacto,
          deudaTotal: resumen.deudaTotal,
          mesesAdeudados: resumen.mesesAdeudados,
          desglose,
        }),
      });
    }
  }

  // Vencimiento próximo: solo mientras el período corriente NO haya vencido todavía
  // (pasado el día de vto, ese período ya cae en RECORDATORIO_PAGO).
  const ahora = new Date();
  const corriente = pagos.find(
    (p) => p.estado === "PENDIENTE" && p.mes === ahora.getMonth() + 1 && p.anio === ahora.getFullYear(),
  );
  if (corriente && ahora.getDate() <= siteConfig.fiscal.diaVtoPago) {
    opciones.push({
      motivo: "VENCIMIENTO_PROXIMO",
      label: ETIQUETA_MOTIVO.VENCIMIENTO_PROXIMO,
      mensaje: mensajeVencimientoProximo({
        nombreContacto,
        importe: corriente.importe,
        mes: corriente.mes,
        anio: corriente.anio,
      }),
    });
  }

  // Confirmación: solo si está al día (deuda 0) y hay un pago acreditado hace poco.
  // Se elige por fecha de acreditación REAL (no por el período más alto).
  if (resumen.deudaTotal === 0) {
    const ultimoPagado = pagos
      .filter((p) => p.estado === "PAGADO" && p.acreditadoEnISO)
      .sort((a, b) => new Date(b.acreditadoEnISO!).getTime() - new Date(a.acreditadoEnISO!).getTime())[0];
    if (ultimoPagado && ahora.getTime() - new Date(ultimoPagado.acreditadoEnISO!).getTime() <= CONFIRMACION_RECIENTE_MS) {
      opciones.push({
        motivo: "CONFIRMACION_PAGO",
        label: ETIQUETA_MOTIVO.CONFIRMACION_PAGO,
        mensaje: mensajeConfirmacionPago({
          nombreContacto,
          mes: ultimoPagado.mes,
          anio: ultimoPagado.anio,
          importe: ultimoPagado.importe,
        }),
      });
    }
  }

  opciones.push({ motivo: "LIBRE", label: ETIQUETA_MOTIVO.LIBRE, mensaje: "" });
  return opciones;
}

/**
 * Catálogo de mensajes NO dependientes del estado de pago (operación, servicio técnico y
 * relación). Pensado para las fichas de cliente/cuenta, donde el operador necesita un mensaje
 * puntual. Los textos vienen pre-armados con saludo por hora; los que requieren un dato que el
 * operador conoce (día, monto, fecha) traen placeholders `[...]` que se completan en el preview.
 *
 * NO se usa en los hubs de cobranza (mensajería, morosidad), que solo muestran motivos de deuda.
 */
export function motivosGenerales(nombreContacto: string): MotivoOpcion[] {
  const item = (motivo: MotivoMensaje, mensaje: string): MotivoOpcion => ({
    motivo,
    label: ETIQUETA_MOTIVO[motivo],
    mensaje,
  });
  return [
    item("BIENVENIDA", mensajeBienvenida({ nombreContacto })),
    item("VISITA_TECNICA", mensajeVisitaTecnica({ nombreContacto })),
    item("PRUEBA_ALARMA", mensajePruebaAlarma({ nombreContacto })),
    item("SIN_COMUNICACION", mensajeSinComunicacion({ nombreContacto })),
    item("CAMBIO_TARIFA", mensajeCambioTarifa({ nombreContacto })),
    item("REACTIVACION_SERVICIO", mensajeReactivacionServicio({ nombreContacto })),
    item("ACTUALIZAR_DATOS", mensajeActualizarDatos({ nombreContacto })),
    item("AVISO_GENERAL", mensajeAvisoGeneral({ nombreContacto })),
  ];
}

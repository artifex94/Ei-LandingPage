/**
 * Arma, en el server, los motivos de mensaje aplicables a un cliente con sus textos
 * YA construidos (strings serializables) para pasarlos a `BotonEnviarWhatsApp` (client).
 *
 * Así las plantillas (que importan `siteConfig`) se ejecutan del lado server y el cliente
 * solo recibe data — evita pasar funciones a través del límite RSC.
 */

import { siteConfig } from "@/config/site";
import { resumenDeudaCuentas } from "./billing-deuda";
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

/**
 * Motivos disponibles según los pagos del cliente:
 *   - RECORDATORIO_PAGO   si hay deuda (PENDIENTE/VENCIDO)
 *   - VENCIMIENTO_PROXIMO si hay un PENDIENTE del período corriente Y todavía no venció
 *   - CONFIRMACION_PAGO   si está al día y hay un pago acreditado en los últimos días
 *   - LIBRE               siempre (el operador redacta)
 *
 * IMPORTANTE: pasá los pagos COMPLETOS (toda la deuda impaga + pagos recientes), no un
 * subconjunto paginado, o el monto/los meses del recordatorio saldrán mal.
 */
export function motivosDeCobranza(nombreContacto: string, pagos: PagoParaMotivos[]): MotivoOpcion[] {
  const opciones: MotivoOpcion[] = [];
  const resumen = resumenDeudaCuentas(pagos);

  if (resumen.deudaTotal > 0) {
    opciones.push({
      motivo: "RECORDATORIO_PAGO",
      label: ETIQUETA_MOTIVO.RECORDATORIO_PAGO,
      mensaje: mensajeRecordatorioPago({
        nombreContacto,
        deudaTotal: resumen.deudaTotal,
        mesesAdeudados: resumen.mesesAdeudados,
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

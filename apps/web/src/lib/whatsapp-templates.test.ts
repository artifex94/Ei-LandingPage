import { describe, it, expect } from "vitest";
import {
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
  ETIQUETA_MOTIVO,
} from "./whatsapp-templates";

// Fechas de referencia (UTC) → hora AR (UTC-3) → saludo esperado, para asertar determinísticamente.
const MANANA = new Date("2026-06-19T13:00:00Z"); // 10:00 AR → "Buenos días"
const TARDE = new Date("2026-06-19T18:00:00Z"); // 15:00 AR → "Buenas tardes"
const NOCHE = new Date("2026-06-19T01:00:00Z"); // 22:00 AR (18/06) → "Buenas noches"

describe("plantillas de mensajería al cliente", () => {
  it("recordatorio de pago: saludo por hora, monto es-AR, meses y link al portal", () => {
    const msg = mensajeRecordatorioPago({
      nombreContacto: "Juan Pérez",
      deudaTotal: 30000,
      mesesAdeudados: [
        { mes: 4, anio: 2026 },
        { mes: 5, anio: 2026 },
      ],
      ahora: MANANA,
    });
    expect(msg).toContain("Buenos días, Juan.");
    expect(msg).toContain("$30.000");
    expect(msg).toContain("abril 2026, mayo 2026");
    expect(msg).toContain("/portal/pagos");
  });

  it("recordatorio sin meses no deja paréntesis vacíos y saluda sin nombre", () => {
    const msg = mensajeRecordatorioPago({ nombreContacto: "", deudaTotal: 15000, mesesAdeudados: [], ahora: TARDE });
    expect(msg).toContain("Buenas tardes.");
    expect(msg).toContain("$15.000");
    expect(msg).not.toContain("()");
  });

  it("vencimiento próximo: período, importe y día de vencimiento", () => {
    const msg = mensajeVencimientoProximo({ nombreContacto: "Ana", importe: 15000, mes: 6, anio: 2026, ahora: TARDE });
    expect(msg).toContain("*Vencimiento próximo*");
    expect(msg).toContain("Buenas tardes, Ana.");
    expect(msg).toContain("junio 2026");
    expect(msg).toContain("vence el día *10*");
  });

  it("confirmación de pago agradece y marca al día", () => {
    const msg = mensajeConfirmacionPago({ nombreContacto: "Ana López", mes: 5, anio: 2026, importe: 15000, ahora: NOCHE });
    expect(msg).toContain("*Pago recibido*");
    expect(msg).toContain("Buenas noches, Ana.");
    expect(msg).toContain("Recibimos tu pago de *mayo 2026*");
    expect(msg).toContain("al día");
  });
});

describe("plantillas de cobranza — escalación", () => {
  it("mora/suspensión: tono firme, deuda y portal, sin mayúsculas alarmantes", () => {
    const msg = mensajeMoraSuspension({
      nombreContacto: "Juan",
      deudaTotal: 45000,
      mesesAdeudados: [
        { mes: 3, anio: 2026 },
        { mes: 4, anio: 2026 },
        { mes: 5, anio: 2026 },
      ],
      ahora: MANANA,
    });
    expect(msg).toContain("*Aviso de pago pendiente*");
    expect(msg).toContain("Buenos días, Juan.");
    expect(msg).toContain("$45.000");
    expect(msg).toContain("interrumpir el servicio de monitoreo");
    expect(msg).toContain("/portal/pagos");
    expect(msg).not.toContain("SUSPENSIÓN");
  });

  it("cambio de tarifa: placeholders editables de mes y monto", () => {
    const msg = mensajeCambioTarifa({ nombreContacto: "Ana", ahora: TARDE });
    expect(msg).toContain("*Actualización de cuota*");
    expect(msg).toContain("Buenas tardes, Ana.");
    expect(msg).toContain("[mes]");
    expect(msg).toContain("[monto]");
  });

  it("reactivación de servicio: confirma al día y monitoreo activo", () => {
    const msg = mensajeReactivacionServicio({ nombreContacto: "Ana", ahora: MANANA });
    expect(msg).toContain("*Servicio reactivado*");
    expect(msg).toContain("monitoreo está activo nuevamente");
  });
});

describe("plantillas de operación y relación", () => {
  it("bienvenida: nombre de la empresa, portal y guardar número", () => {
    const msg = mensajeBienvenida({ nombreContacto: "Juan", ahora: TARDE });
    expect(msg).toContain("Bienvenido a Escobar Instalaciones");
    expect(msg).toContain("Buenas tardes, Juan.");
    expect(msg).toContain("/portal");
  });

  it("visita técnica: placeholder de día y horario", () => {
    const msg = mensajeVisitaTecnica({ nombreContacto: "Juan", ahora: MANANA });
    expect(msg).toContain("*Visita técnica*");
    expect(msg).toContain("[día y horario]");
  });

  it("prueba de alarma: avisa de la prueba de comunicación", () => {
    const msg = mensajePruebaAlarma({ nombreContacto: "Juan", ahora: MANANA });
    expect(msg).toContain("*Prueba de alarma*");
    expect(msg).toContain("comunica bien con la central");
  });

  it("sin comunicación: placeholder de fecha/hora y pedido de revisión", () => {
    const msg = mensajeSinComunicacion({ nombreContacto: "Juan", ahora: NOCHE });
    expect(msg).toContain("dejó de comunicar");
    expect(msg).toContain("[fecha/hora]");
    expect(msg).not.toContain("ALARMA");
  });

  it("actualizar datos: pregunta por número y dirección", () => {
    const msg = mensajeActualizarDatos({ nombreContacto: "Juan", ahora: TARDE });
    expect(msg).toContain("*Actualización de datos*");
    expect(msg).toContain("número y la misma dirección");
  });

  it("aviso general: saludo armado + cuerpo libre en [mensaje]", () => {
    const msg = mensajeAvisoGeneral({ nombreContacto: "Juan", ahora: MANANA });
    expect(msg).toBe("*Aviso*\n\nBuenos días, Juan. [mensaje]");
  });
});

describe("ETIQUETA_MOTIVO", () => {
  it("expone etiquetas legibles por motivo, incluidas las nuevas", () => {
    expect(ETIQUETA_MOTIVO.RECORDATORIO_PAGO).toBe("Recordatorio de pago");
    expect(ETIQUETA_MOTIVO.VENCIMIENTO_PROXIMO).toBe("Vencimiento próximo");
    expect(ETIQUETA_MOTIVO.MORA_SUSPENSION).toBe("Aviso de mora");
    expect(ETIQUETA_MOTIVO.BIENVENIDA).toBe("Bienvenida");
    expect(ETIQUETA_MOTIVO.VISITA_TECNICA).toBe("Visita técnica");
  });
});

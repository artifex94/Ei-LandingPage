import { describe, it, expect } from "vitest";
import {
  mensajeRecordatorioPago,
  mensajeVencimientoProximo,
  mensajeConfirmacionPago,
  ETIQUETA_MOTIVO,
} from "./whatsapp-templates";

describe("plantillas de mensajería al cliente", () => {
  it("recordatorio de pago: saludo, monto es-AR, meses y link al portal", () => {
    const msg = mensajeRecordatorioPago({
      nombreContacto: "Juan Pérez",
      deudaTotal: 30000,
      mesesAdeudados: [
        { mes: 4, anio: 2026 },
        { mes: 5, anio: 2026 },
      ],
    });
    expect(msg).toContain("Hola Juan.");
    expect(msg).toContain("$30.000");
    expect(msg).toContain("abril 2026, mayo 2026");
    expect(msg).toContain("/portal/pagos");
  });

  it("recordatorio sin meses no deja paréntesis vacíos", () => {
    const msg = mensajeRecordatorioPago({ nombreContacto: "", deudaTotal: 15000, mesesAdeudados: [] });
    expect(msg).toContain("Hola.");
    expect(msg).toContain("$15.000");
    expect(msg).not.toContain("()");
  });

  it("vencimiento próximo: período, importe y día de vencimiento", () => {
    const msg = mensajeVencimientoProximo({ nombreContacto: "Ana", importe: 15000, mes: 6, anio: 2026 });
    expect(msg).toContain("Hola Ana.");
    expect(msg).toContain("junio 2026");
    expect(msg).toContain("vence el día 10");
  });

  it("confirmación de pago agradece y marca al día", () => {
    const msg = mensajeConfirmacionPago({ nombreContacto: "Ana López", mes: 5, anio: 2026, importe: 15000 });
    expect(msg).toContain("Recibimos tu pago de mayo 2026");
    expect(msg).toContain("al día");
  });

  it("expone etiquetas legibles por motivo", () => {
    expect(ETIQUETA_MOTIVO.RECORDATORIO_PAGO).toBe("Recordatorio de pago");
    expect(ETIQUETA_MOTIVO.VENCIMIENTO_PROXIMO).toBe("Vencimiento próximo");
  });
});

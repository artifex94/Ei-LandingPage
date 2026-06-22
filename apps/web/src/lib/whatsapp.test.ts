import { describe, it, expect } from "vitest";
import {
  normalizarTelefono,
  linkWhatsApp,
  mensajeEventoP1,
  mensajeEventosP1,
  mensajeEvento,
  categoriaEvento,
} from "./whatsapp";

describe("normalizarTelefono", () => {
  it("acepta 10 dígitos tal cual", () => {
    expect(normalizarTelefono("3436575372")).toBe("3436575372");
  });
  it("quita el 0 inicial (11 dígitos)", () => {
    expect(normalizarTelefono("03436575372")).toBe("3436575372");
  });
  it("quita el prefijo 549 (13 dígitos)", () => {
    expect(normalizarTelefono("5493436575372")).toBe("3436575372");
  });
  it("quita el prefijo 54 (12 dígitos)", () => {
    expect(normalizarTelefono("543436575372")).toBe("3436575372");
  });
  it("ignora separadores y formato internacional", () => {
    expect(normalizarTelefono("+54 9 343 657-5372")).toBe("3436575372");
  });
  it("devuelve null si no se puede normalizar", () => {
    expect(normalizarTelefono("123")).toBeNull();
    expect(normalizarTelefono("")).toBeNull();
    expect(normalizarTelefono("abc")).toBeNull();
  });
});

describe("linkWhatsApp", () => {
  it("arma el link con prefijo 549 y 10 dígitos", () => {
    expect(linkWhatsApp("3436575372")).toBe("https://wa.me/5493436575372");
  });
  it("agrega el texto URL-encodeado", () => {
    expect(linkWhatsApp("3436575372", "hola mundo & cía")).toBe(
      "https://wa.me/5493436575372?text=hola%20mundo%20%26%20c%C3%ADa"
    );
  });
  it("normaliza el teléfono de entrada", () => {
    expect(linkWhatsApp("+54 9 343 657-5372")).toBe("https://wa.me/5493436575372");
  });
  it("devuelve null si el teléfono es inválido", () => {
    expect(linkWhatsApp("123", "hola")).toBeNull();
  });
});

describe("mensajeEventoP1", () => {
  const base = {
    nombreContacto: "Juan Pérez",
    descripcionEvento: "ROBO ZONA 2",
    softguardRef: "ESI-0175",
    zona: "2",
    fechaISO: "2026-06-19T01:14:00.000Z", // = 22:14 del 18/06/2026 en hora AR (UTC-3)
  };
  it("encabezado (título sobrio + hora) + cuerpo inline (1 zona) + pregunta, en líneas separadas", () => {
    const msg = mensajeEventoP1(base);
    expect(msg).toBe(
      "*Alerta de seguridad* · 22:14\nBuenas noches, Juan. Tu alarma reportó robo zona 2 - zona 2.\n\n¿Está todo bien? Si necesitás ayuda, respondé este mensaje.",
    );
  });
  it("no incluye empresa, teléfono, ref interna ni fecha larga", () => {
    const msg = mensajeEventoP1(base);
    expect(msg).not.toContain("Escobar");
    expect(msg).not.toContain("ESI-0175");
    expect(msg).not.toContain("comuníquese");
    expect(msg).not.toContain("18/06/2026");
  });
  it("no usa mayúsculas sostenidas alarmantes", () => {
    expect(mensajeEventoP1(base)).not.toContain("ALARMA ACTIVADA");
  });
  it("omite el sufijo de zona cuando es null", () => {
    expect(mensajeEventoP1({ ...base, zona: null })).not.toContain(" - zona");
  });
  it("usa saludo genérico (sin nombre) según la hora", () => {
    expect(mensajeEventoP1({ ...base, nombreContacto: "" })).toContain("Buenas noches. Tu alarma");
  });
  it("cae a texto por defecto si la descripción viene vacía", () => {
    expect(mensajeEventoP1({ ...base, descripcionEvento: "  " })).toContain("un evento");
  });
});

describe("mensajeEventosP1 (varias zonas en un solo aviso)", () => {
  const fechaISO = "2026-06-19T01:14:00.000Z"; // = 22:14 AR

  it("lista las zonas en viñetas verticales y deduplica repetidos", () => {
    const msg = mensajeEventosP1({
      nombreContacto: "Juan",
      eventos: [
        { descripcion: "ROBO", zona: "2" },
        { descripcion: "FUEGO", zona: "Cocina" },
        { descripcion: "ROBO", zona: "2" }, // duplicado → se ignora
      ],
      fechaISO,
    });
    expect(msg).toBe(
      "*Alerta de seguridad* · 22:14\nBuenas noches, Juan. Tu alarma reportó:\n· Robo - zona 2\n· Fuego - zona Cocina\n\n¿Está todo bien? Si necesitás ayuda, respondé este mensaje.",
    );
  });

  it("con tres o más, una viñeta por línea (no una al lado de la otra)", () => {
    const msg = mensajeEventosP1({
      nombreContacto: "Ana",
      eventos: [
        { descripcion: "AA", zona: null },
        { descripcion: "BB", zona: null },
        { descripcion: "CC", zona: null },
      ],
      fechaISO,
    });
    expect(msg).toContain("· Aa\n· Bb\n· Cc");
  });

  it("un solo evento equivale a mensajeEventoP1", () => {
    const base = { nombreContacto: "Juan", descripcionEvento: "ROBO ZONA 2", softguardRef: "ESI-0175", zona: "2", fechaISO };
    expect(mensajeEventosP1({ nombreContacto: "Juan", eventos: [{ descripcion: "ROBO ZONA 2", zona: "2" }], fechaISO })).toBe(
      mensajeEventoP1(base),
    );
  });
});

describe("categoriaEvento", () => {
  it("prioridad 1 = crítica, 2 = media, resto = otra", () => {
    expect(categoriaEvento(1)).toBe("critica");
    expect(categoriaEvento(2)).toBe("media");
    expect(categoriaEvento(3)).toBe("otra");
    expect(categoriaEvento(null)).toBe("otra");
  });
});

describe("mensajeEvento (texto según criticidad)", () => {
  const fechaISO = "2026-06-19T01:14:00.000Z"; // = 22:14 AR
  const eventos = [{ descripcion: "ROBO", zona: "2" }];

  it("P1 (crítica): encabezado sobrio + saludo por hora + pregunta", () => {
    const msg = mensajeEvento({ prioridad: 1, nombreContacto: "Juan", eventos, fechaISO });
    expect(msg).toBe("*Alerta de seguridad* · 22:14\nBuenas noches, Juan. Tu alarma reportó robo - zona 2.\n\n¿Está todo bien? Si necesitás ayuda, respondé este mensaje.");
  });

  it("P2 (media): *Aviso*, informa y tranquiliza, sin pregunta de emergencia", () => {
    const msg = mensajeEvento({
      prioridad: 2,
      nombreContacto: "Ana",
      eventos: [{ descripcion: "CORTE 220V", zona: null }],
      fechaISO,
    });
    expect(msg).toBe("*Aviso* · 22:14\nBuenas noches, Ana. Tu sistema reportó corte 220V.\n\nYa lo estamos revisando.");
    expect(msg).not.toContain("¿Está todo bien?");
  });

  it("resto (sin prioridad): *Registro* neutro, sin pregunta de cierre", () => {
    const msg = mensajeEvento({
      prioridad: null,
      nombreContacto: "Eva",
      eventos: [{ descripcion: "APERTURA", zona: null }],
      fechaISO,
    });
    expect(msg).toContain("*Registro* · 22:14");
    expect(msg).toContain("Buenas noches, Eva. Tu alarma registró apertura.");
    expect(msg).not.toContain("¿");
  });

  it("preserva tokens con dígitos al bajar a minúscula (220V no se rompe)", () => {
    const msg = mensajeEvento({
      prioridad: 2,
      nombreContacto: "Ana",
      eventos: [{ descripcion: "CORTE 220V", zona: null }],
      fechaISO,
    });
    expect(msg).toContain("220V");
  });

  it("multi-zona: viñeta por línea, con mayúscula inicial por viñeta", () => {
    const msg = mensajeEvento({
      prioridad: 2,
      nombreContacto: "Leo",
      eventos: [
        { descripcion: "CORTE 220V", zona: null },
        { descripcion: "BATERIA BAJA", zona: null },
      ],
      fechaISO,
    });
    expect(msg).toBe(
      "*Aviso* · 22:14\nBuenas noches, Leo. Tu sistema reportó:\n· Corte 220V\n· Bateria baja\n\nYa lo estamos revisando.",
    );
  });

  it("mensajeEventosP1 es mensajeEvento con prioridad 1", () => {
    const input = { nombreContacto: "Juan", eventos, fechaISO };
    expect(mensajeEventosP1(input)).toBe(mensajeEvento({ prioridad: 1, ...input }));
  });
});

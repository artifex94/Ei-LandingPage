import { describe, it, expect } from "vitest";
import {
  normalizarTelefono,
  linkWhatsApp,
  mensajeEventoP1,
  mensajeEventosP1,
  mensajeEvento,
  categoriaEvento,
  esRestauracion,
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
      "*Alerta de seguridad* · 22:14\nBuenas noches, Juan. Tu alarma reportó robo zona 2 - zona (2).\n\n¿Está todo bien? Si necesitás ayuda, respondé este mensaje.",
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

  it("lista las zonas en viñetas verticales (formato (n) nombre) y deduplica repetidos", () => {
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
      "*Alerta de seguridad* · 22:14\nBuenas noches, Juan. Tu alarma reportó:\n· Robo - zona (2)\n· Fuego - zona cocina\n\n¿Está todo bien? Si necesitás ayuda, respondé este mensaje.",
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

describe("esRestauracion (código SoftGuard: RES = restauración, BUR = robo)", () => {
  it("detecta RES (solo/ con número) como restauración", () => {
    expect(esRestauracion("RES")).toBe(true);
    expect(esRestauracion("RES130")).toBe(true);
    expect(esRestauracion("res130")).toBe(true);
  });
  it("NO confunde robo (BUR) ni otros códigos con restauración (seguridad)", () => {
    expect(esRestauracion("BUR")).toBe(false);
    expect(esRestauracion("BUR130")).toBe(false);
    expect(esRestauracion("ROBO")).toBe(false);
    expect(esRestauracion("PRESION")).toBe(false); // 'RES' embebido en otra palabra
    expect(esRestauracion(null)).toBe(false);
  });
});

describe("mensajeEvento (texto según criticidad)", () => {
  const fechaISO = "2026-06-19T01:14:00.000Z"; // = 22:14 AR
  const eventos = [{ descripcion: "ROBO", zona: "2" }];

  it("P1 (crítica): encabezado sobrio + saludo por hora + pregunta", () => {
    const msg = mensajeEvento({ prioridad: 1, nombreContacto: "Juan", eventos, fechaISO });
    expect(msg).toBe("*Alerta de seguridad* · 22:14\nBuenas noches, Juan. Tu alarma reportó robo - zona (2).\n\n¿Está todo bien? Si necesitás ayuda, respondé este mensaje.");
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

  it("formato de zona '(n) nombre' usando número crudo aparte del nombre", () => {
    const msg = mensajeEvento({
      prioridad: 1,
      nombreContacto: "Agustín",
      eventos: [{ codigo: "BUR130", descripcion: "ROBO", zona: "Patio", zonaNumero: "003", fecha: fechaISO }],
      fechaISO,
    });
    expect(msg).toContain("robo - zona (3) patio");
  });

  it("zona solo-número → '(n)'; zona solo-nombre → nombre", () => {
    const soloNum = mensajeEvento({
      prioridad: 1, nombreContacto: "A", fechaISO,
      eventos: [{ descripcion: "ROBO", zona: "002", zonaNumero: "002", fecha: fechaISO }],
    });
    expect(soloNum).toContain("- zona (2).");
    const soloNombre = mensajeEvento({
      prioridad: 1, nombreContacto: "A", fechaISO,
      eventos: [{ descripcion: "ROBO", zona: "Patio", zonaNumero: null, fecha: fechaISO }],
    });
    expect(soloNombre).toContain("- zona patio.");
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

describe("mensajeEvento — robo / restauración (pairing por zona + tiempo)", () => {
  const tRobo = "2026-06-19T01:14:00.000Z"; // 22:14 AR
  const tRest = "2026-06-19T01:20:00.000Z"; // 22:20 AR (posterior)

  it("robo seguido de su restauración (misma zona, RES posterior) → solo 'Alarma restaurada'", () => {
    const msg = mensajeEvento({
      prioridad: 1,
      nombreContacto: "Agustín",
      eventos: [
        { codigo: "BUR130", descripcion: "ROBO", zona: "Patio", zonaNumero: "003", fecha: tRobo },
        { codigo: "RES130", descripcion: "RESTAURACION ROBO", zona: "Patio", zonaNumero: "003", fecha: tRest },
      ],
      fechaISO: tRest,
    });
    expect(msg).toBe(
      "*Alarma restaurada* · 22:20\nBuenas noches, Agustín. Tu alarma se restauró en la zona (3) patio.\n\n¿Todo bien?",
    );
    expect(msg).not.toContain("robo");
    expect(msg).not.toContain("Alerta de seguridad");
  });

  it("varias zonas restauradas → una por línea", () => {
    const msg = mensajeEvento({
      prioridad: 1,
      nombreContacto: "Nombre",
      eventos: [
        { codigo: "BUR130", descripcion: "ROBO", zona: "Patio", zonaNumero: "003", fecha: tRobo },
        { codigo: "RES130", descripcion: "RESTAURACION", zona: "Patio", zonaNumero: "003", fecha: tRest },
        { codigo: "BUR130", descripcion: "ROBO", zona: "Comedor", zonaNumero: "002", fecha: tRobo },
        { codigo: "RES130", descripcion: "RESTAURACION", zona: "Comedor", zonaNumero: "002", fecha: tRest },
      ],
      fechaISO: tRest,
    });
    expect(msg).toBe(
      "*Alarma restaurada* · 22:20\nBuenas noches, Nombre. Tu alarma se restauró en las zonas:\n· (3) patio\n· (2) comedor\n\n¿Todo bien?",
    );
  });

  it("mixto: una zona restaurada + otra activa → alerta SOLO de la activa", () => {
    const msg = mensajeEvento({
      prioridad: 1,
      nombreContacto: "Nombre",
      eventos: [
        { codigo: "BUR130", descripcion: "ROBO", zona: "Patio", zonaNumero: "003", fecha: tRobo },
        { codigo: "RES130", descripcion: "RESTAURACION", zona: "Patio", zonaNumero: "003", fecha: tRest },
        { codigo: "BUR130", descripcion: "ROBO", zona: "Comedor", zonaNumero: "002", fecha: tRobo },
      ],
      fechaISO: tRest,
    });
    expect(msg).toContain("*Alerta de seguridad*");
    expect(msg).toContain("robo - zona (2)");
    expect(msg).not.toContain("(3) patio"); // la zona restaurada se omite
  });

  it("restauración ANTERIOR al robo no restaura (la zona sigue activa)", () => {
    const msg = mensajeEvento({
      prioridad: 1,
      nombreContacto: "Agustín",
      eventos: [
        { codigo: "RES130", descripcion: "RESTAURACION", zona: "Patio", zonaNumero: "003", fecha: tRobo },
        { codigo: "BUR130", descripcion: "ROBO", zona: "Patio", zonaNumero: "003", fecha: tRest },
      ],
      fechaISO: tRest,
    });
    expect(msg).toContain("*Alerta de seguridad*");
    expect(msg).toContain("robo - zona (3) patio");
  });
});

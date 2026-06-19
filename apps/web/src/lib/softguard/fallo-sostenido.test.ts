import { describe, it, expect, afterEach, vi } from "vitest";
import {
  AUTO_PREFIX,
  derivarFalloAcDesde,
  descripcionSolicitudAuto,
  evaluarFallosSostenidos,
  umbralFalloHoras,
} from "./fallo-sostenido";

const AHORA = new Date("2026-06-11T12:00:00");
const hace = (horas: number) => new Date(AHORA.getTime() - horas * 3_600_000);

describe("derivarFalloAcDesde", () => {
  it("entra en fallo → el reloj arranca ahora", () => {
    expect(derivarFalloAcDesde(true, false, null, AHORA)).toEqual(AHORA);
  });

  it("sigue en fallo → conserva el inicio original", () => {
    const inicio = hace(30);
    expect(derivarFalloAcDesde(true, true, inicio, AHORA)).toEqual(inicio);
  });

  it("en fallo pero sin inicio persistido (campo nuevo) → arranca ahora", () => {
    expect(derivarFalloAcDesde(true, true, null, AHORA)).toEqual(AHORA);
  });

  it("sale del fallo → null", () => {
    expect(derivarFalloAcDesde(false, true, hace(30), AHORA)).toBeNull();
  });

  it("sin fallo y sin historia → null", () => {
    expect(derivarFalloAcDesde(false, undefined, undefined, AHORA)).toBeNull();
  });
});

describe("evaluarFallosSostenidos", () => {
  const base = {
    en_fallo_tst: false,
    fallo_tst_desde: null as Date | null,
    en_fallo_ac: false,
    fallo_ac_desde: null as Date | null,
    ahora: AHORA,
    umbralHoras: 24,
  };

  it("sin fallos → vacío", () => {
    expect(evaluarFallosSostenidos(base)).toEqual([]);
  });

  it("fallo de AC que supera el umbral → detectado", () => {
    const res = evaluarFallosSostenidos({
      ...base,
      en_fallo_ac: true,
      fallo_ac_desde: hace(25),
    });
    expect(res).toEqual([{ tipo: "AC", desde: hace(25) }]);
  });

  it("fallo de AC reciente (bajo el umbral) → todavía no es trabajo", () => {
    const res = evaluarFallosSostenidos({
      ...base,
      en_fallo_ac: true,
      fallo_ac_desde: hace(2),
    });
    expect(res).toEqual([]);
  });

  it("fallo de TST sostenido usa el 'desde' que informa la central", () => {
    const res = evaluarFallosSostenidos({
      ...base,
      en_fallo_tst: true,
      fallo_tst_desde: hace(48),
    });
    expect(res).toEqual([{ tipo: "TST", desde: hace(48) }]);
  });

  it("flag de fallo sin fecha de inicio → no evalúa (sin reloj no hay sostenido)", () => {
    const res = evaluarFallosSostenidos({ ...base, en_fallo_tst: true });
    expect(res).toEqual([]);
  });

  it("ambos fallos sostenidos → detecta los dos", () => {
    const res = evaluarFallosSostenidos({
      ...base,
      en_fallo_ac: true,
      fallo_ac_desde: hace(30),
      en_fallo_tst: true,
      fallo_tst_desde: hace(26),
    });
    expect(res.map((f) => f.tipo).sort()).toEqual(["AC", "TST"]);
  });

  it("respeta el umbral configurado", () => {
    const res = evaluarFallosSostenidos({
      ...base,
      en_fallo_ac: true,
      fallo_ac_desde: hace(5),
      umbralHoras: 4,
    });
    expect(res).toHaveLength(1);
  });
});

describe("umbralFalloHoras", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("default 24 sin env", () => {
    expect(umbralFalloHoras()).toBe(24);
  });

  it("toma el valor de SOFTGUARD_FALLO_SOSTENIDO_HORAS", () => {
    vi.stubEnv("SOFTGUARD_FALLO_SOSTENIDO_HORAS", "6");
    expect(umbralFalloHoras()).toBe(6);
  });

  it("valores inválidos caen al default", () => {
    vi.stubEnv("SOFTGUARD_FALLO_SOSTENIDO_HORAS", "cero");
    expect(umbralFalloHoras()).toBe(24);
  });
});

describe("descripcionSolicitudAuto", () => {
  it("arranca con el prefijo de dedupe y nombra cada fallo con su inicio", () => {
    const desc = descripcionSolicitudAuto(
      "ESI-0175",
      [
        { tipo: "AC", desde: new Date("2026-06-10T08:30:00") },
        { tipo: "TST", desde: new Date("2026-06-09T22:00:00") },
      ],
      24,
    );
    expect(desc.startsWith(`${AUTO_PREFIX} `)).toBe(true);
    expect(desc).toContain("ESI-0175");
    expect(desc).toContain(">24 h");
    expect(desc).toContain("sin 220v (corte de alimentación) desde 10/06 08:30");
    expect(desc).toContain("sin reportar test periódico desde 09/06 22:00");
  });
});

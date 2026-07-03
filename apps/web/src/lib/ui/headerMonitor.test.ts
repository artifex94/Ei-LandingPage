import { describe, it, expect } from "vitest";
import { MONITOR, calcularBarridoBusqueda, calcularDesvioCursor, calcularTransformMonitor, clasificarCursor } from "./headerMonitor";

describe("calcularTransformMonitor", () => {
  it("el origen de la página cae en el centro de la pantalla", () => {
    const { tx, ty } = calcularTransformMonitor(0, 0);
    expect(tx).toBe(MONITOR.SCREEN_W / 2);
    expect(ty).toBe(MONITOR.SCREEN_H / 2);
  });

  it("centra un punto arbitrario: el punto escalado más el translate da el centro", () => {
    const { tx, ty } = calcularTransformMonitor(500, 460);
    expect(MONITOR.SCALE * 500 + tx).toBeCloseTo(MONITOR.SCREEN_W / 2, 6);
    expect(MONITOR.SCALE * 460 + ty).toBeCloseTo(MONITOR.SCREEN_H / 2, 6);
  });

  it("el translate es lineal respecto del punto (paneo proporcional)", () => {
    const a = calcularTransformMonitor(100, 100);
    const b = calcularTransformMonitor(200, 300);
    expect(a.tx - b.tx).toBeCloseTo(MONITOR.SCALE * 100, 6);
    expect(a.ty - b.ty).toBeCloseTo(MONITOR.SCALE * 200, 6);
  });

  it("el punto que anula el translate es el centro de pantalla des-escalado", () => {
    const px = MONITOR.SCREEN_W / 2 / MONITOR.SCALE;
    const py = MONITOR.SCREEN_H / 2 / MONITOR.SCALE;
    const { tx, ty } = calcularTransformMonitor(px, py);
    expect(tx).toBeCloseTo(0, 6);
    expect(ty).toBeCloseTo(0, 6);
  });
});

describe("calcularDesvioCursor", () => {
  it("sin error de seguimiento, el cursor queda en el centro", () => {
    expect(calcularDesvioCursor(10, 20, 10, 20)).toEqual({ dx: 0, dy: 0 });
  });

  it("el desvío es el error de seguimiento (cur − target)", () => {
    // El mouse se movió a la derecha/abajo: target bajó y cur todavía no llegó
    const d = calcularDesvioCursor(-100, -50, -108, -55);
    expect(d).toEqual({ dx: 8, dy: 5 });
  });

  it("clampea al máximo acotado en ambos ejes y sentidos", () => {
    const { x, y } = MONITOR.CURSOR_DESVIO_MAX;
    expect(calcularDesvioCursor(0, 0, -500, -500)).toEqual({ dx: x, dy: y });
    expect(calcularDesvioCursor(-500, -500, 0, 0)).toEqual({ dx: -x, dy: -y });
  });
});

describe("clasificarCursor", () => {
  it("pointer sobre interactivos (cursor: pointer)", () => {
    expect(clasificarCursor("pointer", "A", false)).toBe("pointer");
    expect(clasificarCursor("pointer", "BUTTON", false)).toBe("pointer");
  });

  it("text sobre cursor text explícito o auto en tags de texto", () => {
    expect(clasificarCursor("text", "DIV", false)).toBe("text");
    expect(clasificarCursor("auto", "P", false)).toBe("text");
    expect(clasificarCursor("auto", "H2", false)).toBe("text");
    expect(clasificarCursor("auto", "INPUT", true)).toBe("text");
  });

  it("default para el resto (auto sobre contenedores, cursors especiales)", () => {
    expect(clasificarCursor("auto", "DIV", false)).toBe("default");
    expect(clasificarCursor("auto", "SECTION", false)).toBe("default");
    expect(clasificarCursor("grab", "DIV", false)).toBe("default");
  });
});

describe("calcularBarridoBusqueda", () => {
  it("en fase 0 apunta al centro de la banda visible", () => {
    const b = calcularBarridoBusqueda(0, 1920, 900, 0, 500);
    expect(b).toEqual(calcularTransformMonitor(960, 950));
  });

  it("en un cuarto de período está en el extremo derecho del barrido", () => {
    const t = MONITOR.BUSQUEDA_PERIODO_MS / 4;
    const b = calcularBarridoBusqueda(t, 1920, 900, 0, 0);
    const esperadoX = 1920 * (0.5 + MONITOR.BUSQUEDA_AMPLITUD);
    expect(b.tx).toBeCloseTo(calcularTransformMonitor(esperadoX, 450).tx, 6);
  });

  it("es periódico: t y t+período dan el mismo target", () => {
    const a = calcularBarridoBusqueda(1234, 1440, 900, 0, 0);
    const b = calcularBarridoBusqueda(1234 + MONITOR.BUSQUEDA_PERIODO_MS, 1440, 900, 0, 0);
    expect(b.tx).toBeCloseTo(a.tx, 6);
    expect(b.ty).toBeCloseTo(a.ty, 6);
  });

  it("sigue el scroll: la banda vertical acompaña scrollY", () => {
    const a = calcularBarridoBusqueda(0, 1920, 900, 0, 0);
    const b = calcularBarridoBusqueda(0, 1920, 900, 0, 1000);
    expect(a.ty - b.ty).toBeCloseTo(MONITOR.SCALE * 1000, 6);
  });
});

import { describe, it, expect } from "vitest";
import { MONITOR, calcularTransformMonitor } from "./headerMonitor";

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

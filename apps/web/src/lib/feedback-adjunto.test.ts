import { describe, it, expect } from "vitest";
import { validarAdjuntoFeedback } from "./feedback-adjunto";

describe("validarAdjuntoFeedback", () => {
  it("acepta sin archivo (adjunto opcional)", () => {
    expect(validarAdjuntoFeedback(null).ok).toBe(true);
    expect(validarAdjuntoFeedback(undefined).ok).toBe(true);
  });

  it("acepta una imagen dentro del límite", () => {
    const r = validarAdjuntoFeedback({ mime: "image/jpeg", size: 5 * 1024 * 1024 });
    expect(r.ok).toBe(true);
  });

  it("acepta un video dentro del límite", () => {
    const r = validarAdjuntoFeedback({ mime: "video/mp4", size: 12 * 1024 * 1024 });
    expect(r.ok).toBe(true);
  });

  it("rechaza un mime no permitido", () => {
    const r = validarAdjuntoFeedback({ mime: "application/pdf", size: 1024 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/no permitido/);
  });

  it("rechaza una imagen que supera los 10 MB", () => {
    const r = validarAdjuntoFeedback({ mime: "image/png", size: 10 * 1024 * 1024 + 1 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/10 MB/);
  });

  it("rechaza un video que supera los 15 MB", () => {
    const r = validarAdjuntoFeedback({ mime: "video/webm", size: 15 * 1024 * 1024 + 1 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/15 MB/);
  });
});

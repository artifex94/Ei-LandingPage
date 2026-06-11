import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { invalidateWebApiSession } from "./core";
import { pingWebApi, fetchModulosDesktop } from "./sistema";
import {
  fakeRes,
  restList,
  mockSoftguardFetch,
  stubSoftguardEnv,
  FILAS_DESKTOP_MODULES,
} from "./fixtures";

describe("adaptador sistema", () => {
  beforeEach(() => {
    stubSoftguardEnv();
    invalidateWebApiSession();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    invalidateWebApiSession();
  });

  it("pingWebApi loguea y valida el token (Status 1 → ok)", async () => {
    mockSoftguardFetch({
      "/rest/token/IsValid": () => fakeRes({ body: { Status: 1 } }),
    });

    expect(await pingWebApi()).toEqual({ ok: true, status: 1 });
  });

  it("pingWebApi reporta token inválido sin lanzar", async () => {
    mockSoftguardFetch({
      "/rest/token/IsValid": () => fakeRes({ body: { Status: 0 } }),
    });

    expect(await pingWebApi()).toEqual({ ok: false, status: 0 });
  });

  it("fetchModulosDesktop normaliza disponibilidad '1'/0 a boolean", async () => {
    mockSoftguardFetch({
      "/Rest/Search/DesktopModules": () => restList(FILAS_DESKTOP_MODULES),
    });

    const modulos = await fetchModulosDesktop();

    expect(modulos).toEqual([
      { id: 3, nombre: "Monitoreo Web Remoto", disponible: true, key: "WebRemoto" },
      { id: 7, nombre: "Video", disponible: false, key: "Video" },
    ]);
  });
});

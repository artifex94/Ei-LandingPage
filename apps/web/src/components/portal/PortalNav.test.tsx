import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PortalNav } from "./PortalNav";

let pathname = "/portal/dashboard";

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
}));

vi.mock("@/components/ui/LogoutButton", () => ({
  LogoutButton: () => <button type="button">Salir</button>,
}));

describe("PortalNav", () => {
  beforeEach(() => {
    pathname = "/portal/dashboard";
  });

  it("expone cinco destinos claros en la navegación móvil", () => {
    render(<PortalNav />);
    const nav = screen.getByRole("navigation", { name: "Navegación principal" });

    expect(within(nav).getByRole("link", { name: "Inicio" })).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: "Pagos" })).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: "Ayuda" })).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: "Actividad" })).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: "Perfil" })).toBeInTheDocument();
    expect(within(nav).getAllByRole("link")).toHaveLength(5);
  });

  it("marca la sección activa incluso en una ruta secundaria", () => {
    pathname = "/portal/solicitudes";
    render(<PortalNav />);
    const nav = screen.getByRole("navigation", { name: "Navegación principal" });

    expect(within(nav).getByRole("link", { name: "Ayuda" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});

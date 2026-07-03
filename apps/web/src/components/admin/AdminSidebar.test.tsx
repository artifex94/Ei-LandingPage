import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminSidebar } from "./AdminSidebar";

let pathname = "/admin/dashboard";

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
}));

vi.mock("@/components/ui/LogoutButton", () => ({
  LogoutButton: ({ compact }: { compact?: boolean }) => (
    <button type="button">{compact ? "→" : "Cerrar sesión"}</button>
  ),
}));

function navDesktop() {
  return screen.getByRole("navigation", { name: "Navegación del administrador" });
}

describe("AdminSidebar — colapso a solo íconos", () => {
  beforeEach(() => {
    pathname = "/admin/dashboard";
    localStorage.clear();
  });

  it("arranca expandido: labels visibles y ancho w-56", () => {
    render(<AdminSidebar nombreAdmin="Ramiro" />);
    const nav = navDesktop();
    expect(nav.className).toContain("w-56");
    expect(within(nav).getByRole("link", { name: "Dashboard" })).toHaveTextContent("Dashboard");
    expect(within(nav).getByRole("button", { name: "Colapsar barra de navegación" })).toBeInTheDocument();
  });

  it("al colapsar: w-16, links solo-ícono con label accesible y persiste en localStorage", () => {
    render(<AdminSidebar nombreAdmin="Ramiro" otsPendientes={3} />);
    fireEvent.click(screen.getByRole("button", { name: "Colapsar barra de navegación" }));

    const nav = navDesktop();
    expect(nav.className).toContain("w-16");
    // El label vive en aria-label/title, no como texto visible
    const link = within(nav).getByRole("link", { name: "Órdenes de trabajo (3)" });
    expect(link).toHaveAttribute("title", "Órdenes de trabajo (3)");
    expect(link).not.toHaveTextContent("Órdenes de trabajo");
    // Los toggles de grupo desaparecen en modo ícono
    expect(within(nav).queryByRole("button", { name: /Pendientes/ })).toBeNull();
    expect(localStorage.getItem("admin-sidebar-colapsado")).toBe("1");
  });

  it("restaura la preferencia colapsada desde localStorage al montar", () => {
    localStorage.setItem("admin-sidebar-colapsado", "1");
    render(<AdminSidebar nombreAdmin="Ramiro" />);
    expect(navDesktop().className).toContain("w-16");
    expect(
      within(navDesktop()).getByRole("button", { name: "Expandir barra de navegación" })
    ).toBeInTheDocument();
  });

  it("expandir de nuevo restaura labels y persiste '0'", () => {
    localStorage.setItem("admin-sidebar-colapsado", "1");
    render(<AdminSidebar nombreAdmin="Ramiro" />);
    fireEvent.click(screen.getByRole("button", { name: "Expandir barra de navegación" }));

    expect(navDesktop().className).toContain("w-56");
    expect(localStorage.getItem("admin-sidebar-colapsado")).toBe("0");
  });
});

describe("AdminSidebar — marca en modo colapsado", () => {
  it("colapsado muestra solo el isotipo, sin el nombre de la empresa", () => {
    localStorage.setItem("admin-sidebar-colapsado", "1");
    render(<AdminSidebar nombreAdmin="Ramiro" />);
    const nav = screen.getByRole("navigation", { name: "Navegación del administrador" });
    expect(within(nav).queryByText("Escobar Instalaciones")).toBeNull();
    expect(within(nav).queryByText("Administración")).toBeNull();
    expect(within(nav).getByRole("link", { name: "Escobar Instalaciones — Dashboard" })).toBeInTheDocument();
  });

  it("expandido conserva nombre y contexto", () => {
    localStorage.clear();
    render(<AdminSidebar nombreAdmin="Ramiro" />);
    const nav = screen.getByRole("navigation", { name: "Navegación del administrador" });
    expect(within(nav).getByText("Escobar Instalaciones")).toBeInTheDocument();
    expect(within(nav).getByText("Administración")).toBeInTheDocument();
  });
});

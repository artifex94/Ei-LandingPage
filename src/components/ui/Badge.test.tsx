import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "./Badge";

describe("Badge", () => {
  it("renderiza el contenido", () => {
    render(<Badge>Activo</Badge>);
    expect(screen.getByText("Activo")).toBeInTheDocument();
  });

  it("aplica las clases de la variante", () => {
    render(<Badge variant="danger">Error</Badge>);
    const el = screen.getByText("Error");
    expect(el.className).toContain("text-red-300");
  });

  it("respeta className adicional", () => {
    render(<Badge className="custom-x">X</Badge>);
    expect(screen.getByText("X").className).toContain("custom-x");
  });

  it("usa el tamaño md cuando se indica", () => {
    render(<Badge size="md">Y</Badge>);
    expect(screen.getByText("Y").className).toContain("px-2.5");
  });
});

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Inbox } from "lucide-react";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("renderiza título y descripción", () => {
    render(<EmptyState title="Sin datos" description="Nada por acá" />);
    expect(screen.getByText("Sin datos")).toBeInTheDocument();
    expect(screen.getByText("Nada por acá")).toBeInTheDocument();
  });

  it("renderiza una acción con href como enlace", () => {
    render(
      <EmptyState title="t" icon={Inbox} action={{ label: "Crear", href: "/nuevo" }} />,
    );
    const link = screen.getByRole("link", { name: /Crear/ });
    expect(link).toHaveAttribute("href", "/nuevo");
  });

  it("muestra el eyebrow en tono success", () => {
    render(<EmptyState tone="success" eyebrow="Todo al día" title="ok" />);
    expect(screen.getByText("Todo al día")).toBeInTheDocument();
  });
});

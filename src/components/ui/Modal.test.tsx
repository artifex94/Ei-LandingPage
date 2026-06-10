import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Modal } from "./Modal";

describe("Modal", () => {
  it("renderiza título y contenido cuando está abierto", () => {
    render(
      <Modal open onClose={() => {}} title="Confirmar" description="¿Seguro?">
        <p>cuerpo</p>
      </Modal>,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Confirmar")).toBeInTheDocument();
    expect(screen.getByText("¿Seguro?")).toBeInTheDocument();
    expect(screen.getByText("cuerpo")).toBeInTheDocument();
  });

  it("no renderiza el diálogo cuando está cerrado", () => {
    render(
      <Modal open={false} onClose={() => {}} title="Confirmar">
        <p>cuerpo</p>
      </Modal>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("expone un botón de cierre accesible", () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="T">
        <p>x</p>
      </Modal>,
    );
    expect(screen.getByRole("button", { name: "Cerrar" })).toBeInTheDocument();
  });
});

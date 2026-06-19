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

  it("con dismissible={false} no ofrece botón de cierre", () => {
    render(
      <Modal open dismissible={false} title="Paywall">
        <p>bloqueado</p>
      </Modal>,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Cerrar" }),
    ).not.toBeInTheDocument();
  });

  it("con titleHidden el título queda solo para lectores de pantalla", () => {
    render(
      <Modal open onClose={() => {}} title="Oculto" titleHidden>
        <p>x</p>
      </Modal>,
    );
    expect(screen.getByText("Oculto")).toHaveClass("sr-only");
  });

  it("acepta clases extra en el contenedor", () => {
    render(
      <Modal open onClose={() => {}} title="T" className="border-red-800">
        <p>x</p>
      </Modal>,
    );
    expect(screen.getByRole("dialog")).toHaveClass("border-red-800");
  });
});

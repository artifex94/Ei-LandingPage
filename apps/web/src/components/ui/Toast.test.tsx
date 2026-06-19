import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ToastProvider, useToast } from "./Toast";

function Demo() {
  const toast = useToast();
  return (
    <>
      <button onClick={() => toast({ title: "Guardado", description: "Todo ok" })}>
        disparar ok
      </button>
      <button onClick={() => toast({ variant: "error", title: "Falló la operación" })}>
        disparar error
      </button>
    </>
  );
}

describe("Toast", () => {
  it("muestra un toast de éxito con título, descripción y cierre accesible", () => {
    render(
      <ToastProvider>
        <Demo />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText("disparar ok"));

    expect(screen.getByText("Guardado")).toBeInTheDocument();
    expect(screen.getByText("Todo ok")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cerrar aviso" })).toBeInTheDocument();
  });

  it("apila varios toasts a la vez", () => {
    render(
      <ToastProvider>
        <Demo />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText("disparar ok"));
    fireEvent.click(screen.getByText("disparar error"));

    expect(screen.getByText("Guardado")).toBeInTheDocument();
    expect(screen.getByText("Falló la operación")).toBeInTheDocument();
  });

  it("useToast fuera del provider falla con un mensaje claro", () => {
    const silencio = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Demo />)).toThrow(/ToastProvider/);
    silencio.mockRestore();
  });
});

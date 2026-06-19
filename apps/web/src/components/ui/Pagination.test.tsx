import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Pagination } from "./Pagination";

describe("Pagination", () => {
  it("no renderiza nada con una sola página", () => {
    const { container } = render(
      <Pagination page={1} pageCount={1} makeHref={(p) => `?page=${p}`} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("deshabilita 'Anterior' en la primera página", () => {
    render(<Pagination page={1} pageCount={5} makeHref={(p) => `?page=${p}`} />);
    expect(screen.getByText("Anterior").closest("[aria-disabled]")).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("genera el href de la página siguiente", () => {
    render(<Pagination page={2} pageCount={5} makeHref={(p) => `?page=${p}`} />);
    const next = screen.getByText("Siguiente").closest("a");
    expect(next).toHaveAttribute("href", "?page=3");
  });

  it("muestra la posición actual", () => {
    render(<Pagination page={2} pageCount={5} makeHref={(p) => `?page=${p}`} />);
    expect(screen.getByText(/Página 2 de 5/)).toBeInTheDocument();
  });
});

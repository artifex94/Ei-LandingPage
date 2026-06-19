import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FormField } from "./FormField";

describe("FormField", () => {
  it("vincula el label con el control vía htmlFor/id", () => {
    render(
      <FormField label="Correo">
        {(field) => <input aria-label="correo" {...field} />}
      </FormField>,
    );
    const input = screen.getByLabelText("Correo");
    expect(input.tagName).toBe("INPUT");
  });

  it("expone el error con role=alert y aria-invalid", () => {
    render(
      <FormField label="Tel" error="inválido">
        {(field) => <input data-testid="ctrl" {...field} />}
      </FormField>,
    );
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("inválido");
    const input = screen.getByTestId("ctrl");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input.getAttribute("aria-describedby")).toBe(alert.id);
  });

  it("muestra el hint cuando no hay error", () => {
    render(
      <FormField label="X" hint="ayuda">
        {(field) => <input {...field} />}
      </FormField>,
    );
    expect(screen.getByText("ayuda")).toBeInTheDocument();
  });
});

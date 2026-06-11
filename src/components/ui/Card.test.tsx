import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Card, CardHeader, CardBody, CardFooter } from "./Card";

describe("Card", () => {
  it("renderiza header, body y footer", () => {
    render(
      <Card>
        <CardHeader>Head</CardHeader>
        <CardBody>Body</CardBody>
        <CardFooter>Foot</CardFooter>
      </Card>,
    );
    expect(screen.getByText("Head")).toBeInTheDocument();
    expect(screen.getByText("Body")).toBeInTheDocument();
    expect(screen.getByText("Foot")).toBeInTheDocument();
  });

  it("aplica fondo atenuado con muted", () => {
    const { container } = render(<Card muted>contenido</Card>);
    expect(container.firstElementChild?.className).toContain("bg-slate-800/50");
  });
});

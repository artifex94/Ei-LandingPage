import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DataTable, type Column } from "./DataTable";

type Row = { id: string; nombre: string };

const columns: Column<Row>[] = [
  { id: "nombre", header: "Nombre", cell: (r) => r.nombre },
];

const rows: Row[] = [
  { id: "1", nombre: "Ana" },
  { id: "2", nombre: "Beto" },
];

describe("DataTable", () => {
  it("renderiza filas y caption accesible", () => {
    render(
      <DataTable columns={columns} rows={rows} keyExtractor={(r) => r.id} caption="Lista" />,
    );
    expect(screen.getByRole("table")).toHaveAccessibleName("Lista");
    expect(screen.getByText("Ana")).toBeInTheDocument();
    expect(screen.getByText("Beto")).toBeInTheDocument();
  });

  it("muestra el emptyState cuando no hay filas", () => {
    render(
      <DataTable
        columns={columns}
        rows={[]}
        keyExtractor={(r) => r.id}
        caption="Vacío"
        emptyState={<div>nada por acá</div>}
      />,
    );
    expect(screen.getByText("nada por acá")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("renderiza esqueleto en estado de carga", () => {
    const { container } = render(
      <DataTable
        columns={columns}
        rows={[]}
        keyExtractor={(r) => r.id}
        caption="Cargando"
        isLoading
        loadingRows={3}
      />,
    );
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(3);
  });

  it("renderiza tabla (desktop) y tarjetas (mobile) con renderCard", () => {
    render(
      <DataTable
        columns={columns}
        rows={rows}
        keyExtractor={(r) => r.id}
        caption="Lista"
        renderCard={(r) => <div data-testid="card">{r.nombre}</div>}
      />,
    );
    // La tabla sigue presente (oculta por CSS en mobile, viva en el DOM).
    expect(screen.getByRole("table")).toBeInTheDocument();
    // Y además se renderiza una tarjeta por fila.
    expect(screen.getAllByTestId("card")).toHaveLength(rows.length);
  });

  it("aplica rowClassName por fila", () => {
    render(
      <DataTable
        columns={columns}
        rows={rows}
        keyExtractor={(r) => r.id}
        caption="Lista"
        rowClassName={(r) => (r.id === "1" ? "fila-destacada" : "fila-normal")}
      />,
    );
    expect(screen.getByText("Ana").closest("tr")?.className).toContain("fila-destacada");
    expect(screen.getByText("Beto").closest("tr")?.className).toContain("fila-normal");
  });

  it("dispara onRowClick al clickear una fila", async () => {
    const onRowClick = vi.fn();
    render(
      <DataTable
        columns={columns}
        rows={rows}
        keyExtractor={(r) => r.id}
        caption="Lista"
        onRowClick={onRowClick}
      />,
    );
    await userEvent.click(screen.getByText("Ana"));
    expect(onRowClick).toHaveBeenCalledWith(rows[0]);
  });
});

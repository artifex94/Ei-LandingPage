import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ToastProvider } from "@/components/ui/Toast";
import { KanbanBoard } from "./KanbanBoard";
import { iniciarSolicitud } from "./actions";

vi.mock("./actions", () => ({
  iniciarSolicitud: vi.fn(),
  resolverSolicitud: vi.fn(),
  reabrirSolicitud: vi.fn(),
}));

const SOLICITUD = {
  id: "s1",
  descripcion: "[AUTO] Panel ESI-0175 con fallo sostenido (>24 h)",
  estado: "PENDIENTE",
  prioridad: "ALTA",
  creada_en: new Date("2026-06-11T10:00:00"),
  resuelta_en: null,
  cuenta: {
    descripcion: "Casa centro",
    softguard_ref: "ESI-0175",
    perfil: { id: "p1", nombre: "Cliente Demo", telefono: null },
  },
};

function renderBoard() {
  return render(
    <ToastProvider>
      <KanbanBoard solicitudes={[SOLICITUD]} />
    </ToastProvider>,
  );
}

// La tarjeta PENDIENTE muestra el botón "En proceso"; al pasar a EN_PROCESO la
// columna nueva solo renderiza "Marcar resuelta" — la presencia/ausencia del
// botón delata en qué columna está la tarjeta (el header de columna es un
// span, no un button, así que no interfiere).
const botonEnProceso = () => screen.queryByRole("button", { name: /En proceso/ });

describe("KanbanBoard — optimistic UI (RF-B2)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("mueve la tarjeta de columna al instante, antes de que el server responda", async () => {
    // Promesa controlada: mientras está pendiente, lo único que puede mover
    // la tarjeta es el update optimista. OJO: hay que resolverla al final —
    // las async actions de React 19 están entrelazadas y una promesa eterna
    // deja el scope optimista abierto para los demás tests del archivo.
    let resolverAction!: () => void;
    vi.mocked(iniciarSolicitud).mockReturnValue(
      new Promise((res) => { resolverAction = res; }),
    );
    renderBoard();

    expect(botonEnProceso()).toBeInTheDocument();
    fireEvent.click(botonEnProceso()!);

    await waitFor(() => expect(botonEnProceso()).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: /Marcar resuelta/ })).toBeInTheDocument();

    // Completar la action. Sin revalidate en el test las props no cambian,
    // así que React revierte el optimista — en producción revalidatePath
    // trae el estado nuevo del server y la tarjeta se queda donde está.
    resolverAction();
    await waitFor(() => expect(botonEnProceso()).toBeInTheDocument());
  });

  it("si el server falla, la tarjeta vuelve a su columna y el toast avisa", async () => {
    // Rechazo diferido: en producción el server siempre tarda; un reject en el
    // microtask inmediato colapsa optimistic y revert en el mismo flush.
    vi.mocked(iniciarSolicitud).mockImplementation(
      () => new Promise((_, reject) => setTimeout(() => reject(new Error("se cayó")), 30)),
    );
    renderBoard();

    fireEvent.click(botonEnProceso()!);
    // Primero el movimiento optimista…
    await waitFor(() => expect(botonEnProceso()).not.toBeInTheDocument());

    // …y al fallar el server: toast + la tarjeta vuelve a su columna.
    expect(await screen.findByText("No se pudo actualizar la solicitud")).toBeInTheDocument();
    await waitFor(() => expect(botonEnProceso()).toBeInTheDocument());
  });
});

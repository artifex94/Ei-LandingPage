"use client";

import { useState } from "react";
import { Inbox, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardBody, CardFooter } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { FormField } from "@/components/ui/FormField";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

type DemoRow = { id: string; nombre: string; estado: "activo" | "inactivo" };

const DEMO_ROWS: DemoRow[] = [
  { id: "1", nombre: "Juan Pérez", estado: "activo" },
  { id: "2", nombre: "Ana Gómez", estado: "inactivo" },
];

const DEMO_COLUMNS: Column<DemoRow>[] = [
  { id: "nombre", header: "Nombre", cell: (r) => r.nombre },
  {
    id: "estado",
    header: "Estado",
    cell: (r) => (
      <Badge variant={r.estado === "activo" ? "success" : "neutral"}>{r.estado}</Badge>
    ),
  },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">{title}</h2>
      <Card muted>
        <CardBody className="space-y-4">{children}</CardBody>
      </Card>
    </section>
  );
}

export default function UiKitPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const toast = useToast();

  return (
    <div className="max-w-3xl space-y-8">
      <header>
        <h1 className="text-2xl font-display font-bold text-white">UI Kit — Design System</h1>
        <p className="text-slate-400 text-sm mt-1">
          Documentación viva de las primitivas (Épica A). Smoke-test visual.
        </p>
      </header>

      <Section title="Tipografía">
        <div className="space-y-4">
          <div>
            <p className="font-display text-2xl font-bold text-white">Display — Chakra Petch</p>
            <p className="text-xs text-slate-500 mt-0.5">
              <code className="font-mono">font-display</code> — títulos de página, marca y números de panel. Nunca cuerpo de texto.
            </p>
          </div>
          <div>
            <p className="text-base text-slate-300">Cuerpo — Inter</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Default del body. Texto corrido, formularios, tablas.
            </p>
          </div>
          <div>
            <p className="font-mono text-sm text-slate-300 tracking-widest uppercase">Datos — JetBrains Mono</p>
            <p className="text-xs text-slate-500 mt-0.5">
              <code className="font-mono">font-mono</code> — labels técnicas, códigos, horarios y montos.
            </p>
          </div>
        </div>
      </Section>

      <Section title="Badge">
        <div className="flex flex-wrap gap-2">
          <Badge variant="neutral">Neutral</Badge>
          <Badge variant="info">Info</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="danger">Danger</Badge>
          <Badge variant="brand">Brand</Badge>
          <Badge variant="info" size="md">Tamaño md</Badge>
        </div>
      </Section>

      <Section title="Card">
        <Card>
          <CardHeader>
            <span className="text-white font-semibold">Encabezado</span>
          </CardHeader>
          <CardBody>
            <p className="text-slate-300 text-sm">Cuerpo de la tarjeta.</p>
          </CardBody>
          <CardFooter>
            <span className="text-slate-400 text-xs">Pie</span>
          </CardFooter>
        </Card>
      </Section>

      <Section title="EmptyState">
        <EmptyState
          icon={Inbox}
          title="No hay registros"
          description="Cuando agregues datos van a aparecer acá."
          action={{ label: "Crear el primero", href: "#" }}
        />
        <EmptyState
          tone="success"
          icon={CheckCircle2}
          eyebrow="Todo al día"
          title="Sin pendientes"
          description="No hay nada que revisar por ahora."
        />
      </Section>

      <Section title="FormField + Input">
        <FormField label="Correo" required hint="Te avisamos solo lo importante.">
          {(field) => <Input type="email" placeholder="nombre@correo.com" {...field} />}
        </FormField>
        <FormField label="Teléfono" error="Número inválido">
          {(field) => <Input type="tel" placeholder="11 2345 6789" {...field} />}
        </FormField>
      </Section>

      <Section title="DataTable">
        <DataTable
          columns={DEMO_COLUMNS}
          rows={DEMO_ROWS}
          keyExtractor={(r) => r.id}
          caption="Tabla de demostración"
        />
        <p className="text-xs text-slate-500">Estado de carga:</p>
        <DataTable
          columns={DEMO_COLUMNS}
          rows={[]}
          keyExtractor={(r) => r.id}
          caption="Tabla cargando"
          isLoading
        />
      </Section>

      <Section title="Pagination">
        <Pagination page={2} pageCount={5} makeHref={(p) => `?page=${p}`} />
      </Section>

      <Section title="Modal">
        <div className="w-fit">
          <Button onClick={() => setModalOpen(true)}>Abrir modal</Button>
        </div>
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Modal de ejemplo"
          description="Construido sobre Radix Dialog."
        >
          <p className="text-slate-300 text-sm">Contenido del modal.</p>
        </Modal>
      </Section>

      <Section title="Toast">
        <p className="text-xs text-slate-500">
          Resultado de operaciones vía <code className="text-slate-400">useToast()</code>;
          la validación de campos sigue siendo inline.
        </p>
        <div className="flex gap-3">
          <Button
            onClick={() =>
              toast({ title: "Cambios guardados", description: "La operación terminó bien." })
            }
          >
            Toast de éxito
          </Button>
          <Button
            onClick={() =>
              toast({ variant: "error", title: "No se pudo guardar", description: "Error simulado del servidor." })
            }
          >
            Toast de error
          </Button>
        </div>
      </Section>
    </div>
  );
}

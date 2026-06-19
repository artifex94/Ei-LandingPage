import { redirect } from "next/navigation";

// Al acceder a /tecnico directamente → aterrizar en Mi día
export default function TecnicoRootPage() {
  redirect("/tecnico/mi-dia");
}

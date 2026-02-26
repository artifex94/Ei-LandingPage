import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Utilizamos una fuente moderna y limpia
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Escobar Instalaciones | Seguridad y Monitoreo 24hs",
  description: "Sistemas de seguridad inteligente, alarmas, domótica y cámaras de última generación. Protegemos lo que más te importa en instalacionescob.ar",
  keywords: "seguridad, monitoreo, alarmas, domótica, control de acceso, Escobar Instalaciones, CCTV",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="scroll-smooth">
      <body className={`${inter.className} antialiased`}>
        {children}
      </body>
    </html>
  );
}
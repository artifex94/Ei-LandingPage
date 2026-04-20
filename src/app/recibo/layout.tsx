export default function ReciboLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-white text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}

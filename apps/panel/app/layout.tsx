import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Panel de la clínica",
  description: "Turnos, profesionales, pacientes y seguimientos en un solo lugar.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}

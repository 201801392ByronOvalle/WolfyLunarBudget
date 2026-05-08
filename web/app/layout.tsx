import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wolfy Lunar Budget",
  description: "Administrador de presupuesto personal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
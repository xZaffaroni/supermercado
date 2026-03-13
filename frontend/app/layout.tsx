import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SuperPOS - Sistema de Gestión de Supermercado",
  description: "Sistema completo de punto de venta y gestión para supermercado",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body className={`${inter.className} bg-slate-950 text-white antialiased`} suppressHydrationWarning>{children}</body>
    </html>
  );
}

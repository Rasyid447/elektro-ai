import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ElektroAI - Asisten Rancang Alat Elektronika",
  description:
    "Web AI yang membantu mahasiswa dan engineer teknik elektronika merancang alat: konsep, blok diagram, BOM komponen, review rangkaian, dan kode mikrokontroler.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body className="antialiased">{children}</body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import "./globals.css";

// basePath untuk GitHub Pages (diisi env saat build; lokal kosong)
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

export const metadata: Metadata = {
  title: "ElektroAI — Asisten Rancang Alat Elektronika",
  description:
    "Web AI yang membantu mahasiswa dan engineer teknik elektronika merancang alat: konsep, blok diagram, BOM komponen, review rangkaian, kode mikrokontroler, dan simulasi rangkaian langsung di browser.",
  manifest: `${basePath}/manifest.json`,
  icons: {
    icon: [{ url: `${basePath}/icon.svg`, type: "image/svg+xml" }],
    apple: [{ url: `${basePath}/icon.svg` }],
  },
  appleWebApp: {
    capable: true,
    title: "ElektroAI",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0e17",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
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

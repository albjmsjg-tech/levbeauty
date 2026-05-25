import type { Metadata } from "next";
import { Playfair_Display, Poppins, Inter, Cormorant_Garamond } from "next/font/google";
import "./globals.css";

// ── Legacy fonts (telas existentes) ──────────────────────────────
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  variable: "--font-poppins",
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

// ── Brand fonts (Fase 1) ──────────────────────────────────────────
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-italic",
  weight: ["300", "400"],
  style: ["normal", "italic"],
  display: "swap",
});

// --font-display aliases --font-playfair pra uniformidade no design system
const display = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "LevBeauty — Gestão para Salões de Beleza",
  description: "SaaS completo para salões de beleza: agendamento, precificação, financeiro e muito mais.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${playfair.variable} ${poppins.variable} ${inter.variable} ${cormorant.variable} ${display.variable}`}>
        {children}
      </body>
    </html>
  );
}

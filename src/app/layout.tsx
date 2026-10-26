import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-cormorant" });

export const metadata: Metadata = { title: "Love Lens Wedding", description: "Your wedding gallery" };
export const viewport: Viewport = { viewportFit: "cover", themeColor: "#141416" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${cormorant.variable}`}>
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}

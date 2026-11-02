import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import "./globals.css";

const body = DM_Sans({ subsets: ["latin", "latin-ext"], variable: "--font-body", display: "swap" });
const heading = Fraunces({ subsets: ["latin", "latin-ext"], variable: "--font-heading", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Dekore për evente", template: "%s" },
  description: "Struktura profesionale dhe zgjidhje për eventet tuaja — rezervoni online.",
};

export const viewport: Viewport = { themeColor: "#fbf8f5" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sq" className={`${body.variable} ${heading.variable}`}>
      <body className="min-h-dvh font-sans antialiased">
        {children}
        {/* Vercel Web Analytics: cookieless page-view counts, only active on Vercel. */}
        <Analytics />
      </body>
    </html>
  );
}

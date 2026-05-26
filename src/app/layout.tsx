import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Yarra — AI Proforma",
  description: "AI-driven real estate development proforma.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-paper text-ink">{children}</body>
    </html>
  );
}

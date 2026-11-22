import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ask your operations data",
  description: "Concept prototype, synthetic data",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

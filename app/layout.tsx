import type { Metadata } from "next";
import { Nav } from "./nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ask your operations data",
  description: "Concept prototype, synthetic data",
};

const ICONS = ["regular", "bold", "fill"].map((w) => `https://unpkg.com/@phosphor-icons/web@2.1.1/src/${w}/style.css`);

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap" />
        {ICONS.map((href) => <link key={href} rel="stylesheet" href={href} />)}
      </head>
      <body>
        <a className="skip button-sm" href="#main">Skip to content</a>
        <Nav />
        <main id="main" className="main">
          <div className="wrap">{children}</div>
        </main>
        <footer className="foot">
          <div className="wrap caption-4"><i className="ph ph-flask" aria-hidden="true" />Concept prototype, synthetic data</div>
        </footer>
      </body>
    </html>
  );
}

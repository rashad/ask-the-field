import { Flask } from "@phosphor-icons/react/ssr";
import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { Credit } from "./credit";
import { Nav } from "./nav";
import "./globals.css";

const sans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-sans" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-mono" });

const TITLE = "Ask the Field";
const DESCRIPTION = "You run a fictional oil field in the desert: 3 fields, 41 wells, 400 field reports. Ask it what went wrong in plain English; the AI answers in seconds and shows where each answer comes from. Concept prototype, synthetic data.";
const site = process.env.SITE_URL ?? "https://askthefield.darmina.com";

export const metadata: Metadata = {
  metadataBase: new URL(site),
  alternates: { canonical: "/" },
  title: { default: `${TITLE}: answers from field reports, with sources`, template: `%s | ${TITLE}` },
  description: DESCRIPTION,
  openGraph: { type: "website", siteName: TITLE, title: `${TITLE}: answers from field reports, with sources`, description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: `${TITLE}: answers from field reports, with sources`, description: DESCRIPTION },
};

export const viewport: Viewport = { themeColor: "#FAFAF7" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body>
        <a className="skip button-sm" href="#main">Skip to content</a>
        <Nav />
        <main id="main" className="main">
          <div className="wrap">{children}</div>
        </main>
        <footer className="foot">
          <div className="wrap caption-4"><Flask aria-hidden /><span>Concept prototype, synthetic data. No real company, field or well.</span><Credit /></div>
        </footer>
      </body>
    </html>
  );
}

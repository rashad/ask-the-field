import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { MODEL } from "@/lib/answer";
import { Shell } from "./shell";
import "./globals.css";

const sans = Geist({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-sans" });
const mono = Geist_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono" });

const TITLE = "Ask the Field";
const DESCRIPTION = "You run a fictional oil field in the desert: 3 fields, 41 wells, 400 field reports. Ask it what went wrong in plain English; the AI answers in seconds and shows where each answer comes from. Concept prototype, synthetic data.";
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;
const site = process.env.SITE_URL ?? "https://askthefield.darmina.com";

export const metadata: Metadata = {
  metadataBase: new URL(site),
  alternates: { canonical: "/" },
  title: { default: `${TITLE}: answers from field reports, with sources`, template: `%s | ${TITLE}` },
  description: DESCRIPTION,
  openGraph: { type: "website", siteName: TITLE, title: `${TITLE}: answers from field reports, with sources`, description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: `${TITLE}: answers from field reports, with sources`, description: DESCRIPTION },
};

export const viewport: Viewport = {
  colorScheme: "dark light",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#131415" },
    { media: "(prefers-color-scheme: light)", color: "#f4f5f7" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <a className="skip button-sm" href="#main">Skip to content</a>
        <Shell model={MODEL}>{children}</Shell>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { MODEL } from "@/lib/answer";
import { FIELDS, THEME_BG, THEME_KEY } from "@/lib/domain";
import { DOC_COUNT } from "./human";
import { Shell } from "./shell";
import "./globals.css";

const sans = Geist({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-sans" });
const mono = Geist_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono" });

const TITLE = "Ask the Field";
const DESCRIPTION = `A RAG demo: an AI that answers questions from a company's own documents and data, and shows its sources. The company is fictional: ${FIELDS.length} oil fields, 41 wells and ${DOC_COUNT} synthetic field documents. Concept prototype, nothing is real.`;
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_KEY)}),c=${JSON.stringify(THEME_BG)};if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t);document.querySelectorAll('meta[name="theme-color"]').forEach(function(m){m.media=m.content===c[t]?"all":"not all"})}}catch(e){}})()`;
const BEACON_TOKEN = process.env.CF_BEACON_TOKEN?.trim();
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
    { media: "(prefers-color-scheme: dark)", color: THEME_BG.dark },
    { media: "(prefers-color-scheme: light)", color: THEME_BG.light },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        {BEACON_TOKEN && <script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon={JSON.stringify({ token: BEACON_TOKEN })} />}
      </head>
      <body>
        <a className="skip button-sm" href="#main">Skip to content</a>
        <Shell model={MODEL}>{children}</Shell>
      </body>
    </html>
  );
}

"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  ["/", "Ask", "ph-chat-circle-text"],
  ["/data", "Data", "ph-database"],
  ["/about", "About", "ph-info"],
] as const;

export function Nav() {
  const path = usePathname();
  return (
    <header className="nav-wrap">
      <nav className="nav" aria-label="Main">
        <Link className="brand" href="/" aria-label="Ask your operations data">
          <span className="mark"><i className="ph-bold ph-drop" aria-hidden="true" /></span>
          <span className="title-4">Operations data</span>
        </Link>
        {LINKS.map(([href, label, icon]) => (
          <Link key={href} className="link button-sm" href={href} aria-current={path === href ? "page" : undefined}>
            <i className={`ph ${icon}`} aria-hidden="true" />{label}
          </Link>
        ))}
        <span className="pill caption-4">Concept prototype, synthetic data</span>
      </nav>
    </header>
  );
}

"use client";
import { ChatCircleText, Database, Drop, Info } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  ["/", "Ask", ChatCircleText],
  ["/data", "Data", Database],
  ["/about", "About", Info],
] as const;

export function Nav() {
  const path = usePathname();
  return (
    <header className="nav-wrap">
      <nav className="nav" aria-label="Main">
        <Link className="brand" href="/" aria-label="Ask the Field, home">
          <span className="mark"><Drop weight="bold" aria-hidden /></span>
          <span className="title-4">Ask the Field</span>
        </Link>
        {LINKS.map(([href, label, Icon]) => (
          <Link key={href} className="link button-sm" href={href} aria-current={path === href ? "page" : undefined}>
            <Icon aria-hidden />{label}
          </Link>
        ))}
        <span className="pill caption-4">Concept prototype, synthetic data</span>
      </nav>
    </header>
  );
}

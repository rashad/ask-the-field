"use client";
import { ChatCircleText, CheckCircle, Database, Info, List, MagnifyingGlass, MapTrifold } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { SUGGESTED } from "@/lib/questions";
import { Credit, SourceLink } from "./credit";
import { ThemeControl } from "./theme";

export const ASK_EVENT = "ask-the-field:ask";

const LINKS = [
  ["/", "Ask", ChatCircleText],
  ["/data", "Data", Database],
  ["/evals", "Evals", CheckCircle],
  ["/about", "About", Info],
] as const;

function Mark() {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path className="mk-drop" d="M16 3S6.5 13.6 6.5 19.6a9.5 9.5 0 0 0 19 0C25.5 13.6 16 3 16 3Z" strokeWidth="2.2" strokeLinejoin="round" />
      <path className="mk-lines" d="M11.5 18.5h9M11.5 23h5.5" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function Recent() {
  const params = useSearchParams();
  const path = usePathname();
  const q = path === "/" ? params.get("q") : null;
  return (
    <nav className="recent" aria-labelledby="recent-l">
      {SUGGESTED.map((s) => (
        <Link key={s} href={`/?q=${encodeURIComponent(s)}`} title={s} aria-current={q === s ? "page" : undefined}>{s}</Link>
      ))}
    </nav>
  );
}

const SECTION: Record<string, string> = { "/data": "Data", "/evals": "Evals", "/about": "About" };

function Crumb() {
  const params = useSearchParams();
  const path = usePathname();
  if (path !== "/") return <div className="crumb"><span>{SECTION[path] ?? "Ask the Field"}</span></div>;
  return <div className="crumb"><span>Ask</span><span className="sep" aria-hidden>/</span><span>{params.get("q") || "New question"}</span></div>;
}

const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));

export function Shell({ model, children }: { model: string; children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const side = useRef<HTMLElement>(null);
  const menu = useRef<HTMLButtonElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const refocus = useRef(false);

  const close = (restore: boolean) => {
    refocus.current = restore;
    setOpen(false);
  };

  useEffect(() => setOpen(false), [path]);

  useEffect(() => {
    const wide = window.matchMedia("(min-width: 900px)");
    const onWide = () => wide.matches && setOpen(false);
    wide.addEventListener("change", onWide);
    return () => wide.removeEventListener("change", onWide);
  }, []);

  useEffect(() => {
    if (!open) {
      if (refocus.current) menu.current?.focus();
      refocus.current = false;
      return;
    }
    side.current?.querySelector<HTMLElement>("a, button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(true);
      if (e.key !== "Tab" || !side.current) return;
      const els = [...side.current.querySelectorAll<HTMLElement>("a, button:not([tabindex='-1'])")];
      const [first, last] = [els[0], els.at(-1)];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey || typing(e.target)) return;
      const target = document.getElementById("q") ?? field.current;
      if (!target || target.offsetParent === null) return;
      e.preventDefault();
      target.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const ask = (e: React.FormEvent) => {
    e.preventDefault();
    const q = text.trim();
    if (q.length < 3) return;
    const handled = path === "/" && !window.dispatchEvent(new CustomEvent(ASK_EVENT, { detail: q, cancelable: true }));
    if (!handled) router.push(`/?q=${encodeURIComponent(q)}`);
    setText("");
    field.current?.blur();
  };

  const recentFallback = <nav className="recent" aria-labelledby="recent-l">{SUGGESTED.map((s) => <Link key={s} href={`/?q=${encodeURIComponent(s)}`} title={s}>{s}</Link>)}</nav>;

  return (
    <div className={`app${open ? " nav-open" : ""}`}>
      <aside className="side" id="side" aria-label="Primary" ref={side} onClick={(e) => { if ((e.target as Element).closest("a")) close(false); }}>
        <Link className="brand" href="/"><Mark />Ask the Field</Link>
        <div className="ws"><span className="av"><MapTrifold aria-hidden /></span><div><b>Demo workspace</b><small>3 fields, 41 wells</small></div></div>
        <nav className="snav" aria-label="Sections">
          {LINKS.map(([href, label, Icon]) => (
            <Link key={href} href={href} aria-current={path === href ? "page" : undefined}><Icon aria-hidden />{label}</Link>
          ))}
        </nav>
        <div className="nav-label" id="recent-l">Briefing questions</div>
        <Suspense fallback={recentFallback}><Recent /></Suspense>
        <div className="side-foot">
          <div className="snav"><SourceLink label="GitHub" /></div>
          <ThemeControl />
          <span className="chip"><span className="dot off" aria-hidden />Concept prototype, synthetic data</span>
          <Credit />
        </div>
      </aside>
      <div className="scrim" onClick={() => close(true)} aria-hidden />
      <div className="main" inert={open}>
        <header className="topbar">
          <button ref={menu} type="button" className="menu" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} aria-controls="side" onClick={() => setOpen(!open)}><List aria-hidden /></button>
          <Suspense fallback={<div className="crumb"><span>Ask the Field</span></div>}><Crumb /></Suspense>
          <div className="top-r">
            <form className="cmd" role="search" onSubmit={ask}>
              <MagnifyingGlass aria-hidden />
              <label className="sr" htmlFor="cmd">Ask a question</label>
              <input id="cmd" ref={field} type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask a question" autoComplete="off" minLength={3} maxLength={300} />
              <kbd aria-hidden>/</kbd>
            </form>
            <span className="chip" title={`Model: ${model}`}><span className="dot" aria-hidden /><span className="t mono" aria-hidden>{model}</span><span className="sr">Model: {model}</span></span>
          </div>
        </header>
        <main id="main">{children}</main>
      </div>
    </div>
  );
}

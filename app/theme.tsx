"use client";
import { useLayoutEffect, useRef, useState } from "react";

const KEY = "theme";
const CHOICES = [["auto", "Auto"], ["light", "Light"], ["dark", "Dark"]] as const;
type Choice = (typeof CHOICES)[number][0];
const BG = { light: "#f4f5f7", dark: "#131415" };

function stored(): Choice {
  try {
    const t = localStorage.getItem(KEY);
    return t === "light" || t === "dark" ? t : "auto";
  } catch {
    return "auto";
  }
}

function apply(t: Choice) {
  const root = document.documentElement;
  if (t === "auto") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", t);
  for (const m of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) m.content = t === "auto" ? (m.media.includes("dark") ? BG.dark : BG.light) : BG[t];
}

export function ThemeControl() {
  const [theme, setTheme] = useState<Choice>("auto");
  const group = useRef<HTMLDivElement>(null);

  // Also restores the attribute that the dev Strict Mode remount strips from <html>.
  useLayoutEffect(() => {
    const t = stored();
    setTheme(t);
    apply(t);
  }, []);

  const choose = (t: Choice, focus = false) => {
    setTheme(t);
    apply(t);
    try {
      if (t === "auto") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, t);
    } catch {}
    if (focus) group.current?.querySelector<HTMLElement>(`[data-v="${t}"]`)?.focus();
  };

  const onKey = (e: React.KeyboardEvent) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const i = CHOICES.findIndex(([v]) => v === theme);
    choose(CHOICES[(i + step + CHOICES.length) % CHOICES.length][0], true);
  };

  return (
    <div className="seg theme" role="radiogroup" aria-label="Theme" ref={group} onKeyDown={onKey}>
      {CHOICES.map(([v, label]) => (
        <button key={v} type="button" role="radio" data-v={v} aria-checked={theme === v} tabIndex={theme === v ? 0 : -1} onClick={() => choose(v)}>{label}</button>
      ))}
    </div>
  );
}

"use client";
import { useEffect, type RefObject } from "react";

const NS = "http://www.w3.org/2000/svg";
const LANE = 6;

interface State { el: Element; links: HTMLElement[]; sents: HTMLElement[]; refs: string[] }

const refsOf = (el: HTMLElement) => (el.dataset.refs ?? "").split(" ").filter(Boolean);

export function useConnector(stageRef: RefObject<HTMLElement | null>, ready: boolean) {
  useEffect(() => {
    const stage = stageRef.current;
    if (!ready || !stage) return;
    const svg = stage.querySelector<SVGSVGElement>("[data-links]");
    const col = stage.querySelector<HTMLElement>("[data-col]");
    if (!svg || !col) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const narrow = window.matchMedia("(max-width: 899px)");
    const srcOf = (ref: string) => stage.querySelector<HTMLElement>(`#src-${ref}`);
    const cites = [...stage.querySelectorAll<HTMLElement>(".cite")].filter((c) => srcOf(c.dataset.ref ?? ""));
    const sents = [...stage.querySelectorAll<HTMLElement>(".sent")];
    const srcs = [...stage.querySelectorAll<HTMLElement>(".src")];
    const rest = cites.find((c) => c.closest(".ans")) ?? null;
    let pinned: State | null = null;
    let hover: State | null = null;
    let current: State | null = null;
    let lastKey = "";

    function resolve(target: EventTarget | null): State | null {
      if (!(target instanceof Element)) return null;
      const c = target.closest<HTMLElement>(".cite");
      if (c && cites.includes(c)) {
        const s = c.closest<HTMLElement>(".sent");
        return { el: c, links: [c], sents: s ? [s] : [], refs: [c.dataset.ref!] };
      }
      const st = target.closest<HTMLElement>(".sent");
      if (st) {
        const links = [...st.querySelectorAll<HTMLElement>(".cite")].filter((x) => cites.includes(x));
        return links.length ? { el: st, links, sents: [st], refs: links.map((x) => x.dataset.ref!) } : null;
      }
      const r = target.closest<HTMLElement>(".src");
      if (r) {
        const ref = r.dataset.ref!;
        return { el: r, links: cites.filter((x) => x.dataset.ref === ref), sents: sents.filter((x) => refsOf(x).includes(ref)), refs: [ref] };
      }
      return null;
    }

    function pathFor(c: HTMLElement, ref: string, o: DOMRect) {
      const card = srcOf(ref)!;
      const cb = card.getBoundingClientRect();
      const xa = col!.getBoundingClientRect().right - o.left + 8;
      const xb = cb.left - o.left;
      let my = cb.top + 28;
      const m = card.querySelector("mark")?.getClientRects()[0];
      const box = card.querySelector(".passage")?.getBoundingClientRect();
      if (m && (!box || (m.bottom > box.top && m.top < box.bottom))) my = m.top + m.height / 2;
      my = Math.min(Math.max(my, cb.top + 20), cb.bottom - 20);
      const sy = my - o.top;
      const b = c.getBoundingClientRect();
      const cx = b.left + b.width / 2 - o.left;
      let d: string, gy: number;
      // A marker close to the gutter goes straight out; any other drops into the gap below its line first.
      if (xa - (b.right - o.left) < 28) {
        gy = b.top + b.height / 2 - o.top;
        d = `M${b.right - o.left},${gy}`;
      } else {
        gy = b.bottom - o.top + LANE;
        const r = Math.max(0, Math.min(8, xa - cx - 2));
        d = `M${cx},${b.bottom - o.top} V${gy - r} Q${cx},${gy} ${cx + r},${gy}`;
      }
      d += ` H${xa} C${xa + 40},${gy} ${xb - 40},${sy} ${xb},${sy}`;
      return { d, x: xb, y: sy };
    }

    function draw(state: State | null, animate: boolean) {
      if (narrow.matches || !state) { svg!.replaceChildren(); lastKey = ""; return; }
      const o = stage!.getBoundingClientRect();
      const pairs = state.links.map((c) => [c, c.dataset.ref!] as const);
      const key = pairs.map(([c, r]) => r + cites.indexOf(c)).join("|");
      if (key !== lastKey || svg!.childNodes.length !== pairs.length * 2) svg!.replaceChildren();
      lastKey = key;
      pairs.forEach(([c, ref], i) => {
        const g = pathFor(c, ref, o);
        let path = svg!.childNodes[i * 2] as SVGPathElement | undefined;
        let dot = svg!.childNodes[i * 2 + 1] as SVGCircleElement | undefined;
        if (!path || !dot) {
          path = document.createElementNS(NS, "path");
          path.setAttribute("pathLength", "1");
          dot = document.createElementNS(NS, "circle");
          dot.setAttribute("r", "3");
          if (animate && !reduce.matches) { path.setAttribute("class", "draw"); dot.setAttribute("class", "draw"); }
          svg!.append(path, dot);
        }
        path.setAttribute("d", g.d);
        dot.setAttribute("cx", String(g.x));
        dot.setAttribute("cy", String(g.y));
      });
    }

    const flag = (el: Element, name: string, on: boolean) => (on ? el.setAttribute(name, "") : el.removeAttribute(name));

    function apply(state: State | null, animate: boolean) {
      current = state;
      flag(stage!, "data-active", !!state);
      const refs = state?.refs ?? [];
      for (const c of cites) {
        const on = !!state?.links.includes(c);
        flag(c, "data-on", on);
        flag(c, "data-echo", !on && refs.includes(c.dataset.ref!));
      }
      for (const s of sents) flag(s, "data-on", !!state?.sents.includes(s));
      for (const s of srcs) flag(s, "data-on", refs.includes(s.dataset.ref!));
      draw(state, animate);
    }

    const settle = (animate: boolean) => apply(pinned ?? hover ?? resolve(rest), animate);
    const smooth = (): ScrollBehavior => (reduce.matches ? "auto" : "smooth");

    let pending = 0;
    const schedule = () => {
      if (pending) return;
      pending = requestAnimationFrame(() => { pending = 0; draw(current, false); });
    };

    const onOver = (e: MouseEvent) => {
      const s = resolve(e.target);
      if (s && hover?.el !== s.el) { hover = s; settle(true); }
      else if (!s && hover) { hover = null; settle(true); }
    };
    const onLeave = () => { hover = null; settle(true); };
    const onFocusIn = (e: FocusEvent) => { const s = resolve(e.target); if (s) { hover = s; settle(true); } };
    const onFocusOut = (e: FocusEvent) => { if (!resolve(e.relatedTarget)) { hover = null; settle(true); } };
    const pin = (target: EventTarget | null, fromKey: boolean) => {
      const s = resolve(target);
      if (!s) return;
      pinned = pinned?.el === s.el ? null : s;
      settle(true);
      if (narrow.matches && pinned && (target as Element).closest(".cite")) srcOf(pinned.refs[0])?.scrollIntoView({ behavior: smooth(), block: "center" });
      if (fromKey && narrow.matches && pinned) srcOf(pinned.refs[0])?.focus({ preventScroll: true });
    };
    const onClick = (e: MouseEvent) => {
      const t = e.target as Element;
      if (t.closest("[data-back]")) {
        e.preventDefault();
        const back = pinned?.links[0] ?? rest;
        back?.scrollIntoView({ behavior: smooth(), block: "center" });
        back?.focus({ preventScroll: true });
        return;
      }
      if (t.closest("a")) return;
      pin(t, e.detail === 0);
    };
    const onCardKey = (e: KeyboardEvent) => {
      if ((e.key === "Enter" || e.key === " ") && (e.target as Element).classList?.contains("src")) { e.preventDefault(); pin(e.target, true); }
    };
    const onDocClick = (e: MouseEvent) => {
      if (pinned && !(e.target as Element).closest?.(".cite, .sent, .src")) { pinned = null; settle(true); }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && (pinned || hover)) { pinned = null; hover = null; settle(true); }
    };
    const onNarrow = () => settle(false);
    const ro = new ResizeObserver(schedule);
    ro.observe(stage);
    for (const el of [col, ...srcs]) ro.observe(el);

    stage.addEventListener("mouseover", onOver);
    stage.addEventListener("mouseleave", onLeave);
    stage.addEventListener("focusin", onFocusIn);
    stage.addEventListener("focusout", onFocusOut);
    stage.addEventListener("click", onClick);
    stage.addEventListener("keydown", onCardKey);
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", schedule);
    document.addEventListener("scroll", schedule, { capture: true, passive: true });
    narrow.addEventListener("change", onNarrow);
    let alive = true;
    document.fonts.ready.then(() => alive && settle(false));
    settle(true);

    return () => {
      alive = false;
      cancelAnimationFrame(pending);
      ro.disconnect();
      stage.removeEventListener("mouseover", onOver);
      stage.removeEventListener("mouseleave", onLeave);
      stage.removeEventListener("focusin", onFocusIn);
      stage.removeEventListener("focusout", onFocusOut);
      stage.removeEventListener("click", onClick);
      stage.removeEventListener("keydown", onCardKey);
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", schedule);
      document.removeEventListener("scroll", schedule, { capture: true });
      narrow.removeEventListener("change", onNarrow);
      svg.replaceChildren();
      for (const el of [stage, ...cites, ...sents, ...srcs]) for (const a of ["data-active", "data-on", "data-echo"]) el.removeAttribute(a);
    };
  }, [stageRef, ready]);
}

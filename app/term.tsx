"use client";
import { useEffect, useId, useRef, useState } from "react";

export const GLOSSARY = {
  well: ["well", "A hole drilled deep into the rock. Oil, gas and water come up through it."],
  bbl: ["barrels a day", "How fast a well produces. One barrel is 159 litres. A good well here makes about 1,000 barrels a day."],
  esp: ["ESP", "Electric submersible pump: the electric pump at the bottom of a well that lifts the oil to the surface."],
  wc: ["water cut", "The share of water in what comes out of the well. More water means less oil for the same effort."],
  workover: ["workover", "A repair job on a well. A rig pulls the equipment out of the hole. The well produces nothing for days."],
  shift: ["shift report", "The note the lead operator writes at the end of every shift: production, problems, handover."],
  incident: ["incident note", "The engineer's write-up of a problem: what happened, what was done, what it cost."],
  batch: ["batch", "A set of pumps made together at the factory. A defect in one batch can show up in every pump from it."],
  shutin: ["shut in", "A well closed on purpose, for safety or for a repair. It produces nothing."],
} as const;

export type TermKey = keyof typeof GLOSSARY;

export function Term({ k, children }: { k: TermKey; children?: React.ReactNode }) {
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [right, setRight] = useState(false);
  const wasOpen = useRef(false);
  const show = () => {
    const r = ref.current?.getBoundingClientRect();
    if (r) setRight(r.left > window.innerWidth / 2);
    setOpen(true);
  };
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);
  return (
    <span className="term" ref={ref} onMouseEnter={show} onMouseLeave={() => setOpen(false)}>
      <button type="button" className="term-b" aria-describedby={id} aria-expanded={open} onPointerDown={(e) => (wasOpen.current = e.pointerType !== "mouse" && open)} onClick={() => { if (wasOpen.current) setOpen(false); else show(); wasOpen.current = false; }} onFocus={show} onBlur={() => setOpen(false)} onKeyDown={(e) => e.key === "Escape" && setOpen(false)}>
        {children ?? GLOSSARY[k][0]}
      </button>
      <span role="tooltip" id={id} className="term-tip caption-4" data-open={open || undefined} data-right={right || undefined}>
        <b>{GLOSSARY[k][0]}</b> {GLOSSARY[k][1]}
      </span>
    </span>
  );
}

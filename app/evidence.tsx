"use client";
import { ArrowUpRight, CheckCircle, WarningCircle } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { useEffect, useRef } from "react";
import type { AskEvent } from "@/lib/answer";
import { docTypeLabel, num as n, shortDate, TODAY } from "@/lib/domain";
import { findQuote } from "@/lib/quote";
import { coveredEvents, producer } from "@/lib/sources";
import type { EventRow, SearchChunk, SearchTrace } from "@/lib/tools";
import type { Step } from "./human";
import { Md } from "./md";

export type Final = Extract<AskEvent, { type: "final" }>;
type Source = Final["answer"]["sources"][number];

function monthsBack(period = "") {
  const from = period.slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(from)) return 6;
  const k = (Number(TODAY.slice(0, 4)) - Number(from.slice(0, 4))) * 12 + Number(TODAY.slice(5, 7)) - Number(from.slice(5, 7)) + 1;
  return [6, 12, 18].find((m) => m >= k) ?? 18;
}

function sourceHref(s: Source) {
  const { kind, id } = s;
  if (kind === "chunk") return `/data?chunk=${encodeURIComponent(id)}${s.quote_verified && s.quote ? `&quote=${encodeURIComponent(s.quote)}` : ""}`;
  const [table, scope] = id.split(":");
  const name = table === "production_daily" ? "production" : table;
  const q = name === "production" ? (scope === "all" ? "" : scope) : scope;
  return `/data?tab=tables&table=${name}${q ? `&q=${encodeURIComponent(q)}` : ""}${name === "production" ? `&months=${monthsBack(id.split(":")[2])}` : ""}`;
}

export function chunkIndex(trace: SearchTrace[]) {
  const chunks = new Map<string, { chunk: SearchChunk; trace: SearchTrace }>();
  for (const t of trace) for (const c of t.chunks_sent) if (!chunks.has(c.chunk_id)) chunks.set(c.chunk_id, { chunk: c, trace: t });
  return chunks;
}

export const callLabel = (s: Step | undefined) => (s ? `${s.name}${s.output?.ref ? ` (${s.output.ref})` : ""}` : null);

function TableBody({ s, steps, events }: { s: Source; steps: Step[]; events: EventRow[] }) {
  const [table, key] = s.id.split(":");
  const from = callLabel(producer(s.id, steps));
  const note = <p className="evt-d">{from ? <>Rows returned by tool call <span className="mono">{from}</span>.</> : "No tool call in this run returned these rows."}</p>;
  if (table === "events") {
    const rows = coveredEvents(key, s.label, (producer(s.id, steps)?.output?.events ?? []) as EventRow[]);
    const shown = rows.length ? rows : events.filter((x) => x.event_id === key).slice(0, 1);
    if (!shown.length) return note;
    const total = rows.length > 1 && rows.every((e) => e.lost_oil_bbl != null) ? rows.reduce((t, e) => t + e.lost_oil_bbl!, 0) : null;
    const e = shown[0];
    return (
      <>
        <div className="evt" role="table" aria-label={shown.length > 1 ? `${shown.length} event rows` : "Event row"}>
          {shown.map((x) => (
            <div key={x.event_id} role="row" style={{ display: "contents" }}>
              <span className="id" role="cell">{x.event_id}</span><span className="id" role="cell">{x.well_id}</span><span role="cell">{x.type}</span><span className="r" role="cell">{x.lost_oil_bbl == null ? "" : `${n(x.lost_oil_bbl)} bbl`}</span>
            </div>
          ))}
          {total !== null && (
            <div role="row" style={{ display: "contents" }}>
              <span className="tot" role="cell" style={{ gridColumn: "1 / 4" }}>Total of these {shown.length} rows</span><span className="r tot" role="cell">{n(total)} bbl</span>
            </div>
          )}
        </div>
        {shown.length === 1 && <p className="evt-d">{e.field}, {shortDate(e.start_date)}{e.end_date ? ` to ${shortDate(e.end_date)}` : ""}, {e.status}{e.severity ? `, ${e.severity} severity` : ""}. {e.description}</p>}
        {note}
      </>
    );
  }
  const out = producer(s.id, steps)?.output;
  if (table === "wells") {
    const w = out?.wells?.find((x: { well_id: string }) => x.well_id === key);
    return (
      <>
        {w && <div className="evt"><span className="id">{w.well_id}</span><span>{w.field}</span><span>{w.status}</span><span className="r">{w.open_incidents ?? ""}</span></div>}
        {note}
      </>
    );
  }
  const wc = out?.metric === "water_cut";
  const val = (v: number) => (wc ? `${(v * 100).toFixed(1)}%` : n(Math.round(v)));
  const series = (out?.series ?? []) as { name: string; points: { x: string; y: number }[] }[];
  const rows = (out?.rows ?? []) as { well_id: string; value: number }[];
  return (
    <>
      {series.slice(0, 2).map((ser) => (
        <div key={ser.name} className="evt" style={{ gridTemplateColumns: "minmax(0,1fr) auto" }} role="table" aria-label={ser.name}>
          {ser.points.map((p) => [<span key={p.x} role="cell">{ser.name}, {p.x.slice(0, 7)}</span>, <span key={`${p.x}v`} className="r" role="cell">{val(p.y)}</span>])}
        </div>
      ))}
      {rows.length > 0 && (
        <div className="evt" style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}>
          {rows.slice(0, 10).map((r) => [<span key={r.well_id} className="id">{r.well_id}</span>, <span key={`${r.well_id}v`} className="r">{val(r.value)}</span>])}
        </div>
      )}
      {note}
    </>
  );
}

export function Evidence({ final, steps, events }: { final: Final; steps: Step[]; events: EventRow[] }) {
  const { sources } = final.answer;
  const chunks = chunkIndex(final.trace);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      for (const box of panel.current?.querySelectorAll<HTMLElement>(".passage") ?? []) {
        const m = box.querySelector("mark");
        if (m) box.scrollTop = Math.max(0, m.getBoundingClientRect().top - box.getBoundingClientRect().top - 32);
        box.toggleAttribute("data-scrolled", box.scrollTop > 0);
      }
    });
    return () => cancelAnimationFrame(id);
  }, [final]);
  const searchRef = (callId: string) => steps.find((s) => s.id === callId)?.output?.ref as string | undefined;
  return (
    <div ref={panel}>
      <div className="side-h"><h2>Evidence</h2><span>{sources.length} {sources.length === 1 ? "source" : "sources"}</span></div>
      {sources.length === 0 && <p className="wait">This answer cites no source.</p>}
      {sources.map((s) => {
        const hit = s.kind === "chunk" ? chunks.get(s.id) : undefined;
        const c = hit?.chunk;
        const span = c && s.quote_verified ? findQuote(c.text, s.quote) : null;
        const fused = hit?.trace.fused.find((f) => f.chunk_id === s.id);
        const sref = hit ? searchRef(hit.trace.call_id) : undefined;
        const [table] = s.id.split(":");
        return (
          <article key={s.n + s.id} className="src" id={`src-${s.n}`} data-ref={s.n} tabIndex={0} aria-label={`Source ${s.n}: ${c ? `${c.document_id}, ${c.title}` : s.label}`}>
            <header>
              <span className="num">{s.n}</span>
              <div style={{ minWidth: 0 }}>
                {c ? <h3><span className="id">{c.document_id}</span> {c.title.replace(/^[^:]*:\s*/, "")}</h3> : <h3>{s.label}</h3>}
                <p>{c ? [docTypeLabel(c.doc_type), shortDate(c.date), c.well_id ?? c.field].filter(Boolean).join(" · ") : `Data table · ${table === "production_daily" ? "daily production" : table}`}</p>
              </div>
            </header>
            {c ? (
              <>
                <div className="passage" onScroll={(e) => e.currentTarget.toggleAttribute("data-scrolled", e.currentTarget.scrollTop > 0)}><Md text={c.text} span={span} skipTitle /></div>
                {span ? <p className="qnote"><CheckCircle aria-hidden />Quote checked against the report, word for word.</p>
                  : s.quote_verified === false ? <p className="qnote bad"><WarningCircle aria-hidden />Quote not found in the report, so nothing is highlighted.</p> : null}
                <div className="ranks">
                  {fused && <><span>Vector <b>{fused.vector_rank ? `#${fused.vector_rank}` : "none"}</b></span><span>Full text <b>{fused.full_text_rank ? `#${fused.full_text_rank}` : "none"}</b></span><span>Fused <b>#{fused.rank}</b></span></>}
                  {sref && <span>Search <b>{sref}</b></span>}
                </div>
              </>
            ) : s.kind === "chunk" ? (
              <p className="qnote bad"><WarningCircle aria-hidden />No search in this run returned this passage.</p>
            ) : (
              <TableBody s={s} steps={steps} events={events} />
            )}
            <div className="src-f">
              <Link className="textlink" href={sourceHref(s)}>Open in Data<ArrowUpRight aria-hidden /></Link>
              <a className="back" href="#answer" data-back>Back to answer</a>
            </div>
          </article>
        );
      })}
    </div>
  );
}

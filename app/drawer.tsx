"use client";
import { ArrowUpRight, CaretDown, CheckCircle, Database, FileText, Quotes, X, XCircle } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { useEffect, useRef } from "react";
import type { AskEvent } from "@/lib/answer";
import { findQuote } from "@/lib/quote";
import type { EventRow, SearchChunk } from "@/lib/tools";
import { docTypeLabel, shortDate, TODAY } from "@/lib/domain";
import { found, say, type Step } from "./human";
import { Md } from "./md";

type Final = Extract<AskEvent, { type: "final" }>;
type Source = Final["answer"]["sources"][number];

const MAX_RRF = 2 / 61;
function monthsBack(period = "") {
  const from = period.slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(from)) return 6;
  const n = (Number(TODAY.slice(0, 4)) - Number(from.slice(0, 4))) * 12 + Number(TODAY.slice(5, 7)) - Number(from.slice(5, 7)) + 1;
  return [6, 12, 18].find((m) => m >= n) ?? 18;
}

export function sourceHref(s: Source) {
  const { kind, id } = s;
  if (kind === "chunk") return `/data?chunk=${encodeURIComponent(id)}${s.quote_verified && s.quote ? `&quote=${encodeURIComponent(s.quote)}` : ""}`;
  const [table, scope] = id.split(":");
  const name = table === "production_daily" ? "production" : table;
  const q = name === "production" ? (scope === "all" ? "" : scope) : scope;
  return `/data?tab=tables&table=${name}${q ? `&q=${encodeURIComponent(q)}` : ""}${name === "production" ? `&months=${monthsBack(id.split(":")[2])}` : ""}`;
}

function TableSource({ s, events }: { s: Source; events: EventRow[] }) {
  const [table, key] = s.id.split(":");
  const ev = table === "events" ? events.find((e) => e.event_id === key) : undefined;
  const what = table === "events" ? "the event log" : table === "wells" ? "the list of wells" : "the daily production table";
  return (
    <>
      <p className="body-6 mute">A row from {what}, not a report.</p>
      {ev && (
        <dl className="kv body-6">
          <dt>Event</dt><dd><span className="mono">{ev.event_id}</span>, {ev.type}</dd>
          <dt>Well</dt><dd><span className="mono">{ev.well_id}</span>, {ev.field}</dd>
          <dt>Started</dt><dd>{shortDate(ev.start_date)}, {ev.status}{ev.severity ? `, ${ev.severity} severity` : ""}</dd>
          {ev.description && <><dt>Description</dt><dd>{ev.description}</dd></>}
        </dl>
      )}
    </>
  );
}

export function Drawer({ open, onClose, steps, final, events, focus }: { open: boolean; onClose: () => void; steps: Step[]; final: Final; events: EventRow[]; focus: number | null }) {
  const body = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open, onClose]);
  useEffect(() => {
    if (!open || !body.current) return;
    const el = focus === null ? null : body.current.querySelector(`#src-${focus}`);
    if (el) el.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    else body.current.scrollTop = 0;
  }, [open, focus]);

  const { answer, trace } = final;
  const chunks = new Map<string, SearchChunk>();
  for (const t of trace) for (const c of t.chunks_sent) if (!chunks.has(c.chunk_id)) chunks.set(c.chunk_id, c);
  const cited = new Set(answer.sources.filter((s) => s.kind === "chunk").map((s) => s.id));
  const others = [...chunks.values()].filter((c) => !cited.has(c.chunk_id));
  const docs = new Set([...chunks.values()].map((c) => c.document_id)).size;
  const fullTextOnly = trace.some((t) => t.full_text_only);
  const quoted = answer.sources.filter((s) => s.kind === "chunk");
  const u = final.usage;

  return (
    <div className={open ? "drawer-open" : undefined}>
      <div className="scrim" onClick={onClose} />
      <aside id="drawer" className="drawer" role="dialog" aria-modal="true" aria-labelledby="dtitle" aria-hidden={!open}>
        <div className="drawer-head">
          <div>
            <h2 id="dtitle" className="heading-6">How this answer was built</h2>
            <p className="body-6 mute">{steps.length} {steps.length === 1 ? "step" : "steps"}. It read {chunks.size} passages from {docs} {docs === 1 ? "report" : "reports"} and cited {answer.sources.length} sources.</p>
          </div>
          <button className="icon-btn" type="button" onClick={onClose} aria-label="Close"><X aria-hidden /></button>
        </div>
        <div className="drawer-body" ref={body}>
          <h3 className="caption-3 mute dsec">What the AI did</h3>
          <ol className="steps-list">
            {steps.map((s, i) => (
              <li key={s.id}>
                <span className="n mono caption-3">{i + 1}</span>
                <div style={{ minWidth: 0 }}>
                  <p className="body-5">{say(s.name, s.args).replace(/\.\.\.$/, ".")}</p>
                  <p className="body-6 mute">{found(s)}</p>
                </div>
              </li>
            ))}
            <li>
              <span className="n mono caption-3">{steps.length + 1}</span>
              <div><p className="body-5">Wrote the answer and linked each fact to its source.</p><p className="body-6 mute">It may only cite what the steps above returned. Nothing else counts as a source.{quoted.length > 0 && ` The server checked ${quoted.filter((q) => q.quote_verified).length} of ${quoted.length} quotes word for word against their reports.`}</p></div>
            </li>
          </ol>
          {fullTextOnly && <p className="note body-6"><XCircle aria-hidden />The meaning search service did not answer, so this search matched exact words only.</p>}

          <h3 className="caption-3 mute dsec">The sources behind the answer</h3>
          <ol className="passes">
            {answer.sources.map((s) => {
              const c = s.kind === "chunk" ? chunks.get(s.id) : undefined;
              const span = c && s.quote_verified ? findQuote(c.text, s.quote) : null;
              return (
                <li key={s.n + s.id} id={`src-${s.n}`} className={`pass${focus === s.n ? " focus" : ""}`}>
                  <div className="pass-top">
                    <span className="n mono caption-3">{s.n}</span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <h4 className="body-4">{c ? c.title : s.label}</h4>
                      <p className="caption-4 mute">
                        {c ? <>{c.doc_type === "incident_note" ? <span className="inc-tag">{docTypeLabel(c.doc_type)}</span> : docTypeLabel(c.doc_type)}, <span className="mono">{c.document_id}</span>{c.well_id ? `, ${c.well_id}` : ""}, {shortDate(c.date)}</> : <><Database aria-hidden /> Data table, <span className="mono">{s.id}</span></>}
                      </p>
                    </div>
                  </div>
                  {focus === s.n && <p className="caption-3 you">You opened this source.{span ? " The quoted passage is highlighted." : ""}</p>}
                  {c && (span ? (
                    <p className="caption-4 quote-ok"><CheckCircle weight="fill" aria-hidden />Quote checked against the report, word for word.</p>
                  ) : (
                    <p className="caption-4 quote-miss"><Quotes aria-hidden />Quote not found in the report, so nothing is highlighted.</p>
                  ))}
                  {c ? <div className="pass-text"><Md text={c.text} span={span} skipTitle /></div> : <TableSource s={s} events={events} />}
                  <Link className="textlink button-sm" href={sourceHref(s)}>{c ? "Open the full report" : "Open the table"}<ArrowUpRight aria-hidden /></Link>
                </li>
              );
            })}
          </ol>

          {others.length > 0 && (
            <details className="more">
              <summary className="body-5"><FileText aria-hidden />{others.length} more {others.length === 1 ? "passage" : "passages"} it read but did not need<CaretDown aria-hidden /></summary>
              <ul className="others">
                {others.map((c) => (
                  <li key={c.chunk_id}>
                    <Link href={`/data?chunk=${encodeURIComponent(c.chunk_id)}`} className="body-6"><span className="mono">{c.document_id}</span> {c.title}<ArrowUpRight aria-hidden /></Link>
                  </li>
                ))}
              </ul>
            </details>
          )}

          <details className="eng">
            <summary className="body-5"><CheckCircle aria-hidden />For engineers<CaretDown aria-hidden /></summary>
            <div className="eng-body">
              <h4 className="caption-3 mute dsec">Tool calls</h4>
              <ol className="eng-calls">
                {steps.map((s) => <li key={s.id} className="mono caption-4 wrapany">{s.name}({JSON.stringify(s.args)}){s.state === "repeated" ? " -> reused earlier result" : ""}</li>)}
              </ol>
              {trace.length > 0 && (
                <>
                  <h4 className="caption-3 mute dsec">Hybrid retrieval</h4>
                  <p className="body-6 mute">Each search takes the top 20 by vector similarity (Voyage embeddings, pgvector) and the top 20 by Postgres full text, fuses them with reciprocal rank fusion (k=60) and keeps the top k. Metadata filters run in SQL before ranking.</p>
                  <div className="md-table">
                    <table>
                      <thead><tr><th>Passage</th><th>Vector rank</th><th>Cosine</th><th>Text rank</th><th>RRF</th></tr></thead>
                      <tbody>
                        {[...chunks.values()].map((c) => (
                          <tr key={c.chunk_id} className={cited.has(c.chunk_id) ? "hl" : undefined}>
                            <td className="mono">{c.chunk_id}</td>
                            <td className="mono">{c.scores.vector_rank ?? "-"}</td>
                            <td className="mono">{c.scores.vector_similarity ?? "-"}</td>
                            <td className="mono">{c.scores.full_text_rank ?? "-"}</td>
                            <td className="mono">{(c.scores.rrf / MAX_RRF).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="caption-4 mute">RRF is shown as a share of the best possible score. Highlighted rows are cited.</p>
                </>
              )}
              <h4 className="caption-3 mute dsec">Run</h4>
              <p className="mono caption-4">{final.model}, {u.steps} model steps, {(final.latency_ms / 1000).toFixed(1)} s, tokens in {u.input_tokens} + cache read {u.cache_read_tokens} + cache write {u.cache_write_tokens}, out {u.output_tokens}, {u.cost_usd === null ? "cost unknown" : `$${u.cost_usd.toFixed(4)}`}</p>
            </div>
          </details>
        </div>
      </aside>
    </div>
  );
}

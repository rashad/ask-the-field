"use client";
import Link from "next/link";
import { useEffect } from "react";
import type { SearchChunk, SearchTrace } from "@/lib/tools";
import { shortDate } from "./viz";

export interface Step { id: string; name: string; args: Record<string, unknown>; label: string; state: "running" | "done" | "repeated" | "error"; count?: number }

const MAX_RRF = 2 / 61;
const NAMES: Record<string, string> = { well_ids: "wells", doc_type: "document type", group_by: "grouped by", compare_from: "baseline from", compare_to: "baseline to", k: "passages" };

function plain(args: Record<string, unknown>) {
  return Object.entries(args)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${NAMES[k] ?? k}: ${Array.isArray(v) ? v.join(", ") : String(v).replace(/_/g, " ")}`)
    .join("; ");
}

export function Drawer({ open, onClose, steps, traces, cited }: { open: boolean; onClose: () => void; steps: Step[]; traces: SearchTrace[]; cited: Set<string> }) {
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open, onClose]);

  const seen = new Map<string, SearchChunk>();
  for (const t of traces) for (const c of t.chunks_sent) if (!seen.has(c.chunk_id)) seen.set(c.chunk_id, c);
  const passages = [...seen.values()].sort((a, b) => Number(cited.has(b.chunk_id)) - Number(cited.has(a.chunk_id)) || b.scores.rrf - a.scores.rrf);
  const fullTextOnly = traces.some((t) => t.full_text_only);
  const docs = new Set(passages.map((p) => p.document_id)).size;

  return (
    <div className={open ? "drawer-open" : undefined}>
      <div className="scrim" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="dtitle" aria-hidden={!open}>
        <div className="drawer-head">
          <div>
            <h2 id="dtitle" className="heading-6">How this answer was built</h2>
            <p className="body-6 mute">{steps.length} tool {steps.length === 1 ? "call" : "calls"}, {passages.length} passages from {docs} documents.</p>
          </div>
          <button className="icon-btn" type="button" onClick={onClose} aria-label="Close"><i className="ph ph-x" aria-hidden="true" /></button>
        </div>
        <div className="drawer-body">
          <h3 className="caption-3 mute dsec">Steps</h3>
          <ol className="steps-list">
            {steps.map((s, i) => (
              <li key={s.id}>
                <span className="n mono caption-3">{i + 1}</span>
                <div style={{ minWidth: 0 }}>
                  <p className="body-5">{s.label.replace(/\.\.\.$/, "")}</p>
                  <p className="caption-4 mute mono wrapany">{s.name}: {plain(s.args) || "no filters"}</p>
                  {s.state === "repeated" && <p className="caption-4 mute">Same call as before: the earlier result was reused, the database was not queried.</p>}
                  {s.state === "error" && <p className="caption-4 neg">The tool rejected these arguments.</p>}
                </div>
              </li>
            ))}
          </ol>
          {fullTextOnly && (
            <p className="note body-6"><i className="ph-fill ph-warning-circle" aria-hidden="true" />The embedding service did not answer, so document search ran on full text only, without vector similarity.</p>
          )}
          <h3 className="caption-3 mute dsec">Passages used{passages.length ? ", cited first" : ""}</h3>
          {passages.length === 0 && <p className="body-6 mute">No document search: this answer comes from the tables only.</p>}
          <ol className="passes">
            {passages.map((p) => (
              <li key={p.chunk_id} className="pass">
                <div className="pass-top">
                  <div style={{ minWidth: 0 }}>
                    <h4 className="body-5">{p.title}</h4>
                    <p className="caption-4 mute"><span className="mono">{p.document_id}</span>{p.well_id ? `, ${p.well_id}` : ""}, {shortDate(p.date)}{p.section ? `, ${p.section}` : ""}</p>
                  </div>
                  <div className="score" title="Fused relevance: RRF score as a share of the best possible score">
                    <span className="track"><span className="fill" style={{ width: `${Math.round((p.scores.rrf / MAX_RRF) * 100)}%` }} /></span>
                    <span className="mono body-5">{(p.scores.rrf / MAX_RRF).toFixed(2)}</span>
                  </div>
                </div>
                {cited.has(p.chunk_id) && <span className="badge badge-mint caption-3" style={{ alignSelf: "flex-start" }}><i className="ph-bold ph-check" aria-hidden="true" />Cited in the answer</span>}
                <blockquote className="body-6 clamp">{p.text.replace(/\*\*/g, "").replace(/^#+\s*/gm, "")}</blockquote>
                <details className="scores">
                  <summary className="caption-4">Scores<i className="ph ph-caret-down" aria-hidden="true" /></summary>
                  <dl className="kv caption-4">
                    <dt>Vector rank</dt><dd className="mono">{p.scores.vector_rank ?? "not in top 20"}</dd>
                    <dt>Cosine similarity</dt><dd className="mono">{p.scores.vector_similarity ?? "n/a"}</dd>
                    <dt>Full text rank</dt><dd className="mono">{p.scores.full_text_rank ?? "not in top 20"}</dd>
                    <dt>Full text score</dt><dd className="mono">{p.scores.full_text_score ?? "n/a"}</dd>
                    <dt>RRF (k=60)</dt><dd className="mono">{p.scores.rrf}</dd>
                  </dl>
                </details>
                <Link className="textlink button-sm" href={`/data?chunk=${encodeURIComponent(p.chunk_id)}`}>Open in Data<i className="ph ph-arrow-up-right" aria-hidden="true" /></Link>
              </li>
            ))}
          </ol>
        </div>
      </aside>
    </div>
  );
}

"use client";
import { CaretRight } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { RRF_K } from "@/lib/domain";
import { callLabel, chunkIndex, type Final } from "./evidence";
import { found, say, type Step } from "./human";

const REASON: Record<string, string> = {
  daily_cap: "the daily limit on live answers is reached",
  ip_cap: "the limit of live answers for this visitor is reached",
  no_key: "live answers are off on this server",
  api_error: "the live answer failed",
  slow: "the live answer took more than 20 seconds",
  rate_limit: "many questions came in a short time",
};

const n = (x: number) => x.toLocaleString("en-US");
const term = (rank: number | null) => (rank ? 1 / (RRF_K + rank) : 0);

function Stage({ k, title, hint, open, children }: { k: number; title: string; hint: string; open: boolean; children: React.ReactNode }) {
  return (
    <details open={open}>
      <summary><span className="k">{k}</span><span className="t">{title}</span><span className="d">{hint}</span><CaretRight aria-hidden /></summary>
      <div className="body">{children}</div>
    </details>
  );
}

const filters = (args: Record<string, unknown>) =>
  Object.entries(args).filter(([k, v]) => k !== "query" && k !== "k" && v !== undefined).map(([k, v]) => `${k}=${Array.isArray(v) ? v.join(",") : String(v)}`);

export function Built({ question, final, steps, recorded, all }: { question: string; final: Final; steps: Step[]; recorded: string | null; all: boolean }) {
  const { answer, trace, usage: u, checks } = final;
  const chunks = chunkIndex(trace);
  const cited = new Map(answer.sources.filter((s) => s.kind === "chunk").map((s) => [s.id, s.n]));
  const docs = new Set([...chunks.values()].map((c) => c.chunk.document_id)).size;
  const quoted = answer.sources.filter((s) => s.kind === "chunk");
  const others = [...chunks.values()].filter((c) => !cited.has(c.chunk.chunk_id));
  const viz = answer.viz;
  const vizStep = viz.type === "line" || viz.type === "bar" ? steps.find((s) => s.output?.ref === viz.ref && !s.output?.repeated) : undefined;
  const open = (k: number) => all || (trace.length ? k === 3 : k === 2);
  return (
    <section className="built" id="built" aria-labelledby="built-t">
      <h2 id="built-t">How this answer was built</h2>
      <p>Seven stages, filled from this run&apos;s stream and retrieval trace.</p>
      <div className="stages" key={all ? "all" : "one"}>
        <Stage k={1} title="Question" hint={recorded !== null ? "Replayed from a recording" : "Sent to the API"} open={open(1)}>
          <p>&ldquo;{question}&rdquo; goes to <code>POST /api/ask</code>, which streams NDJSON events back to this page.</p>
          <p>{recorded !== null ? `This is a recorded run of the same question, replayed step by step because ${REASON[recorded] ?? "the live answer was not available"}.` : `Live run with ${final.model}.`}</p>
        </Stage>
        <Stage k={2} title="Tool calls chosen by the model" hint={`${steps.length} ${steps.length === 1 ? "call" : "calls"} in ${u.steps} model ${u.steps === 1 ? "step" : "steps"}, at most 4`} open={open(2)}>
          <p>The model can call <code>query_production</code>, <code>list_events</code>, <code>get_wells</code> and <code>search_documents</code>. Each result gets a ref (P1, E1, S1, W1) that the chart and the sources point at.</p>
          {steps.length === 0 ? <p>The model answered without a tool call.</p> : (
            <ol className="calls">
              {steps.map((s, i) => (
                <li key={s.id}>
                  <span className="num">{i + 1}</span>
                  <p>{say(s.name, s.args).replace(/\.\.\.$/, ".")} <span className="faint">{found(s)}</span></p>
                  <pre>{s.name}({JSON.stringify(s.args)}){s.output?.ref ? ` -> ${s.output.repeated ? `reused ${s.output.ref}` : s.output.ref}` : ""}</pre>
                  {s.error && <p className="err">{s.error}</p>}
                </li>
              ))}
            </ol>
          )}
        </Stage>
        <Stage k={3} title="Hybrid search" hint={`Vector plus full text, RRF k=${RRF_K}`} open={open(3)}>
          <p>pgvector cosine search with <code>voyage-4</code> embeddings runs next to Postgres full text search, with the filters applied in SQL on both sides. Reciprocal rank fusion merges both lists: the score is the sum of 1 / ({RRF_K} + rank) over the lists that hold the passage.</p>
          {trace.length === 0 && <p>No document search in this run.</p>}
          {trace.map((t) => {
            const ref = steps.find((s) => s.id === t.call_id)?.output?.ref;
            const sim = new Map(t.vector.map((v) => [v.chunk_id, v.similarity]));
            const f = filters(t.args);
            const top = t.fused[0];
            return (
              <div key={t.call_id}>
                <h4>{ref ? `${ref}: ` : ""}&ldquo;{String(t.args.query ?? "")}&rdquo;</h4>
                <p>{f.length ? <>Filters {f.map((x) => <code key={x}>{x}</code>).reduce<React.ReactNode[]>((a, x, i) => (i ? [...a, " ", x] : [x]), [])}. </> : "No filter. "}Vector search returned {t.vector.length} passages and full text returned {t.full_text.length}. Together they hold {t.fused.length} distinct passages; the top {t.chunks_sent.length} went to the model. Cited passages are marked.</p>
                {t.full_text_only && <p><b>full_text_only:</b> the embedding service did not answer for this query, so the vector side did not run and the ranks come from full text only.</p>}
                {t.fused.length > 0 && (
                  <div className="rk6" role="table" aria-label={`Fused list for ${ref ?? "this search"}`}>
                    <div role="row" style={{ display: "contents" }}>
                      <span className="h" role="columnheader">Fused</span><span className="h" role="columnheader">Passage</span><span className="h r" role="columnheader">Vector</span><span className="h r" role="columnheader">Cosine</span><span className="h r" role="columnheader">Full text</span><span className="h r" role="columnheader">RRF</span>
                    </div>
                    {t.fused.map((x) => {
                      const c = cited.has(x.chunk_id) ? " c" : "";
                      const s = sim.get(x.chunk_id);
                      return (
                        <div key={x.chunk_id} role="row" style={{ display: "contents" }}>
                          <span className={`fid${c}`} role="cell">#{x.rank}</span>
                          <span className={`pid${c}`} role="cell">{c && <span className="num" aria-label={`Source ${cited.get(x.chunk_id)}`}>{cited.get(x.chunk_id)}</span>}{x.chunk_id}</span>
                          <span className={`r${c}`} role="cell">{x.vector_rank ? `#${x.vector_rank}` : "none"}</span>
                          <span className={`r${c}`} role="cell">{s === undefined ? "none" : s.toFixed(4)}</span>
                          <span className={`r${c}`} role="cell">{x.full_text_rank ? `#${x.full_text_rank}` : "none"}</span>
                          <span className={`r${c}`} role="cell">{x.rrf.toFixed(5)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                {top && (
                  <p className="sum">
                    <b>{top.chunk_id}</b> = {[top.vector_rank, top.full_text_rank].filter(Boolean).map((r) => `1 / (${RRF_K} + ${r})`).join(" + ")} = {[top.vector_rank, top.full_text_rank].filter(Boolean).length > 1 ? `${term(top.vector_rank).toFixed(5)} + ${term(top.full_text_rank).toFixed(5)} = ` : ""}<b>{top.rrf.toFixed(5)}</b>
                  </p>
                )}
              </div>
            );
          })}
        </Stage>
        <Stage k={4} title="Passages kept" hint="The model cites what carries the claim" open={open(4)}>
          <p>The model read {chunks.size} {chunks.size === 1 ? "passage" : "passages"} from {docs} {docs === 1 ? "report" : "reports"} and cited {quoted.length} of them, plus {answer.sources.length - quoted.length} table {answer.sources.length - quoted.length === 1 ? "source" : "sources"}. It may cite only what the tool calls above returned.</p>
          {chunks.size > 0 && (
            <ul className="plist">
              {[...chunks.values()].map(({ chunk: c }) => (
                <li key={c.chunk_id}>
                  {cited.has(c.chunk_id) ? <span className="num" aria-label={`Source ${cited.get(c.chunk_id)}`}>{cited.get(c.chunk_id)}</span> : <span className="num" aria-label="Not cited">-</span>}
                  <Link href={`/data?chunk=${encodeURIComponent(c.chunk_id)}`}><span className="mono">{c.chunk_id}</span> {c.title}</Link>
                </li>
              ))}
            </ul>
          )}
          {others.length > 0 && <p>{others.length} {others.length === 1 ? "passage was" : "passages were"} read but not needed.</p>}
        </Stage>
        <Stage k={5} title="Server-built chart" hint="Values come from tool results" open={open(5)}>
          {viz.type === "none" ? <p>No chart for this answer: the model asked for none, or its chart request did not hold.</p>
            : viz.type === "map" ? <p>The model asked for a map titled &ldquo;{viz.title}&rdquo; with {viz.highlighted.length} highlighted {viz.highlighted.length === 1 ? "well" : "wells"} ({viz.highlighted.join(", ")}). The server read the coordinates and status of {viz.wells.length} wells from the database.</p>
            : <p>The model asked for a {viz.type} chart titled &ldquo;{viz.title}&rdquo; and pointed at tool call <code>{viz.ref}</code>{vizStep ? <> (<code>{callLabel(vizStep)}</code>)</> : null}. <code>lib/chart.ts</code> filled {viz.type === "bar" ? `${viz.bars.length} bars` : `${viz.series.reduce((a, s) => a + s.points.length, 0)} points in ${viz.series.length} series`} ({viz.unit}) from the rows that call returned. The model writes no chart value.</p>}
          {checks.viz_error && <p className="neg">Chart request rejected: {checks.viz_error}</p>}
        </Stage>
        <Stage k={6} title="Quote check" hint="Word for word against the report" open={open(6)}>
          <p><code>lib/quote.ts</code> looks for each quote in its passage, after it normalizes whitespace, bold, heading hashes, table pipes and case. The page highlights only quotes that pass. {quoted.length ? `${quoted.filter((q) => q.quote_verified).length} of ${quoted.length} passed.` : "This answer cites no passage."}</p>
          {quoted.length > 0 && (
            <ul className="dash">
              {quoted.map((q) => <li key={q.n}><span className="mono">[{q.n}] {q.id}</span>: {q.quote_verified ? "found" : <span className="neg">not found</span>}. &ldquo;{q.quote}&rdquo;</li>)}
            </ul>
          )}
        </Stage>
        <Stage k={7} title="Final typed answer and usage" hint="Text, chart, sources, confidence" open={open(7)}>
          <p>The server returns one typed object: answer text with [n] markers, chart request, {answer.sources.length} sources, confidence <code>{answer.confidence}</code> and a could-not-verify note{answer.could_not_verify ? "" : " (empty here)"}.</p>
          {(checks.unknown_chunk_ids.length > 0 || checks.refs_without_source.length > 0) && (
            <p className="neg">{checks.unknown_chunk_ids.length > 0 && `Cited passages no search returned: ${checks.unknown_chunk_ids.join(", ")}. `}{checks.refs_without_source.length > 0 && `Markers without a source: ${checks.refs_without_source.join(", ")}.`}</p>
          )}
          <dl className="kv">
            <dt>Model</dt><dd className="mono">{final.model}{final.provider ? `, ${final.provider}` : ""}</dd>
            <dt>Model steps</dt><dd className="mono">{u.steps}</dd>
            <dt>Time</dt><dd className="mono">{(final.latency_ms / 1000).toFixed(1)} s</dd>
            <dt>Tokens in</dt><dd className="mono">{n(u.input_tokens)} + cache read {n(u.cache_read_tokens)} + cache write {n(u.cache_write_tokens)}</dd>
            <dt>Tokens out</dt><dd className="mono">{n(u.output_tokens)}</dd>
            <dt>Cost</dt><dd className="mono">{u.cost_usd === null ? "unknown" : `$${u.cost_usd.toFixed(4)}`}</dd>
          </dl>
        </Stage>
      </div>
    </section>
  );
}

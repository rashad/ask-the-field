import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { sql } from "@/lib/db";
import { EMBEDDING_DIM, EMBEDDING_MODEL } from "@/lib/voyage";
import { shortDate } from "../viz";

const TYPE_LABEL: Record<string, string> = { shift_report: "Shift report", incident_note: "Incident note", work_order: "Work order", well_test: "Well test", procedure: "Procedure" };
const n = (x: number) => x.toLocaleString("en-US");

async function stats() {
  await connection();
  const [[c], types, examples, [proc]] = await Promise.all([
    sql`SELECT
      (SELECT count(*)::int FROM wells) AS wells,
      (SELECT count(DISTINCT field)::int FROM wells) AS fields,
      (SELECT string_agg(DISTINCT field, ', ') FROM wells) AS field_names,
      (SELECT count(*)::int FROM production_daily) AS production_rows,
      (SELECT min(date)::text FROM production_daily) AS prod_from,
      (SELECT max(date)::text FROM production_daily) AS prod_to,
      (SELECT count(*)::int FROM events) AS events,
      (SELECT count(*)::int FROM events WHERE category = 'incident') AS incidents,
      (SELECT count(*)::int FROM events WHERE category = 'maintenance') AS maintenance,
      (SELECT count(*)::int FROM documents) AS documents,
      (SELECT count(*)::int FROM chunks) AS chunks,
      (SELECT round(avg(tokens))::int FROM chunks) AS avg_tokens`,
    sql`SELECT doc_type, count(*)::int AS docs FROM documents GROUP BY 1 ORDER BY 2 DESC`,
    sql`SELECT DISTINCT ON (d.doc_type) d.doc_type, d.doc_id, d.title, d.well_id, d.field, d.date::text,
c.text
        FROM documents d JOIN chunks c ON c.document_id = d.doc_id
          AND c.ordinal = coalesce((SELECT min(ordinal) FROM chunks x WHERE x.document_id = d.doc_id AND x.ordinal > 0 AND x.tokens > 60), 0)
        ORDER BY d.doc_type, d.date DESC`,
    sql`SELECT d.doc_id, d.title, count(c.id)::int AS chunks, sum(c.tokens)::int AS tokens,
          json_agg(json_build_object('ordinal', c.ordinal, 'section', c.section, 'tokens', c.tokens) ORDER BY c.ordinal) AS parts
        FROM documents d JOIN chunks c ON c.document_id = d.doc_id
        WHERE d.doc_type = 'procedure' GROUP BY d.doc_id ORDER BY count(c.id) = count(DISTINCT c.section), abs(count(c.id) - 7), d.doc_id LIMIT 1`,
  ]);
  return { c, types, examples, proc };
}

function excerpt(text: string) {
  const body = text.split("\n").filter((l) => l.trim() && !/^(#|\*\*[^*]+:\*\*|\|)/.test(l.trim())).join(" ").replace(/[*_]/g, "").replace(/\s+/g, " ").trim();
  return body.length > 220 ? `${body.slice(0, 220).replace(/\s\S*$/, "").replace(/[.,;:]$/, "")}...` : body;
}

async function Content() {
  const { c, types, examples, proc } = await stats();
  const months = Math.round((Date.parse(c.prod_to) - Date.parse(c.prod_from)) / (864e5 * 30.44));
  const docsOf = (t: string) => types.find((x) => x.doc_type === t)?.docs ?? 0;
  const groups: { section: string; parts: { ordinal: number; tokens: number }[] }[] = [];
  for (const p of proc.parts as { ordinal: number; section: string | null; tokens: number }[]) {
    const section = p.section ?? "Untitled";
    const last = groups.at(-1);
    if (last?.section === section) last.parts.push(p);
    else groups.push({ section, parts: [p] });
  }
  return (
    <>
      <section className="sec" aria-labelledby="h-data">
        <div className="sec-head"><span className="no caption-3">01</span><h2 id="h-data" className="heading-5">The data</h2></div>
        <p className="body-3" style={{ maxWidth: 680, marginBottom: "var(--sp-200)" }}>A concept prototype on synthetic data. No real company, field or well. Every number on this page is read from the database.</p>
        <div className="facts">
          <div className="fact"><b>{c.fields}</b><span className="caption-4 mute">fields: {c.field_names}</span></div>
          <div className="fact"><b>{c.wells}</b><span className="caption-4 mute">wells</span></div>
          <div className="fact"><b>{n(c.production_rows)}</b><span className="caption-4 mute">daily production rows, {months} months from {shortDate(c.prod_from)}</span></div>
          <div className="fact"><b>{c.events}</b><span className="caption-4 mute">events: {c.incidents} incidents, {c.maintenance} maintenance</span></div>
          <div className="fact"><b>{c.documents}</b><span className="caption-4 mute">field documents, cut into {c.chunks} chunks</span></div>
        </div>
        <div className="docs">
          {examples.map((e, i) => (
            <article key={e.doc_type} className={`ex${e.doc_type === "incident_note" ? " inc" : ""}`} style={i === examples.length - 1 && examples.length % 2 ? { gridColumn: "1 / -1" } : undefined}>
              <div className="ex-top">
                <span className={`badge caption-3 ${e.doc_type === "incident_note" ? "badge-bad" : "badge-mute"}`}>{TYPE_LABEL[e.doc_type] ?? e.doc_type}</span>
                <span className="caption-4 mute">{docsOf(e.doc_type)} documents</span>
              </div>
              <span className="mono caption-4 ex-id">{e.doc_id}, {[e.well_id, e.field, shortDate(e.date)].filter(Boolean).join(", ")}</span>
              <blockquote className="body-6">{excerpt(e.text)}</blockquote>
              <Link className="textlink button-sm" href={`/data?doc=${e.doc_id}`}>Open in Data<i className="ph ph-arrow-up-right" aria-hidden="true" /></Link>
            </article>
          ))}
        </div>
      </section>

      <section className="sec" aria-labelledby="h-flow">
        <div className="sec-head"><span className="no caption-3">02</span><h2 id="h-flow" className="heading-5">How a question becomes an answer</h2></div>
        <div className="card flow">
          <svg viewBox="0 0 1000 270" role="img" aria-label="Five steps: you ask; Claude picks its tools; document search combines Voyage embeddings and Postgres full text, merged by rank; Claude writes the answer; you open the passages it used.">
            <defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path className="tip" d="M0,1 L10,5 L0,9 z" /></marker></defs>
            <rect className="box" x="0" y="55" width="170" height="140" />
            <circle className="num" cx="22" cy="77" r="11" /><text className="numt" x="22" y="81" fontSize="12" textAnchor="middle">1</text>
            <text x="14" y="112" fontSize="16" fontWeight="600">You ask</text>
            <text className="s" x="14" y="138" fontSize="13">Why did W-17</text>
            <text className="s" x="14" y="156" fontSize="13">go down in March?</text>
            <path className="arr" d="M170,125 H206" markerEnd="url(#ah)" />
            <rect className="box" x="210" y="55" width="170" height="140" />
            <circle className="num" cx="232" cy="77" r="11" /><text className="numt" x="232" y="81" fontSize="12" textAnchor="middle">2</text>
            <text x="224" y="112" fontSize="16" fontWeight="600">Claude picks</text>
            <text x="224" y="132" fontSize="16" fontWeight="600">its tools</text>
            <text className="s" x="224" y="158" fontSize="13">Tables for numbers</text>
            <text className="s" x="224" y="176" fontSize="13">Search for reports</text>
            <path className="arr" d="M380,125 H416" markerEnd="url(#ah)" />
            <rect className="box" x="420" y="0" width="230" height="270" />
            <circle className="num" cx="442" cy="22" r="11" /><text className="numt" x="442" y="26" fontSize="12" textAnchor="middle">3</text>
            <text x="458" y="27" fontSize="16" fontWeight="600">Document search</text>
            <rect className="sub" x="434" y="46" width="202" height="62" />
            <text x="446" y="70" fontSize="14" fontWeight="600">Voyage embeddings</text>
            <text className="s" x="446" y="90" fontSize="13">finds the meaning</text>
            <rect className="sub" x="434" y="120" width="202" height="62" />
            <text x="446" y="144" fontSize="14" fontWeight="600">Postgres full text</text>
            <text className="s" x="446" y="164" fontSize="13">finds exact ids and codes</text>
            <path className="arr" d="M535,108 V120" />
            <path className="arr" d="M535,182 V206" markerEnd="url(#ah)" />
            <text x="446" y="232" fontSize="14" fontWeight="600">Merged by rank</text>
            <text className="s" x="446" y="252" fontSize="13">one list of passages</text>
            <path className="arr" d="M650,125 H686" markerEnd="url(#ah)" />
            <rect className="box" x="690" y="55" width="152" height="140" />
            <circle className="num" cx="712" cy="77" r="11" /><text className="numt" x="712" y="81" fontSize="12" textAnchor="middle">4</text>
            <text x="704" y="112" fontSize="16" fontWeight="600">Claude writes</text>
            <text x="704" y="132" fontSize="16" fontWeight="600">the answer</text>
            <text className="s" x="704" y="158" fontSize="13">Visual, sources,</text>
            <text className="s" x="704" y="176" fontSize="13">confidence</text>
            <path className="arr" d="M842,125 H866" markerEnd="url(#ah)" />
            <rect className="box" x="870" y="55" width="130" height="140" />
            <circle className="num" cx="892" cy="77" r="11" /><text className="numt" x="892" y="81" fontSize="12" textAnchor="middle">5</text>
            <text x="884" y="112" fontSize="16" fontWeight="600">You check</text>
            <text className="s" x="884" y="138" fontSize="13">Open the</text>
            <text className="s" x="884" y="156" fontSize="13">passages it</text>
            <text className="s" x="884" y="174" fontSize="13">used</text>
          </svg>
        </div>
      </section>

      <section className="sec" aria-labelledby="h-prep">
        <div className="sec-head"><span className="no caption-3">03</span><h2 id="h-prep" className="heading-5">How documents are prepared</h2></div>
        <div className="two">
          <ul className="rules body-3">
            <li><i className="ph ph-scissors" aria-hidden="true" /><span>Each document is cut along its structure: headings first, then paragraphs, then sentences. A piece is cut again only while it is over about 500 tokens. A cut never falls inside a sentence.</span></li>
            <li><i className="ph ph-file-text" aria-hidden="true" /><span>A short report stays one chunk. A procedure splits by section. The {c.documents} documents give {c.chunks} chunks of {c.avg_tokens} tokens on average.</span></li>
            <li><i className="ph ph-database" aria-hidden="true" /><span>Each chunk gets a vector of {n(EMBEDDING_DIM)} numbers from <span className="mono">{EMBEDDING_MODEL}</span>. It is stored in Postgres with pgvector, next to its metadata: well, field, date, type and section.</span></li>
          </ul>
          <div className="card sop">
            <div className="sop-head">
              <div><span className="title-4" style={{ display: "block" }}>{proc.title}</span><span className="mono caption-4 mute">{proc.doc_id}, procedure, {n(proc.tokens)} tokens</span></div>
              <span className="badge badge-mute caption-3">{proc.chunks} chunks</span>
            </div>
            <div className="cut">
              {groups.map((g) => g.parts.length === 1 ? (
                <div key={g.section} className="chunk"><span className="sec-t"><span className="body-5">{g.section}</span></span><span className="tok mono caption-4">chunk {g.parts[0].ordinal + 1}, {g.parts[0].tokens} tokens</span></div>
              ) : (
                <div key={g.section} className="cut">
                  <div className="chunk"><span className="sec-t"><span className="body-5">{g.section}</span><span className="caption-4 mute">{g.parts.reduce((s, p) => s + p.tokens, 0)} tokens{g.parts.reduce((s, p) => s + p.tokens, 0) > 500 ? ", over 500" : ""}: cut at paragraph breaks</span></span><span className="tok mono caption-4">{g.parts.length} chunks</span></div>
                  {g.parts.map((p) => <div key={p.ordinal} className="chunk sub"><span className="body-6">Part {p.ordinal - g.parts[0].ordinal + 1}</span><span className="tok mono caption-4">chunk {p.ordinal + 1}, {p.tokens} tokens</span></div>)}
                </div>
              ))}
            </div>
            <div className="store caption-4"><span className="vecpill mono">vector({EMBEDDING_DIM})</span><span className="mono">well</span><span className="mono">field</span><span className="mono">date</span><span className="mono">type</span><span className="mono">section</span></div>
            <Link className="textlink button-sm" style={{ marginTop: "var(--sp-200)" }} href={`/data?doc=${proc.doc_id}`}>See the chunks in Data<i className="ph ph-arrow-up-right" aria-hidden="true" /></Link>
          </div>
        </div>
      </section>
    </>
  );
}

export default function About() {
  return (
    <>
      <div style={{ maxWidth: 680 }}>
        <h1 className="heading-3">About this prototype</h1>
        <p className="title-2 mute" style={{ marginTop: "var(--sp-100)", fontWeight: 400 }}>Ask a question about oil and gas wells. Get the answer, the proof, and a clear note on what could not be checked.</p>
        <Link className="btn btn-primary button-md" href="/" style={{ marginTop: "var(--sp-200)" }}><i className="ph-bold ph-arrow-up" aria-hidden="true" />Ask a question</Link>
      </div>
      <Suspense fallback={<div className="skel" aria-label="Loading the numbers"><div style={{ height: 120 }} /><div style={{ height: 240 }} /></div>}>
        <Content />
      </Suspense>
      <section className="sec" aria-labelledby="h-screens">
        <div className="sec-head"><span className="no caption-3">04</span><h2 id="h-screens" className="heading-5">What each screen shows</h2></div>
        <div className="idx" style={{ marginTop: 0 }}>
          {[
            ["/", "ph-chat-circle-text", "Ask", "Type a question. Get the answer with a map or a chart."],
            ["/?q=Why%20did%20W-17%20go%20down%20in%20March%3F&how=1", "ph-list-magnifying-glass", "How this answer was built", "The steps the model took and the passages behind the answer, with their scores."],
            ["/data", "ph-database", "Data", "Every document and table, and the chunks cut from them."],
          ].map(([href, icon, title, text]) => (
            <Link key={title} href={href}>
              <span className="ic"><i className={`ph ${icon}`} aria-hidden="true" /></span>
              <span style={{ flex: 1, minWidth: 0 }}><span className="title-3" style={{ display: "block" }}>{title}</span><span className="body-6 mute">{text}</span></span>
              <i className="ph ph-arrow-right" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>
      <section className="sec" aria-labelledby="h-not">
        <div className="sec-head"><span className="no caption-3">05</span><h2 id="h-not" className="heading-5">What this prototype is not</h2></div>
        <ul className="not body-3">
          {["No real data", "No login", "No memory between questions"].map((t) => <li key={t}><i className="ph ph-x" aria-hidden="true" />{t}</li>)}
        </ul>
      </section>
    </>
  );
}

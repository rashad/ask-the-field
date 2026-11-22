import { ArrowUp, ArrowUpRight, ChatCircleText, Database, FileText, LinkSimple, Scissors, SealCheck, ShieldCheck, X } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import { Credit, SourceLink } from "../credit";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { sql } from "@/lib/db";
import { MODEL } from "@/lib/answer";
import { EMBEDDING_DIM, EMBEDDING_MODEL } from "@/lib/voyage";
import { PRICE_NOTE } from "@/lib/money";
import { SUGGESTED } from "@/lib/questions";

export const metadata: Metadata = { title: "About", description: "What Ask the Field does, why every answer shows its sources, and how it is built." };
import { docTypeLabel, shortDate } from "@/lib/domain";

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
      <section className="sec" aria-labelledby="h-problem">
        <div className="sec-head"><span className="no caption-3">01</span><h2 id="h-problem" className="heading-5">The problem it solves</h2></div>
        <div className="prose body-3">
          <p>An oil field writes a lot down. Every shift ends with a report. Every incident gets a note. Every repair gets a work order. Next to that, sensors log how much oil, gas and water each well produces, every day.</p>
          <p>When a manager asks &ldquo;why did this well stop in March?&rdquo;, someone has to dig through folders and spreadsheets to find out. That takes hours, and the answer often depends on who remembers what. A problem that repeats across wells, months apart, is often never connected at all.</p>
          <p>Ask the Field does that digging in seconds. You ask in plain English. It finds the few reports and numbers that matter, writes a short answer, and puts the proof next to it.</p>
        </div>
      </section>

      <section className="sec" aria-labelledby="h-data">
        <div className="sec-head"><span className="no caption-3">02</span><h2 id="h-data" className="heading-5">What you are looking at</h2></div>
        <p className="body-3" style={{ maxWidth: 680, marginBottom: "var(--sp-200)" }}>A fictional oil company in the desert, made up for this demo: three fields named Dune Field, Wadi Field and Salt Flat Field, and the morning of 22 November 2026. No real company, field or well. Every number below is read live from the database.</p>
        <div className="facts">
          <div className="fact"><b>{c.fields}</b><span className="caption-4 mute">oil fields: {c.field_names}</span></div>
          <div className="fact"><b>{c.wells}</b><span className="caption-4 mute">wells</span></div>
          <div className="fact"><b>{c.documents}</b><span className="caption-4 mute">field reports and notes</span></div>
          <div className="fact"><b>{months}</b><span className="caption-4 mute">months of daily production, {n(c.production_rows)} rows</span></div>
          <div className="fact"><b>{c.events}</b><span className="caption-4 mute">events: {c.incidents} incidents, {c.maintenance} repairs and checks</span></div>
        </div>
        <p className="body-3" style={{ maxWidth: 680, marginTop: "var(--sp-200)" }}>Five stories run through the tables and the reports: the incidents open this morning, a pump failure on W-17 in March, a repeat failure nobody connected, water rising in Wadi Field, and a sand alarm in Salt Flat Field. The morning briefing on the Ask page asks about each one.</p>
        <p className="body-3" style={{ maxWidth: 680, marginTop: "var(--sp-100)" }}>Lost oil is the normal rate of the well before an event, times the hours it was offline. Money is {PRICE_NOTE.charAt(0).toLowerCase() + PRICE_NOTE.slice(1)} It is not a real price or a real cost.</p>
        <p className="body-5" style={{ marginTop: "var(--sp-300)" }}>The kinds of reports it reads</p>
        <div className="docs">
          {examples.map((e, i) => (
            <article key={e.doc_type} className={`ex${e.doc_type === "incident_note" ? " inc" : ""}`} style={i === examples.length - 1 && examples.length % 2 ? { gridColumn: "1 / -1" } : undefined}>
              <div className="ex-top">
                <span className={`badge caption-3 ${e.doc_type === "incident_note" ? "badge-bad" : "badge-mute"}`}>{docTypeLabel(e.doc_type)}</span>
                <span className="caption-4 mute">{docsOf(e.doc_type)} documents</span>
              </div>
              <span className="mono caption-4 ex-id">{e.doc_id}, {[e.well_id, e.field, shortDate(e.date)].filter(Boolean).join(", ")}</span>
              <blockquote className="body-6">{excerpt(e.text)}</blockquote>
              <Link className="textlink button-sm" href={`/data?doc=${e.doc_id}`}>Read it<ArrowUpRight aria-hidden /></Link>
            </article>
          ))}
        </div>
      </section>

      <section className="sec" aria-labelledby="h-trust">
        <div className="sec-head"><span className="no caption-3">03</span><h2 id="h-trust" className="heading-5">Why the sources matter</h2></div>
        <p className="body-3" style={{ maxWidth: 680 }}>An AI that answers without proof is a guess you cannot check. In operations, a wrong guess costs money or puts people at risk. So every answer here comes with three things.</p>
        <ul className="why3">
          <li><LinkSimple aria-hidden /><span><b className="body-4">Numbered sources</b><span className="body-6 mute">Each fact carries a small number. Click it and you read the exact passage of the report it came from, highlighted.</span></span></li>
          <li><SealCheck aria-hidden /><span><b className="body-4">A confidence level</b><span className="body-6 mute">High when the reports and the data tables agree. Lower when only one of them says it, or when they disagree.</span></span></li>
          <li><ShieldCheck aria-hidden /><span><b className="body-4">What it could not check</b><span className="body-6 mute">When the data cannot confirm something, the answer says so in one line, instead of filling the gap.</span></span></li>
        </ul>
        <p className="body-3" style={{ maxWidth: 680, marginTop: "var(--sp-200)" }}>The AI may only cite what it found during this answer. A test suite asks the same questions again after every change and checks the answers against the data.</p>
      </section>

      <section className="sec eng-sec" aria-labelledby="h-eng">
        <div className="sec-head"><span className="no caption-3">04</span><h2 id="h-eng" className="heading-5">For engineers</h2></div>
        <p className="body-3" style={{ maxWidth: 680, marginBottom: "var(--sp-200)" }}>Retrieval-augmented generation with tool use. The model does not hold the data: it calls typed tools against Postgres and cites what they return.</p>
        <ul className="stack body-6">
          <li><b className="body-4">Model</b><span><span className="mono">{MODEL}</span> through the Vercel AI SDK, with four typed tools (Zod): <span className="mono">query_production</span>, <span className="mono">list_events</span>, <span className="mono">search_documents</span>, <span className="mono">get_wells</span>. Structured output for the answer, the chart, the sources and the confidence. At most 4 steps, repeated calls are short-circuited.</span></li>
          <li><b className="body-4">Embeddings</b><span><span className="mono">{EMBEDDING_MODEL}</span>, {n(EMBEDDING_DIM)} dimensions, stored in Postgres with pgvector next to the chunk metadata (well, field, date, type, section).</span></li>
          <li><b className="body-4">Hybrid search</b><span>Top 20 by cosine similarity plus top 20 by Postgres full text, fused with reciprocal rank fusion (k=60). Filters on well, field, type and dates run in SQL before ranking. Full text catches exact ids such as <span className="mono">EV-0090</span> that vectors miss.</span></li>
          <li><b className="body-4">Chunking</b><span>Structure-aware: headings, then paragraphs, then sentences, about 500 tokens, no overlap. {c.documents} documents give {c.chunks} chunks of {c.avg_tokens} tokens on average.</span></li>
          <li><b className="body-4">Grounding checks</b><span>Every cited chunk id must come from a search in the same run, and every [n] marker must match a source. Each cited passage carries a quote that the server checks word for word against the chunk; only a checked quote is highlighted. Charts name a tool call and the server fills them from its rows. The eval script asks the suggested questions and checks charts, wells, cited notes and answer length.</span></li>
          <li><b className="body-4">Reliability</b><span>The suggested questions have recorded runs. If the live call fails or takes more than 20 seconds, the recorded run plays instead and is labelled as such.</span></li>
        </ul>
        <p className="body-6" style={{ marginTop: "var(--sp-150)" }}><SourceLink className="textlink srclink" /></p>
        <h3 className="body-4" style={{ margin: "var(--sp-300) 0 var(--sp-100)" }}>How a question becomes an answer</h3>
        <div className="card flow">
          <svg viewBox="0 0 1000 270" role="img" aria-label="Five steps: you ask; Claude picks its tools; document search combines Voyage embeddings and Postgres full text, merged by rank; Claude writes the answer; you open the passages it used.">
            <defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path className="tip" d="M0,1 L10,5 L0,9 z" /></marker></defs>
            <rect className="box" x="0" y="55" width="170" height="140" />
            <circle className="num" cx="22" cy="77" r="11" /><text className="numt" x="22" y="81" fontSize="12" textAnchor="middle">1</text>
            <text x="14" y="112" fontSize="16" fontWeight="600">You ask</text>
            <text className="s" x="14" y="138" fontSize="13">Why was W-17</text>
            <text className="s" x="14" y="156" fontSize="13">down in March?</text>
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
        <h3 className="body-4" style={{ margin: "var(--sp-300) 0 var(--sp-100)" }}>How a document is cut into chunks</h3>
        <div className="two">
          <ul className="rules body-3">
            <li><Scissors aria-hidden /><span>Each document is cut along its structure: headings first, then paragraphs, then sentences. A piece is cut again only while it is over about 500 tokens. A cut never falls inside a sentence.</span></li>
            <li><FileText aria-hidden /><span>A short report stays one chunk. A procedure splits by section. The {c.documents} documents give {c.chunks} chunks of {c.avg_tokens} tokens on average.</span></li>
            <li><Database aria-hidden /><span>Each chunk gets a vector of {n(EMBEDDING_DIM)} numbers from <span className="mono">{EMBEDDING_MODEL}</span>. It is stored in Postgres with pgvector, next to its metadata: well, field, date, type and section.</span></li>
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
            <Link className="textlink button-sm" style={{ marginTop: "var(--sp-200)" }} href={`/data?doc=${proc.doc_id}`}>See the chunks in Data<ArrowUpRight aria-hidden /></Link>
          </div>
        </div>
      </section>
    </>
  );
}

export default function About() {
  return (
    <div className="page about">
      <div className="about-head">
        <p className="caption-3 eyebrow">About</p>
        <h1 className="heading-3">Ask the Field</h1>
        <p className="title-2 mute" style={{ marginTop: "var(--sp-100)", fontWeight: 400 }}>Ask an oil field a question in plain English. Get a short answer, the proof behind it, and a clear note on what could not be checked.</p>
        <div className="about-cta">
          <Link className="btn btn-primary button-md" href="/"><ArrowUp weight="bold" aria-hidden />Ask a question</Link>
          <Link className="btn btn-ghost button-md" href={`/?q=${encodeURIComponent(SUGGESTED[1])}`}><ChatCircleText aria-hidden />See an example</Link>
        </div>
      </div>
      <Suspense fallback={<div className="skel" aria-label="Loading the numbers"><div style={{ height: 120 }} /><div style={{ height: 240 }} /></div>}>
        <Content />
      </Suspense>
      <section className="sec" aria-labelledby="h-not">
        <div className="sec-head"><span className="no caption-3">05</span><h2 id="h-not" className="heading-5">What this prototype is not</h2></div>
        <ul className="not body-3">
          {["No real data: the field, the wells and the reports are invented", "No login and no memory between questions", "Not connected to any live system"].map((t) => <li key={t}><X aria-hidden />{t}</li>)}
        </ul>
        <p className="credit-p" style={{ marginTop: "var(--sp-300)" }}><Credit /></p>
      </section>
    </div>
  );
}

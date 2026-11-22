"use client";
import { CaretDown, CaretUpDown, Check, CursorClick, FileText, Table, WarningCircle } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Md } from "../md";
import { shortDate } from "../fmt";

interface Doc { doc_id: string; doc_type: string; well_id: string | null; field: string | null; date: string; title: string; chunks: number }
interface Chunk { id: string; ordinal: number; section: string | null; text: string; tokens: number; well_id: string | null; field: string | null; date: string | null; doc_type: string; embedding_model: string; vector_head: number[]; dims: number }
type Row = Record<string, string | number | null>;

const TYPES = [["shift_report", "Shift reports"], ["incident_note", "Incident notes"], ["work_order", "Work orders"], ["well_test", "Well tests"], ["procedure", "Procedures"]] as const;
const WELLS = Array.from({ length: 41 }, (_, i) => `W-${String(i + 1).padStart(2, "0")}`);
const typeName = (t: string) => t.replace("_", " ").replace(/^./, (c) => c.toUpperCase());

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? `Error ${res.status}`);
  return body;
}

export function DataView() {
  const params = useSearchParams();
  const tab = params.get("tab") === "tables" ? "tables" : "documents";
  return (
    <>
      <div className="page-head">
        <div><h1 className="heading-4">Data</h1><p className="body-6 mute">The raw documents and tables behind every answer.</p></div>
        <nav className="seg" aria-label="Data views">
          <Link className="button-sm" href="/data" aria-current={tab === "documents" ? "page" : undefined}><FileText aria-hidden />Documents</Link>
          <Link className="button-sm" href="/data?tab=tables" aria-current={tab === "tables" ? "page" : undefined}><Table aria-hidden />Tables</Link>
        </nav>
      </div>
      {tab === "documents" ? <Documents /> : <Tables />}
    </>
  );
}

function Documents() {
  const params = useSearchParams();
  const router = useRouter();
  const chunkParam = params.get("chunk");
  const selected = params.get("doc") ?? chunkParam?.split("#")[0] ?? null;
  const [type, setType] = useState("");
  const [well, setWell] = useState("");
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [detail, setDetail] = useState<{ document: Doc; chunks: Chunk[] } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const qs = new URLSearchParams({ ...(type && { type }), ...(well && { well }) });
    getJson<{ documents: Doc[] }>(`/api/data/documents?${qs}`).then((r) => setDocs(r.documents), (e) => setError(e.message));
  }, [type, well]);

  useEffect(() => {
    if (!selected) return setDetail(null);
    getJson<{ document: Doc; chunks: Chunk[] }>(`/api/data/documents/${encodeURIComponent(selected)}`).then(setDetail, (e) => setError(e.message));
  }, [selected]);

  useEffect(() => {
    if (!chunkParam || !detail) return;
    document.getElementById(detail.chunks.length === 1 ? "docview" : `chunk-${chunkParam}`)?.scrollIntoView({ block: "start" });
  }, [chunkParam, detail]);

  useEffect(() => {
    const el = document.querySelector<HTMLElement>(`[data-doc="${selected}"]`);
    if (el?.parentElement) el.parentElement.scrollTop = el.offsetTop - el.parentElement.offsetTop - 8;
  }, [docs, selected]);

  const open = (id: string) => router.push(`/data?doc=${encodeURIComponent(id)}`, { scroll: false });

  return (
    <>
      <div className="filters">
        <label className="sel"><span className="sr">Document type</span>
          <select className="body-6" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All types</option>
            {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select><CaretDown aria-hidden />
        </label>
        <label className="sel"><span className="sr">Well</span>
          <select className="body-6" value={well} onChange={(e) => setWell(e.target.value)}>
            <option value="">All wells</option>
            {WELLS.map((w) => <option key={w}>{w}</option>)}
          </select><CaretDown aria-hidden />
        </label>
        <span className="caption-4 mute" style={{ alignSelf: "center" }}>{docs ? `${docs.length} documents` : "Loading..."}</span>
      </div>
      {error && <p className="qerr body-6" role="alert"><WarningCircle aria-hidden />{error}</p>}
      <div className="docgrid">
        <div className="doclist">
          {docs?.length === 0 && <div className="empty body-6">No document matches these filters.</div>}
          {docs?.map((d) => (
            <button key={d.doc_id} data-doc={d.doc_id} type="button" className="doc" aria-current={d.doc_id === selected ? "true" : undefined} onClick={() => open(d.doc_id)}>
              <span className="body-5" style={{ display: "block" }}>{d.title}</span>
              <span className="row caption-4 mute"><span>{shortDate(d.date)}, {d.chunks} {d.chunks === 1 ? "chunk" : "chunks"}</span><span className="mono">{d.doc_id}</span></span>
            </button>
          ))}
        </div>
        {detail ? (
          <article id="docview" className="card docview">
            <div className="docview-head">
              <div>
                <h2 className="heading-6">{detail.document.title}</h2>
                <div className="meta caption-4">
                  <span>{typeName(detail.document.doc_type)}</span><span>{shortDate(detail.document.date)}</span>
                  <span className="mono">{detail.document.doc_id}</span>
                  {detail.document.well_id && <span className="mono">{detail.document.well_id}</span>}
                  {detail.document.field && <span>{detail.document.field}</span>}
                  <span>{detail.chunks.length} {detail.chunks.length === 1 ? "chunk" : "chunks"}, {detail.chunks.reduce((n, c) => n + c.tokens, 0)} tokens</span>
                </div>
              </div>
            </div>
            <div className="chunks">
              {detail.chunks.map((c) => (
                <section key={c.id} id={`chunk-${c.id}`} className={`chunk${c.id === chunkParam ? " cited" : ""}`}>
                  <div className="chunk-top">
                    <span className="caption-4 mute">Chunk {c.ordinal + 1} of {detail.chunks.length}{c.section ? `, ${c.section}` : ""}</span>
                    <span className="caption-4 mute mono">{c.tokens} tokens</span>
                  </div>
                  {c.id === chunkParam && <span className="badge badge-mint caption-3" style={{ marginBottom: "var(--sp-75)" }}><Check weight="bold" aria-hidden />Opened from an answer</span>}
                  <Md text={c.text} />
                  <details open={c.id === chunkParam}>
                    <summary className="caption-4"><CaretDown aria-hidden />Metadata and vector</summary>
                    <dl className="kv body-6">
                      <dt>Chunk id</dt><dd className="mono">{c.id}</dd>
                      <dt>Section</dt><dd>{c.section ?? "none"}</dd>
                      <dt>Tokens</dt><dd className="mono">{c.tokens}</dd>
                      <dt>Well, field</dt><dd className="mono">{c.well_id ?? "none"}, {c.field ?? "none"}</dd>
                      <dt>Date, type</dt><dd className="mono">{c.date ?? "none"}, {c.doc_type}</dd>
                      <dt>Model</dt><dd className="mono">{c.embedding_model}</dd>
                      <dt>First 8 of {c.dims.toLocaleString("en-US")}</dt>
                      <dd><span className="vec mono caption-4">{c.vector_head.map((v, i) => <span key={i}>{v.toFixed(4)}</span>)}</span></dd>
                    </dl>
                  </details>
                </section>
              ))}
            </div>
          </article>
        ) : (
          <div className="empty body-6"><CursorClick aria-hidden />Select a document to see its chunks.</div>
        )}
      </div>
    </>
  );
}

type Col = [key: string, label: string, numeric?: boolean];
const COLS: Record<string, Col[]> = {
  production: [["month", "Month"], ["well_id", "Well"], ["field", "Field"], ["oil_bbl_d", "Oil bbl/d", true], ["gas_mscf_d", "Gas mscf/d", true], ["water_cut", "Water cut", true], ["uptime_h", "Uptime h/d", true], ["days", "Days", true]],
  events: [["event_id", "Event"], ["well_id", "Well"], ["field", "Field"], ["category", "Category"], ["type", "Type"], ["start_date", "Start"], ["end_date", "End"], ["status", "Status"], ["severity", "Severity"], ["downtime_hours", "Downtime h", true], ["description", "Description"]],
  wells: [["well_id", "Well"], ["field", "Field"], ["status", "Status"], ["well_type", "Type"], ["lift_type", "Lift"], ["spud_date", "Spud date"], ["lat", "Lat", true], ["lon", "Lon", true], ["open_events", "Open events", true]],
};
const NOTE: Record<string, string> = {
  production: "Monthly averages per well, from the daily production table.",
  events: "Every maintenance and incident event.",
  wells: "Every well with its current status.",
};

function Tables() {
  const params = useSearchParams();
  const router = useRouter();
  const table = params.get("table") && COLS[params.get("table")!] ? params.get("table")! : "production";
  const [q, setQ] = useState(params.get("q") ?? "");
  const [field, setField] = useState("");
  const [months, setMonths] = useState(6);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [sort, setSort] = useState<[string, 1 | -1] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setRows(null);
    setSort(null);
    getJson<{ rows: Row[] }>(`/api/data/tables/${table}${table === "production" ? `?months=${months}` : ""}`).then((r) => setRows(r.rows), (e) => setError(e.message));
  }, [table, months]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = (rows ?? []).filter((r) => (!field || r.field === field) && (!needle || Object.values(r).some((v) => String(v ?? "").toLowerCase().includes(needle))));
    if (!sort) return out;
    const [key, dir] = sort;
    return [...out].sort((a, b) => (a[key] === b[key] ? 0 : a[key] === null ? 1 : b[key] === null ? -1 : (a[key]! < b[key]! ? -1 : 1) * dir));
  }, [rows, q, field, sort]);

  const pick = (t: string) => {
    setQ("");
    router.push(`/data?tab=tables&table=${t}`, { scroll: false });
  };

  return (
    <>
      <div className="tbar">
        <div className="seg" role="group" aria-label="Table">
          {Object.keys(COLS).map((t) => <button key={t} type="button" className="button-sm" aria-pressed={t === table} onClick={() => pick(t)}>{t[0].toUpperCase() + t.slice(1)}</button>)}
        </div>
        <div className="filters" style={{ margin: 0 }}>
          <input className="tfilter body-6" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter rows" aria-label="Filter rows" />
          <label className="sel"><span className="sr">Field</span>
            <select className="body-6" value={field} onChange={(e) => setField(e.target.value)}>
              <option value="">All fields</option>
              {["Field A", "Field B", "Bayda"].map((f) => <option key={f}>{f}</option>)}
            </select><CaretDown aria-hidden />
          </label>
          {table === "production" && (
            <label className="sel"><span className="sr">Window</span>
              <select className="body-6" value={months} onChange={(e) => setMonths(Number(e.target.value))}>
                {[6, 12, 18].map((m) => <option key={m} value={m}>Last {m} months</option>)}
              </select><CaretDown aria-hidden />
            </label>
          )}
        </div>
      </div>
      {error && <p className="qerr body-6" role="alert"><WarningCircle aria-hidden />{error}</p>}
      <div className="card tbl-card">
        <div className="tscroll">
          <table className="data">
            <thead>
              <tr>
                {COLS[table].map(([key, label, num]) => (
                  <th key={key} scope="col" className={num ? "r" : undefined} aria-sort={sort?.[0] === key ? (sort[1] === 1 ? "ascending" : "descending") : "none"}>
                    <button type="button" className="caption-3" onClick={() => setSort(sort?.[0] === key ? [key, sort[1] === 1 ? -1 : 1] : [key, num ? -1 : 1])}>
                      {label}<CaretUpDown aria-hidden />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="body-6">
              {shown.map((r, i) => (
                <tr key={i}>
                  {COLS[table].map(([key, , num]) => (
                    <td key={key} className={`${num ? "r mono" : ""}${key === "description" ? " wrapok" : ""}${key === "status" && r[key] === "open" && r.category === "incident" ? " neg" : ""}`}>{r[key] ?? ""}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="tfoot caption-4">{rows ? `${shown.length} of ${rows.length} rows. ${NOTE[table]} Select a column title to sort.` : "Loading..."}</p>
      </div>
    </>
  );
}

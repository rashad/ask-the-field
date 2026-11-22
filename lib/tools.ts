import { tool } from "ai";
import { z } from "zod";
import { sql } from "./db";
import { PRICE_PER_BBL } from "./money";
import { hybridSearch } from "./search";
import type { ToolRun } from "./chart";
import { lostOil } from "./stakes";

export const FIELDS = ["Dune Field", "Wadi Field", "Salt Flat Field"] as const;
export const DOC_TYPES = ["shift_report", "incident_note", "work_order", "well_test", "procedure"] as const;
export const DATA_START = "2025-05-23";
export const TODAY = "2026-11-22";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD").refine((d) => !Number.isNaN(Date.parse(d)), "invalid date");
const wellIds = z.array(z.string().regex(/^W-\d{2}$/, "well ids look like W-17")).min(1).max(41);
const field = z.enum(FIELDS);

export interface SearchTrace {
  call_id: string;
  args: Record<string, unknown>;
  vector: { chunk_id: string; rank: number; similarity: number }[];
  full_text: { chunk_id: string; rank: number; ts_rank: number }[];
  fused: { chunk_id: string; rank: number; rrf: number; vector_rank: number | null; full_text_rank: number | null }[];
  chunks_sent: SearchChunk[];
  full_text_only: boolean;
}

export interface SearchChunk {
  chunk_id: string;
  document_id: string;
  title: string;
  doc_type: string;
  well_id: string | null;
  field: string | null;
  date: string;
  section: string | null;
  text: string;
  scores: { vector_similarity: number | null; vector_rank: number | null; full_text_rank: number | null; full_text_score: number | null; rrf: number };
}

const CANDIDATES = 20;
const MAX_POINTS = 120;
const COARSER = { day: "week", week: "month", month: "quarter", quarter: "quarter" } as const;
const round = (n: number, d = 4) => Number(Number(n).toFixed(d));

const productionInput = z
  .object({
    well_ids: wellIds.optional(),
    field: field.optional(),
    metric: z.enum(["oil", "gas", "water_cut"]),
    from: isoDate,
    to: isoDate,
    group_by: z.enum(["day", "week", "month", "quarter", "well"]),
    compare_from: isoDate.optional().describe("With group_by=well: start of a baseline period to compare against"),
    compare_to: isoDate.optional().describe("With group_by=well: end of the baseline period"),
  })
  .refine((a) => a.from <= a.to, "from must be on or before to")
  .refine((a) => !a.compare_from === !a.compare_to, "set both compare_from and compare_to, or neither")
  .refine((a) => !a.compare_from || a.group_by === "well", "compare_from/compare_to need group_by=well");

const column = { oil: sql`oil_bbl`, gas: sql`gas_mscf`, water_cut: sql`water_cut` };
const unit = { oil: "bbl/d", gas: "mscf/d", water_cut: "fraction" };

async function queryProduction(a: z.infer<typeof productionInput>) {
  const scope = sql`
    ${a.metric === "water_cut" ? sql`AND p.uptime_hours > 0` : sql``}
    ${a.well_ids ? sql`AND p.well_id = ANY(${a.well_ids})` : sql``}
    ${a.field ? sql`AND w.field = ${a.field}` : sql``}`;
  const col = column[a.metric];
  if (a.group_by === "well") {
    const rows = await sql<{ well_id: string; field: string; value: number; baseline: number | null }[]>`
      WITH cur AS (
        SELECT p.well_id, w.field, avg(p.${col}) AS value FROM production_daily p JOIN wells w USING (well_id)
        WHERE p.date BETWEEN ${a.from} AND ${a.to} ${scope} GROUP BY 1, 2
      ), base AS (
        SELECT p.well_id, avg(p.${col}) AS value FROM production_daily p JOIN wells w USING (well_id)
        WHERE p.date BETWEEN ${a.compare_from ?? a.from} AND ${a.compare_to ?? a.to} ${scope} GROUP BY 1
      )
      SELECT cur.well_id, cur.field, cur.value, ${a.compare_from ? sql`base.value` : sql`NULL::float8`} AS baseline
      FROM cur LEFT JOIN base USING (well_id)`;
    const out = rows.map((r) => ({
      well_id: r.well_id,
      field: r.field,
      value: round(r.value, a.metric === "water_cut" ? 3 : 0),
      ...(r.baseline != null && {
        baseline: round(r.baseline, a.metric === "water_cut" ? 3 : 0),
        change: round(r.value - r.baseline, a.metric === "water_cut" ? 3 : 0),
        change_pct: r.baseline ? round(((r.value - r.baseline) / r.baseline) * 100, 1) : null,
      }),
    }));
    out.sort((x, y) => (a.compare_from ? (x.change_pct ?? 0) - (y.change_pct ?? 0) : y.value - x.value));
    return { metric: a.metric, aggregation: "average daily value per well", unit: unit[a.metric], period: [a.from, a.to], baseline_period: a.compare_from ? [a.compare_from, a.compare_to] : null, rows: out };
  }
  const perWell = (a.well_ids?.length ?? 0) > 0 && (a.well_ids?.length ?? 0) <= 6;
  const days = (Date.parse(a.to) - Date.parse(a.from)) / 864e5 + 1;
  const size = { day: 1, week: 7, month: 30, quarter: 91 };
  let bucket: keyof typeof COARSER = a.group_by;
  while (bucket !== "quarter" && (days / size[bucket]) * (perWell ? a.well_ids!.length : 1) > MAX_POINTS) bucket = COARSER[bucket];
  const daily = a.metric === "water_cut" ? sql`avg(p.${col})` : sql`sum(p.${col})`;
  const rows = await sql<{ series: string; bucket: string; value: number }[]>`
    WITH d AS (
      SELECT ${perWell ? sql`p.well_id` : sql`'all'`} AS series, p.date, ${daily} AS v
      FROM production_daily p JOIN wells w USING (well_id)
      WHERE p.date BETWEEN ${a.from} AND ${a.to} ${scope} GROUP BY 1, 2
    )
    SELECT series, date_trunc(${bucket}, date)::date::text AS bucket, avg(v) AS value FROM d GROUP BY 1, 2 ORDER BY 1, 2`;
  const name = perWell ? null : a.field ?? (a.well_ids ? `${a.well_ids.length} wells` : "All fields");
  const series = new Map<string, { x: string; y: number }[]>();
  for (const r of rows) {
    const key = name ?? r.series;
    series.set(key, [...(series.get(key) ?? []), { x: r.bucket, y: round(r.value, a.metric === "water_cut" ? 3 : 0) }]);
  }
  return {
    metric: a.metric,
    unit: unit[a.metric],
    aggregation: a.metric === "water_cut" ? "average water cut across wells" : "average daily total rate across wells",
    bucket,
    ...(bucket !== a.group_by && { note: `Grouped by ${bucket} instead of ${a.group_by} to keep the result short.` }),
    series: [...series].map(([name, points]) => ({ name, points })),
  };
}

const eventsInput = z
  .object({
    well_ids: wellIds.optional(),
    field: field.optional(),
    type: z.string().min(2).max(60).optional().describe("'incident', 'maintenance', or an event type such as 'ESP trip'"),
    status: z.enum(["open", "closed"]).optional(),
    from: isoDate.optional(),
    to: isoDate.optional(),
  })
  .refine((a) => !a.from || !a.to || a.from <= a.to, "from must be on or before to")
  .refine((a) => Object.values(a).some((v) => v !== undefined), "set at least one filter");

async function listEvents(a: z.infer<typeof eventsInput>) {
  const category = a.type === "incident" || a.type === "maintenance" ? a.type : null;
  const rows = await sql`
    SELECT e.event_id, e.well_id, w.field, e.category, e.type, e.start_date::text, e.end_date::text, e.downtime_hours, ${lostOil()} AS lost_oil_bbl, e.status, e.severity, e.description,
      (SELECT array_agg(d.doc_id ORDER BY d.date) FROM documents d
       WHERE d.well_id = e.well_id AND d.doc_type IN ('incident_note', 'work_order') AND strpos(d.body, e.event_id) > 0) AS documents
    FROM events e JOIN wells w USING (well_id)
    WHERE true
      ${a.well_ids ? sql`AND e.well_id = ANY(${a.well_ids})` : sql``}
      ${a.field ? sql`AND w.field = ${a.field}` : sql``}
      ${category ? sql`AND e.category = ${category}` : a.type ? sql`AND e.type ILIKE ${"%" + a.type.replace(/[%_\\]/g, "") + "%"}` : sql``}
      ${a.status ? sql`AND e.status = ${a.status}` : sql``}
      ${a.from ? sql`AND (e.end_date IS NULL OR e.end_date >= ${a.from})` : sql``}
      ${a.to ? sql`AND e.start_date <= ${a.to}` : sql``}
    ORDER BY e.start_date DESC LIMIT 51`;
  const events = rows.slice(0, 50).map((r) => ({ ...r, lost_revenue_usd: r.lost_oil_bbl == null ? null : r.lost_oil_bbl * PRICE_PER_BBL }));
  return { count: events.length, truncated: rows.length > 50, events };
}

const searchInput = z
  .object({
    query: z.string().min(2).max(300),
    k: z.number().int().min(1).max(10),
    well_ids: wellIds.optional(),
    field: field.optional(),
    doc_type: z.enum(DOC_TYPES).optional(),
    from: isoDate.optional(),
    to: isoDate.optional(),
  })
  .refine((a) => !a.from || !a.to || a.from <= a.to, "from must be on or before to");

async function searchDocuments(a: z.infer<typeof searchInput>, callId: string, traces: SearchTrace[]) {
  const { query, k, ...filters } = a;
  const { vector, fullText, fused, full_text_only } = await hybridSearch(query, CANDIDATES, filters);
  const top = fused.slice(0, k);
  const chunks: SearchChunk[] = top.map((h) => ({
    chunk_id: h.id,
    document_id: h.document_id,
    title: h.title,
    doc_type: h.doc_type,
    well_id: h.well_id,
    field: h.field,
    date: h.date,
    section: h.section,
    text: h.text,
    scores: {
      vector_similarity: h.ranks[0] ? round(vector[h.ranks[0] - 1].score) : null,
      vector_rank: h.ranks[0],
      full_text_rank: h.ranks[1],
      full_text_score: h.ranks[1] ? round(fullText[h.ranks[1] - 1].score) : null,
      rrf: round(h.rrf, 5),
    },
  }));
  traces.push({
    call_id: callId,
    args: a,
    vector: vector.map((h, i) => ({ chunk_id: h.id, rank: i + 1, similarity: round(h.score) })),
    full_text: fullText.map((h, i) => ({ chunk_id: h.id, rank: i + 1, ts_rank: round(h.score) })),
    fused: fused.map((h, i) => ({ chunk_id: h.id, rank: i + 1, rrf: round(h.rrf, 5), vector_rank: h.ranks[0], full_text_rank: h.ranks[1] })),
    chunks_sent: chunks,
    full_text_only,
  });
  return { count: chunks.length, chunks: chunks.map(({ chunk_id, document_id, doc_type, well_id, date, section, text }) => ({ chunk_id, document_id, doc_type, well_id, date, section, text })) };
}

const wellsInput = z.object({ field: field.optional() });

async function getWells(a: z.infer<typeof wellsInput>) {
  const wells = await sql`
    SELECT w.well_id, w.field, w.lat, w.lon, w.status, w.well_type, w.lift_type,
      (SELECT count(*)::int FROM events e WHERE e.well_id = w.well_id AND e.status = 'open' AND e.category = 'incident') AS open_incidents
    FROM wells w ${a.field ? sql`WHERE w.field = ${a.field}` : sql``} ORDER BY w.well_id`;
  return { count: wells.length, wells };
}

const sortKeys = (v: unknown): unknown =>
  Array.isArray(v) ? v.map(sortKeys).sort() : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).filter(([, x]) => x !== undefined).sort().map(([k, x]) => [k, sortKeys(x)])) : v;

const NARROWING = ["field", "well_ids", "from", "to"];

interface Seen { name: string; args: Record<string, unknown>; ref: string; complete: boolean }

// A call that only adds filters to an earlier complete result asks for a subset the model already holds.
function earlier(seen: Seen[], name: string, args: Record<string, unknown>) {
  const same = (x: unknown, y: unknown) => JSON.stringify(sortKeys(x)) === JSON.stringify(sortKeys(y));
  return seen.find((s) => {
    if (s.name !== name) return false;
    const extra = Object.keys(args).filter((k) => args[k] !== undefined && s.args[k] === undefined);
    const matches = Object.keys(s.args).every((k) => s.args[k] === undefined || same(s.args[k], args[k]));
    const subset = name === "query_production" ? s.args.group_by === "well" : name !== "search_documents";
    return matches && (extra.length === 0 || (s.complete && subset && extra.every((k) => NARROWING.includes(k))));
  });
}

const PREFIX: Record<string, string> = { query_production: "P", list_events: "E", search_documents: "S", get_wells: "W" };

function once<A extends Record<string, unknown>, R extends object>(name: string, seen: Seen[], runs: ToolRun[], counter: Record<string, number>, run: (a: A, o: { toolCallId: string }) => Promise<R>) {
  return async (a: A, o: { toolCallId: string }) => {
    const first = earlier(seen, name, a);
    if (first) return { repeated: true, ref: first.ref, note: `Call ${first.ref} already returned this data. Reuse that result (ref ${first.ref}); do not call again.` };
    const ref = `${PREFIX[name]}${++counter[name]}`;
    const result = { ref, ...(await run(a, o)) };
    runs.push({ ref, name, output: result });
    seen.push({ name, args: a, ref, complete: !(result as { truncated?: boolean }).truncated });
    return result;
  };
}

export function makeTools(traces: SearchTrace[], runs: ToolRun[]) {
  const seen: Seen[] = [];
  const counter: Record<string, number> = { query_production: 0, list_events: 0, search_documents: 0, get_wells: 0 };
  return {
    query_production: tool({
      description:
        "Daily production from the production_daily table. metric: oil (bbl/d), gas (mscf/d) or water_cut (fraction 0-1). group_by day|week|month|quarter returns a time series (one series per well when 1-6 well_ids are given, else one aggregate series). group_by well returns one average value per well over from..to; add compare_from/compare_to to get the change against a baseline period, sorted by largest drop first. That one call covers every well in scope.",
      inputSchema: productionInput,
      execute: once("query_production", seen, runs, counter, queryProduction),
    }),
    list_events: tool({
      description:
        "Maintenance and incident events from the events table (date, type, status open/closed, severity, downtime, lost_oil_bbl = normal rate before the event times hours offline, lost_revenue_usd at an assumed $70 a barrel, description with equipment details, and the ids of the incident notes and work orders that cite the event). type accepts 'incident', 'maintenance', or a substring of an event type. from/to keep events active in that window; an event with no end date is still active. Newest first, max 50.",
      inputSchema: eventsInput,
      execute: once("list_events", seen, runs, counter, listEvents),
    }),
    search_documents: tool({
      description:
        "Hybrid search (vector + full text, fused with RRF) over field documents: shift reports, incident notes, work orders, well tests, procedures. Use for causes, findings, actions and context that the tables do not hold. Filters are applied before ranking. For a specific event, call list_events first, then filter this search on that event's well_ids and dates; a field-wide search returns older notes from other wells.",
      inputSchema: searchInput,
      execute: once("search_documents", seen, runs, counter, (a: z.infer<typeof searchInput>, { toolCallId }) => searchDocuments(a, toolCallId, traces)),
    }),
    get_wells: tool({
      description: "Wells with field, coordinates (lat/lon), current status (producing, shut_in, workover, suspended), type, lift and the count of open incidents.",
      inputSchema: wellsInput,
      execute: once("get_wells", seen, runs, counter, getWells),
    }),
  };
}

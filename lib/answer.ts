import { anthropic } from "@ai-sdk/anthropic";
import { isStepCount, Output, streamText, type LanguageModelUsage } from "ai";
import { z } from "zod";
import { sql } from "./db";
import { DATA_START, makeTools, TODAY, type SearchTrace } from "./tools";

export const MODEL = "claude-sonnet-5-5";
const MAX_STEPS = 4;
const PRICE = { input: 2, cacheRead: 0.1, cacheWrite: 2.5, output: 10 };

export { SUGGESTED } from "./questions";

const wellId = z.string().describe("Well id such as W-17");

export const answerSchema = z.object({
  answer: z.string().describe("2 to 4 sentences, at most 80 words. Cite with [n] markers that match sources[].n."),
  viz: z.discriminatedUnion("type", [
    z.object({
      type: z.literal("map"),
      title: z.string(),
      well_ids: z.array(wellId).describe("Wells the map is about; the map draws every well of their fields. Empty means every well"),
      highlighted: z.array(wellId).describe("Wells the answer is about"),
    }),
    z.object({
      type: z.literal("line"),
      title: z.string(),
      unit: z.string(),
      series: z.array(z.object({ name: z.string(), points: z.array(z.object({ x: z.string(), y: z.number() })) })),
    }),
    z.object({
      type: z.literal("bar"),
      title: z.string(),
      unit: z.string(),
      bars: z.array(z.object({ label: z.string(), value: z.number() })).describe("Ranked, most important first"),
    }),
    z.object({ type: z.literal("none") }),
  ]),
  sources: z.array(
    z.object({
      n: z.number().int(),
      kind: z.enum(["table", "chunk"]),
      id: z.string().describe("chunk: the chunk_id. table: events:<event_id>, wells:<well_id> or production_daily:<scope>:<from>..<to>"),
      label: z.string(),
    }),
  ),
  confidence: z.enum(["high", "medium", "low"]),
  could_not_verify: z.string().nullable().describe("One sentence on what the data could not confirm, or null"),
});

export type Answer = z.infer<typeof answerSchema>;

const SYSTEM = `You answer questions about a synthetic upstream oil and gas dataset. Today is ${TODAY}. The reader is often a manager who is not an engineer.

Data (synthetic): one fictional desert asset with 3 fields: Dune Field (W-01 to W-16), Wadi Field (W-17 to W-30, under water flood) and Salt Flat Field (W-31 to W-41, sand-prone). 41 wells with coordinates and status; daily production per well from ${DATA_START} to ${TODAY} (oil bbl/d, gas mscf/d, water cut as a fraction); maintenance and incident events per well, with lost oil; about 400 field documents (shift reports, incident notes, work orders, well tests, procedures). ESP wells run Varenta VL-538 pumps; a pump serial starts with its manufacturing batch (serial 2M-1187-044 is batch 2M-1187).

Tools, and when to use them:
- query_production: numbers and trends. For "which wells dropped", use one call with group_by=well and compare_from/compare_to: it returns every well's value and change, so never query wells one by one after it. For a field trend ("is water taking over a field"), one call with the field, metric and group_by=month from 2026-01-01 to today.
- list_events: what happened, when, what is open now, and what it cost (lost_oil_bbl, lost_revenue_usd). type='incident' for incidents.
- search_documents: why something happened, findings, equipment and actions. A "why" question always needs it; when the question names the well, call it in the first round alongside list_events. Filter by well_ids, field, doc_type and dates whenever the question names them.
- Chain events to documents: when the question names no well, call list_events first; once it finds the specific events, call search_documents in the next round filtered on those events' well_ids and on a window from 7 days before the event start to 30 days after. Never run a field-wide document search for a specific event.
- Open incidents ("where are the open incidents", "what is open this morning"): call list_events with type='incident' and status='open' first. In the next round, call search_documents once with doc_type='incident_note', the well_ids of those open events, from = 7 days before the earliest start date, and k = the number of open events plus 3. Each event lists the ids of the incident notes that cite it (documents): cite that incident note chunk for each incident, not only the events table. Answer in exactly 3 sentences, with no extra sentence for money: how many are open and in which fields, with the oil they have cost so far and its lost revenue; then the high-severity ones (say which wells are shut in) with their notes; then all the others together in one sentence with their notes.
- Repeat failures ("was it a one-off", "has this happened before", "is there a pattern"): in the first round call list_events with the equipment as type (for a pump failure, type='ESP') and no well filter, and search_documents on the named well's failure (well_ids, doc_type omitted, query with the failure and the pump serial and batch). Read the pump serial and batch in the descriptions and passages. In the second round call search_documents with the batch id as query (for example "ESP pump batch 2M-1187 serial motor failure", with the real batch id), no well filter, k=8. Answer in exactly 3 sentences, with [n] after each claim: sentence 1 starts with "It was not a one-off:" (never a bare "No.") and names the other wells, their fields and failure months, and the shared batch; sentence 2 gives the common finding and the total lost oil and lost revenue, cited to the events; sentence 3 says what this means (other pumps from the batch are at risk). Cite one incident note or work order for each well. Answer after the second round: no production query is needed.
- Procedure questions ("what does the procedure say"): call search_documents with doc_type='procedure' and the topic, in the same round as the other calls. Cite the procedure chunk.
- get_wells: well lists and current status. A map viz needs only well ids: the server adds coordinates, so do not call get_wells just to draw a map.
Use the fewest calls that answer the question; call independent tools in parallel. Results are deterministic: never call a tool twice with the same arguments, and answer after at most three rounds of calls.

Money: lost oil comes from list_events (lost_oil_bbl). When an incident leads to a workover on the same well, the outage is both events: add their lost_oil_bbl. Whenever you give barrels lost, also give the lost revenue at an assumed $70 a barrel, and say once that it is an assumption: "about 12,400 barrels, about $870,000 in lost revenue at an assumed $70 a barrel".

Dates: "last quarter" is the previous calendar quarter (2026-07-01 to 2026-09-30), compared with the quarter before it. "This year" is 2026-01-01 to today. "This morning" and "right now" mean today. A month without a year is the latest one on or before today.

Final answer:
- answer: 2 to 4 sentences, at most 80 words, never 5 (a fragment without a verb counts as a sentence): sentence 1 gives the direct answer, the next ones the key evidence. Leave other details out. Do not start with a bare "Yes." or "No.": put it in sentence 1. Keep it plain and specific (wells, dates, values), each claim followed by [n]. Write ranges with "to", never with a dash. Plain words for a manager: the first time you name a well, say where it is ("W-17, a Wadi Field well"); dates as "4 March 2026", never 2026-03-04; spell out a technical term the first time in a few plain words ("its electric pump (ESP)", "water cut (the share of water in what the well brings up)", "a workover (a repair job with a rig)"); round numbers ("about 1,190 barrels a day"). These rules never add a sentence: the limit of 4 sentences and 80 words always wins, so merge or drop details instead.
- viz: map for "where" questions and open items (highlighted = the wells concerned; well_ids empty for all wells); line for a trend over time (copy the points from query_production); bar for a ranking or comparison across wells (copy the values, ranked); for a repeat failure, a bar of lost oil per failure (label "W-09, Oct 2025"); none when no chart helps.
- sources: only rows and chunks that the tools returned in this conversation. Never invent an id, a number or a date.
- confidence: high when tables and documents agree, medium when only one kind of evidence exists, low when evidence is thin or conflicting.
- could_not_verify: one sentence on what you could not confirm from the data, or null.`;

export type AskEvent =
  | { type: "start"; question: string; mode: "live" | "cache"; reason?: string }
  | { type: "tool-call"; id: string; name: string; args: unknown; label: string }
  | { type: "tool-result"; id: string; name: string; output: unknown }
  | { type: "tool-error"; id: string; name: string; error: string }
  | { type: "final"; answer: Answer & { viz: unknown }; trace: SearchTrace[]; checks: Checks; usage: Usage; latency_ms: number; model: string }
  | { type: "fallback"; reason: string }
  | { type: "error"; message: string };

export interface Usage {
  input_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  output_tokens: number;
  steps: number;
  cost_usd: number;
}

interface Checks {
  unknown_chunk_ids: string[];
  refs_without_source: number[];
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function period(from?: string, to?: string) {
  const fmt = (d: string) => `${MONTHS[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`;
  if (!from && !to) return null;
  if (from && to && fmt(from) === fmt(to)) return fmt(from);
  return [from && fmt(from), to && fmt(to)].filter(Boolean).join(" to ");
}

export function label(name: string, a: Record<string, any>) {
  const scope = [a.well_ids?.join(", "), a.field, a.doc_type?.replace("_", " "), period(a.from, a.to)].filter(Boolean).join(", ");
  const suffix = scope ? ` (${scope})` : "";
  switch (name) {
    case "query_production":
      return `Querying ${a.metric === "water_cut" ? "water cut" : `${a.metric} production`} by ${a.group_by}${suffix}...`;
    case "list_events":
      return `Listing ${a.status ? `${a.status} ` : ""}${a.type ?? "events"}${suffix}...`;
    case "search_documents":
      return `Searching documents${suffix}...`;
    case "get_wells":
      return `Loading wells${a.field ? ` (${a.field})` : ""}...`;
    default:
      return `${name}...`;
  }
}

function toUsage(u: LanguageModelUsage, steps: number): Usage {
  const cacheRead = u.inputTokenDetails.cacheReadTokens ?? 0;
  const cacheWrite = u.inputTokenDetails.cacheWriteTokens ?? 0;
  const input = u.inputTokenDetails.noCacheTokens ?? (u.inputTokens ?? 0) - cacheRead - cacheWrite;
  const output = u.outputTokens ?? 0;
  const cost = (input * PRICE.input + cacheRead * PRICE.cacheRead + cacheWrite * PRICE.cacheWrite + output * PRICE.output) / 1e6;
  return { input_tokens: input, cache_read_tokens: cacheRead, cache_write_tokens: cacheWrite, output_tokens: output, steps, cost_usd: Number(cost.toFixed(4)) };
}

async function withWells(viz: Answer["viz"]) {
  if (viz.type !== "map") return viz;
  const wells = await sql<{ well_id: string; field: string; lat: number; lon: number; status: string }[]>`
    SELECT well_id, field, lat, lon, status FROM wells
    ${viz.well_ids.length ? sql`WHERE field IN (SELECT field FROM wells WHERE well_id = ANY(${[...viz.well_ids, ...viz.highlighted]}))` : sql``} ORDER BY well_id`;
  const highlighted = new Set(viz.highlighted);
  return { ...viz, wells: wells.map((w) => ({ ...w, highlighted: highlighted.has(w.well_id) })) };
}

function check(a: Answer, traces: SearchTrace[]): Checks {
  const sent = new Set(traces.flatMap((t) => t.chunks_sent.map((c) => c.chunk_id)));
  const ns = new Set(a.sources.map((s) => s.n));
  return {
    unknown_chunk_ids: a.sources.filter((s) => s.kind === "chunk" && !sent.has(s.id)).map((s) => s.id),
    refs_without_source: [...new Set([...a.answer.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1])))].filter((n) => !ns.has(n)),
  };
}

const repeated = (step?: { toolResults: { output: unknown }[] }) =>
  !!step?.toolResults.length && step.toolResults.some((r) => (r.output as { repeated?: boolean })?.repeated);

export async function* ask(question: string, signal?: AbortSignal): AsyncGenerator<AskEvent> {
  const t0 = Date.now();
  const traces: SearchTrace[] = [];
  const result = streamText({
    model: anthropic(MODEL),
    instructions: SYSTEM,
    prompt: question,
    tools: makeTools(traces),
    output: Output.object({ name: "answer", schema: answerSchema }),
    stopWhen: isStepCount(MAX_STEPS),
    prepareStep: ({ stepNumber, steps }) => (stepNumber === MAX_STEPS - 1 || repeated(steps.at(-1)) ? { toolChoice: "none" } : {}),
    maxOutputTokens: 16000,
    maxRetries: 1,
    abortSignal: signal,
    providerOptions: { anthropic: { effort: "low", cacheControl: { type: "ephemeral" } } },
  });
  yield { type: "start", question, mode: "live" };
  for await (const part of result.stream) {
    if (part.type === "tool-call") yield { type: "tool-call", id: part.toolCallId, name: part.toolName, args: part.input, label: label(part.toolName, part.input as Record<string, unknown>) };
    else if (part.type === "tool-result") yield { type: "tool-result", id: part.toolCallId, name: part.toolName, output: part.output };
    else if (part.type === "tool-error") yield { type: "tool-error", id: part.toolCallId, name: part.toolName, error: String(part.error) };
    else if (part.type === "error") throw part.error;
  }
  const answer = await result.output;
  const steps = (await result.steps).length;
  yield {
    type: "final",
    answer: { ...answer, viz: await withWells(answer.viz) },
    trace: traces,
    checks: check(answer, traces),
    usage: toUsage(await result.totalUsage, steps),
    latency_ms: Date.now() - t0,
    model: MODEL,
  };
}

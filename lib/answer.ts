import { anthropic } from "@ai-sdk/anthropic";
import { isStepCount, Output, streamText, type LanguageModelUsage } from "ai";
import { z } from "zod";
import { sql } from "./db";
import { DATA_START, makeTools, TODAY, type SearchTrace } from "./tools";

export const MODEL = "claude-sonnet-5-5";
const MAX_STEPS = 4;
const PRICE = { input: 2, cacheRead: 0.1, cacheWrite: 2.5, output: 10 };

export const SUGGESTED = [
  "Which wells dropped production last quarter?",
  "Where are the open incidents right now?",
  "How did water cut evolve on Field B this year?",
  "Why did W-17 go down in March?",
];

const wellId = z.string().describe("Well id such as W-17");

export const answerSchema = z.object({
  answer: z.string().describe("3 sentences (4 at most), at most 70 words. Cite with [n] markers that match sources[].n."),
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

const SYSTEM = `You answer questions from operations engineers about a synthetic upstream oil and gas dataset. Today is ${TODAY}.

Data (synthetic): 3 fields (Field A, Field B, Bayda), 41 wells W-01 to W-41 with coordinates and status; daily production per well from ${DATA_START} to ${TODAY} (oil bbl/d, gas mscf/d, water cut as a fraction); maintenance and incident events per well; about 400 field documents (shift reports, incident notes, work orders, well tests, procedures).

Tools, and when to use them:
- query_production: numbers and trends. For "which wells dropped", use one call with group_by=well and compare_from/compare_to: it returns every well's value and change, so never query wells one by one after it.
- list_events: what happened, when, and what is open now. type='incident' for incidents.
- search_documents: why something happened, findings and actions. A "why" question always needs it; when the question names the well, call it in the first round alongside list_events. Filter by well_ids, field, doc_type and dates whenever the question names them.
- Chain events to documents: when the question names no well, call list_events first; once it finds the specific events, call search_documents in the next round filtered on those events' well_ids and on a window from 7 days before the event start to 30 days after. Never run a field-wide document search for a specific event.
- get_wells: well lists and current status. A map viz needs only well ids: the server adds coordinates, so do not call get_wells just to draw a map.
Use the fewest calls that answer the question; call independent tools in parallel. Results are deterministic: never call a tool twice with the same arguments, and answer after at most three rounds of calls.

Dates: "last quarter" is the previous calendar quarter (2026-07-01 to 2026-09-30), compared with the quarter before it. "This year" is 2026-01-01 to today. A month without a year is the latest one on or before today.

Final answer:
- answer: exactly 3 sentences (4 only when needed, never more), at most 70 words: sentence 1 gives the direct answer, sentences 2 and 3 the key evidence. Leave other details out. Do not start with a bare "Yes." or "No.": put it in sentence 1. Keep it plain and specific (wells, dates, values), each claim followed by [n]. Write ranges with "to", never with a dash.
- viz: map for "where" questions and open items (highlighted = the wells concerned; well_ids empty for all wells); line for a trend over time (copy the points from query_production); bar for a ranking or comparison across wells (copy the values, ranked); none when no chart helps.
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

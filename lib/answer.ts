import { anthropic } from "@ai-sdk/anthropic";
import { openrouter } from "@openrouter/ai-sdk-provider";
import { isStepCount, Output, streamText, type LanguageModelUsage } from "ai";
import { z } from "zod";
import { BAR_METRICS, buildViz, type FinalViz } from "./chart";
import { findQuote } from "./quote";
import { SYSTEM } from "./prompt";
import { makeTools, type RepeatedResult, type SearchTrace } from "./tools";

export const MODEL = process.env.ASK_MODEL || "claude-sonnet-5-5";
const MAX_STEPS = 4;
export const CLAUDE_PRICES: Record<string, { input: number; cacheRead: number; cacheWrite: number; output: number }> = {
  "claude-sonnet-5-5": { input: 2, cacheRead: 0.1, cacheWrite: 2.5, output: 10 },
  "claude-haiku-5-5": { input: 0.1, cacheRead: 0.01, cacheWrite: 0.125, output: 0.5 },
};
const isClaude = (model: string) => model.startsWith("claude-");

const wellId = z.string().max(10).describe("Well id such as W-17");

export const answerSchema = z.object({
  answer: z.string().max(1000).describe("2 to 4 sentences, at most 80 words. Cite with [n] markers that match sources[].n."),
  viz: z.discriminatedUnion("type", [
    z.object({
      type: z.literal("map"),
      title: z.string().max(120),
      well_ids: z.array(wellId).max(41).describe("Wells the map is about; the map draws every well of their fields. Empty means every well"),
      highlighted: z.array(wellId).max(41).describe("Wells the answer is about"),
    }),
    z.object({
      type: z.literal("line"),
      title: z.string().max(120),
      ref: z.string().max(10).describe("ref of a query_production time series result (group_by day, week, month or quarter), such as P1"),
      metric: z.enum(["oil", "gas", "water_cut"]).describe("The metric the chart shows; it must be the metric of that result"),
      series: z.array(z.string().max(60)).max(10).describe("Names of the series to plot; empty for all"),
    }),
    z.object({
      type: z.literal("bar"),
      title: z.string().max(120),
      ref: z.string().max(10).describe("ref of a query_production group_by=well result (P1) or of a list_events result (E1)"),
      metric: z.enum(BAR_METRICS).describe("query_production: value, change or change_pct. list_events: lost_oil_bbl, lost_revenue_usd or downtime_hours"),
      wells: z.array(wellId).max(41).describe("query_production: the wells to plot; empty for the top 10"),
      event_groups: z.array(z.array(z.string().max(20)).max(10)).max(20).describe("list_events: one bar per group of event ids, such as a failure and its workover on the same well; empty for one bar per event"),
      direction: z.enum(["drops", "rises"]).nullable().describe("change or change_pct bars: keep the largest drops or the largest rises; null otherwise"),
    }),
    z.object({ type: z.literal("none") }),
  ]),
  sources: z.array(
    z.object({
      n: z.number().int(),
      kind: z.enum(["table", "chunk"]),
      id: z.string().max(120).describe("chunk: the chunk_id. table: events:<event_id>, wells:<well_id> or production_daily:<scope>:<from>..<to>, one id per source, never a list of ids"),
      label: z.string().max(200),
      quote: z.string().max(400).nullable().describe("chunk: one sentence or one table row copied word for word from that chunk's text, under 200 characters, that supports the claim. table: null"),
    }),
  ).max(20),
  confidence: z.enum(["high", "medium", "low"]),
  could_not_verify: z.string().max(400).nullable().describe("One sentence on what the data could not confirm, or null"),
});

export type Answer = z.infer<typeof answerSchema>;

export type AskEvent =
  | { type: "start"; question: string; mode: "live" | "cache"; reason?: string }
  | { type: "tool-call"; id: string; name: string; args: unknown }
  | { type: "tool-result"; id: string; name: string; output: unknown }
  | { type: "tool-error"; id: string; name: string; error: string }
  | { type: "final"; answer: Omit<Answer, "viz" | "sources"> & { viz: FinalViz; sources: FinalSource[] }; trace: SearchTrace[]; checks: Checks; usage: Usage; latency_ms: number; model: string; provider?: string }
  | { type: "fallback"; reason: string }
  | { type: "error"; message: string };

export interface Usage {
  input_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  output_tokens: number;
  steps: number;
  cost_usd: number | null;
}

export type FinalSource = Answer["sources"][number] & { quote_verified: boolean | null };

interface Checks {
  unknown_chunk_ids: string[];
  refs_without_source: number[];
  viz_error: string | null;
  unverified_quotes: number[];
}

function toUsage(model: string, u: LanguageModelUsage, steps: number, reportedCost: number | null): Usage {
  const cacheRead = u.inputTokenDetails.cacheReadTokens ?? 0;
  const cacheWrite = u.inputTokenDetails.cacheWriteTokens ?? 0;
  const input = isClaude(model) && u.inputTokenDetails.noCacheTokens !== undefined ? u.inputTokenDetails.noCacheTokens : (u.inputTokens ?? 0) - cacheRead - cacheWrite;
  const output = u.outputTokens ?? 0;
  const p = CLAUDE_PRICES[model];
  const cost = p ? (input * p.input + cacheRead * p.cacheRead + cacheWrite * p.cacheWrite + output * p.output) / 1e6 : reportedCost;
  return { input_tokens: input, cache_read_tokens: cacheRead, cache_write_tokens: cacheWrite, output_tokens: output, steps, cost_usd: cost === null ? null : Number(cost.toFixed(4)) };
}

type RouterMeta = { openrouter?: { provider?: string; usage?: { cost?: number } } };
function routerMeta(steps: { providerMetadata?: unknown }[]) {
  const metas = steps.map((s) => (s.providerMetadata as RouterMeta | undefined)?.openrouter);
  const costs = metas.map((m) => m?.usage?.cost);
  return {
    cost: costs.length && costs.every((c) => typeof c === "number") ? (costs as number[]).reduce((a, b) => a + b, 0) : null,
    provider: [...new Set(metas.map((m) => m?.provider).filter(Boolean))].join(", ") || undefined,
  };
}

function verifyQuotes(a: Answer, traces: SearchTrace[]): FinalSource[] {
  const text = new Map(traces.flatMap((t) => t.chunks_sent.map((c) => [c.chunk_id, c.text] as const)));
  return a.sources.map((s) => ({ ...s, quote_verified: s.kind === "chunk" ? !!findQuote(text.get(s.id) ?? "", s.quote) : null }));
}

function check(a: Answer, sources: FinalSource[], traces: SearchTrace[], vizError: string | null): Checks {
  const sent = new Set(traces.flatMap((t) => t.chunks_sent.map((c) => c.chunk_id)));
  const ns = new Set(a.sources.map((s) => s.n));
  return {
    unknown_chunk_ids: a.sources.filter((s) => s.kind === "chunk" && !sent.has(s.id)).map((s) => s.id),
    refs_without_source: [...new Set([...a.answer.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1])))].filter((n) => !ns.has(n)),
    viz_error: vizError,
    unverified_quotes: sources.filter((s) => s.quote_verified === false).map((s) => s.n),
  };
}

const repeated = (step?: { toolResults: { output: unknown }[] }) =>
  !!step?.toolResults.length && step.toolResults.some((r) => (r.output as Partial<RepeatedResult>)?.repeated);

export async function* ask(question: string, signal?: AbortSignal, model = MODEL): AsyncGenerator<AskEvent> {
  const t0 = Date.now();
  const { tools, runs, traces } = makeTools();
  const result = streamText({
    model: isClaude(model) ? anthropic(model) : openrouter(model, { usage: { include: true } }),
    instructions: SYSTEM,
    prompt: question,
    tools,
    output: Output.object({ name: "answer", schema: answerSchema }),
    stopWhen: isStepCount(MAX_STEPS),
    prepareStep: ({ stepNumber, steps }) => (stepNumber === MAX_STEPS - 1 || repeated(steps.at(-1)) ? { toolChoice: "none" } : {}),
    maxOutputTokens: 3000,
    maxRetries: 1,
    abortSignal: signal,
    providerOptions: isClaude(model) ? { anthropic: { effort: "low", cacheControl: { type: "ephemeral" } } } : {},
  });
  yield { type: "start", question, mode: "live" };
  for await (const part of result.stream) {
    if (part.type === "tool-call") yield { type: "tool-call", id: part.toolCallId, name: part.toolName, args: part.input };
    else if (part.type === "tool-result") yield { type: "tool-result", id: part.toolCallId, name: part.toolName, output: part.output };
    else if (part.type === "tool-error") yield { type: "tool-error", id: part.toolCallId, name: part.toolName, error: String(part.error) };
    else if (part.type === "error") throw part.error;
  }
  const answer = await result.output;
  const steps = await result.steps;
  const meta = isClaude(model) ? { cost: null, provider: "anthropic" } : routerMeta(steps);
  const viz = await buildViz(answer.viz, runs);
  const sources = verifyQuotes(answer, traces);
  yield {
    type: "final",
    answer: { ...answer, viz: viz.viz, sources },
    trace: traces,
    checks: check(answer, sources, traces, viz.error),
    usage: toUsage(model, await result.totalUsage, steps.length, meta.cost),
    latency_ms: Date.now() - t0,
    model,
    provider: meta.provider,
  };
}

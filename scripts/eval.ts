import { mkdirSync, writeFileSync } from "node:fs";
import { ask, MODEL, SUGGESTED, type AskEvent } from "../lib/answer";
import { record } from "../lib/cache";
import { sql } from "../lib/db";
import { findQuote } from "../lib/quote";
import { saveQueryCache } from "../lib/voyage";

type Final = Extract<AskEvent, { type: "final" }>;
type Call = Extract<AskEvent, { type: "tool-call" }>;
type Check = [string, (f: Final, calls: Call[], results: AskEvent[]) => boolean];

const bars = (f: Final) => (f.answer.viz as { type: string; bars?: { label: string }[] }).bars ?? [];
const series = (f: Final) => (f.answer.viz as { type: string; series?: { name: string }[] }).series ?? [];
const highlighted = (f: Final) => ((f.answer.viz as { highlighted?: string[] }).highlighted ?? []).slice().sort();
const args = (c: Call) => c.args as Record<string, unknown>;
const sentences = (text: string) => text.replace(/\s*\[\d+\]/g, "").trim().split(/(?<=[.!?])\s+(?=["(A-Z0-9])/).filter(Boolean).length;
const SHORT: Check = ["answer has 2 to 4 sentences", (f) => { const n = sentences(f.answer.answer); return n >= 2 && n <= 4; }];

type Out = { ref?: string; series?: { name: string; points: { x: string; y: number }[] }[]; rows?: Record<string, unknown>[]; events?: Record<string, unknown>[] };
function plottedFromTools(f: Final, results: AskEvent[]) {
  const v = f.answer.viz;
  if (v.type !== "line" && v.type !== "bar") return true;
  const out = results.map((r) => (r as { output?: Out }).output).find((o) => o?.ref === v.ref);
  if (!out) return false;
  if (v.type === "line")
    return v.series.length > 0 && v.series.every((s) => {
      const src = out.series?.find((x) => x.name === s.name);
      return !!src && s.points.length === src.points.length && s.points.every((p) => src.points.some((q) => q.x === p.x && q.y === p.y));
    });
  return v.bars.length > 0 && v.bars.every((b) => {
    if (out.rows) return out.rows.find((r) => r.well_id === b.ids[0])?.[v.metric] === b.value;
    const vals = b.ids.map((id) => out.events?.find((e) => e.event_id === id)?.[v.metric]);
    return vals.every((x) => typeof x === "number") && (vals as number[]).reduce((a, c) => a + c, 0) === b.value;
  });
}
function quotesVerified(f: Final) {
  const text = new Map(f.trace.flatMap((t) => t.chunks_sent.map((c) => [c.chunk_id, c.text] as const)));
  return f.answer.sources.filter((s) => s.kind === "chunk").every((s) => s.quote_verified === true && !!findQuote(text.get(s.id) ?? "", s.quote));
}
const COMMON: Check[] = [
  SHORT,
  ["chart reference is valid", (f) => f.checks.viz_error === null],
  ["every plotted value equals the referenced tool output", (f, _, results) => plottedFromTools(f, results)],
  ["every chunk source has a verified quote", (f) => quotesVerified(f)],
];

const docOf = async (well: string, type: string, from: string, to: string) =>
  (await sql<{ doc_id: string }[]>`SELECT doc_id FROM documents WHERE well_id = ${well} AND doc_type = ${type} AND date BETWEEN ${from} AND ${to} ORDER BY date LIMIT 1`)[0]?.doc_id ?? "missing";
const W17_NOTE = await docOf("W-17", "incident_note", "2026-03-01", "2026-03-31");
const SAND_NOTE = await docOf("W-34", "incident_note", "2026-11-09", "2026-11-22");
const BATCH_WELLS = ["W-09", "W-17", "W-27"];

const cites = (f: Final, prefix: string) => f.answer.sources.some((s) => s.id.startsWith(prefix));
function citedWells(f: Final, results: AskEvent[]) {
  const chunkWell = new Map(f.trace.flatMap((t) => t.chunks_sent.map((c) => [c.chunk_id, c.well_id] as const)));
  const eventWell = new Map(results.flatMap((r) => ((r as { output?: { events?: { event_id: string; well_id: string }[] } }).output?.events ?? []).map((e) => [e.event_id, e.well_id] as const)));
  return new Set(f.answer.sources.map((s) => (s.kind === "chunk" ? chunkWell.get(s.id) : eventWell.get(s.id.replace(/^events:/, "")) ?? s.id.match(/W-\d{2}/)?.[0])).filter(Boolean));
}
const points = (f: Final) => (f.answer.viz as { series?: { points: { y: number }[] }[] }).series?.[0]?.points ?? [];

const CASES: { question: string; checks: Check[] }[] = [
  {
    question: SUGGESTED[0],
    checks: [
      ["viz is a map", (f) => f.answer.viz.type === "map"],
      ["highlights exactly W-05, W-12, W-25, W-34, W-36", (f) => highlighted(f).join(",") === "W-05,W-12,W-25,W-34,W-36"],
      ["cites at least 3 incident notes", (f) => new Set(f.answer.sources.filter((s) => s.kind === "chunk" && s.id.startsWith("IN-")).map((s) => s.id.split("#")[0])).size >= 3],
    ],
  },
  {
    question: SUGGESTED[1],
    checks: [
      [`cites the W-17 incident note (${W17_NOTE})`, (f) => cites(f, W17_NOTE)],
      ["answer dates the outage in March 2026", (f) => /March/.test(f.answer.answer) && /2026/.test(f.answer.answer)],
      ["answer gives the lost revenue in dollars", (f) => /\$\d/.test(f.answer.answer)],
    ],
  },
  {
    question: SUGGESTED[2],
    checks: [
      ["answer names W-09, W-17 and W-27", (f) => BATCH_WELLS.every((w) => f.answer.answer.includes(w))],
      ["answer names batch 7Q-0419", (f) => f.answer.answer.includes("7Q-0419")],
      ["sources cover all 3 batch failures", (f, _, results) => { const w = citedWells(f, results); return BATCH_WELLS.every((x) => w.has(x)); }],
      ["viz is a bar of lost oil per failure for W-09, W-17 and W-27", (f) => f.answer.viz.type === "bar" && f.answer.viz.metric === "lost_oil_bbl" && BATCH_WELLS.every((w) => bars(f).some((b) => b.label.startsWith(w)))],
    ],
  },
  {
    question: SUGGESTED[3],
    checks: [
      ["viz is a line", (f) => f.answer.viz.type === "line"],
      ["line is for Wadi Field", (f, calls) => series(f).some((s) => s.name.includes("Wadi")) || calls.some((c) => c.name === "query_production" && args(c).field === "Wadi Field" && args(c).metric === "water_cut")],
      ["water cut line rises", (f) => { const p = points(f); return p.length >= 6 && p.at(-1)!.y > p[0].y * 1.2; }],
    ],
  },
  {
    question: SUGGESTED[4],
    checks: [
      ["finds the open W-34 alarm", (f, _, results) => /W-34/.test(f.answer.answer) && /open/i.test(f.answer.answer) && JSON.stringify(results).includes('"status":"open"')],
      [`cites the sand alarm incident note (${SAND_NOTE})`, (f) => cites(f, SAND_NOTE)],
      ["cites the sand procedure (SOP-OPS-002)", (f) => cites(f, "SOP-OPS-002")],
    ],
  },
];

const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const recordCache = process.argv.includes("--record");
const save = process.argv.includes("--save");
const only = arg("only");
const model = arg("model") ?? MODEL;
const runCount = Number(arg("runs") ?? 1);
if (recordCache && model !== MODEL) {
  console.error(`--record keeps data/cache on the production model (${MODEL}); drop --model or --record.`);
  process.exit(2);
}

type Price = { prompt: string; completion: string; input_cache_read?: string; input_cache_write?: string };
const routerPrice = model.startsWith("claude-")
  ? null
  : ((await (await fetch("https://openrouter.ai/api/v1/models")).json()) as { data: { id: string; pricing: Price }[] }).data.find((m) => m.id === model)?.pricing ?? null;
function costOf(u: Final["usage"]) {
  if (u.cost_usd !== null || !routerPrice) return { cost: u.cost_usd, source: model.startsWith("claude-") ? "claude price table" : "openrouter usage" };
  const p = (k: keyof Price) => Number(routerPrice[k] ?? routerPrice.prompt);
  const cost = u.input_tokens * p("prompt") + u.cache_read_tokens * p("input_cache_read") + u.cache_write_tokens * p("input_cache_write") + u.output_tokens * p("completion");
  return { cost: Number(cost.toFixed(4)), source: "openrouter price list" };
}

interface Run {
  question: number;
  run: number;
  error?: string;
  checks: { name: string; pass: boolean }[];
  latency_ms?: number;
  tool_calls?: number;
  provider?: string;
  usage?: Final["usage"];
  cost_usd?: number | null;
  cost_source?: string;
  answer?: Final["answer"];
}
const results: Run[] = [];

for (let run = 1; run <= runCount; run++) {
  for (const [i, c] of CASES.entries()) {
    if (only && !only.split(",").includes(String(i + 1))) continue;
    console.log(`\n[${i + 1}${runCount > 1 ? `, run ${run}` : ""}] ${c.question}`);
    const t0 = Date.now();
    const events: { t: number; event: AskEvent }[] = [];
    try {
      for await (const event of ask(c.question, undefined, model)) events.push({ t: Date.now() - t0, event });
    } catch (err) {
      const message = (err as Error).message;
      console.log(`  ERROR ${message}`);
      for (const { event } of events) if (event.type === "tool-call" || event.type === "tool-error") console.log(`    ${event.type} ${JSON.stringify(event).slice(0, 400)}`);
      [...c.checks, ...COMMON].forEach(([name]) => console.log(`  FAIL ${name}`));
      results.push({ question: i + 1, run, error: message, checks: [...c.checks, ...COMMON].map(([name]) => ({ name, pass: false })) });
      continue;
    }
    const evs = events.map((e) => e.event);
    const final = evs.find((e): e is Final => e.type === "final")!;
    const calls = evs.filter((e): e is Call => e.type === "tool-call");
    const toolResults = evs.filter((e) => e.type === "tool-result");
    const checks = [...c.checks, ...COMMON].map(([name, fn]) => ({ name, pass: fn(final, calls, toolResults) }));
    for (const ch of checks) console.log(`  ${ch.pass ? "PASS" : "FAIL"} ${ch.name}`);
    const u = final.usage;
    const { cost, source } = costOf(u);
    results.push({ question: i + 1, run, checks, latency_ms: final.latency_ms, tool_calls: calls.length, provider: final.provider, usage: u, cost_usd: cost, cost_source: source, answer: final.answer });
    console.log(`  latency ${(final.latency_ms / 1000).toFixed(1)}s, steps ${u.steps}, tokens in ${u.input_tokens} + cache read ${u.cache_read_tokens} + cache write ${u.cache_write_tokens}, out ${u.output_tokens}, cost ${cost === null ? "unknown" : `$${cost}`}`);
    const repeats = calls.length - new Set(calls.map((c) => c.name + JSON.stringify(c.args))).size;
    console.log(`  tools (${calls.length}, ${repeats} repeated): ${calls.map((c) => c.label).join(" | ")}`);
    console.log(`  sentences: ${sentences(final.answer.answer)}${final.trace.some((t) => t.full_text_only) ? ", search ran full text only" : ""}`);
    console.log(`  viz: ${final.answer.viz.type}, confidence: ${final.answer.confidence}, sources: ${final.answer.sources.map((s) => s.id).join(", ")}`);
    console.log(`  answer: ${final.answer.answer}`);
    if (final.answer.could_not_verify) console.log(`  not verified: ${final.answer.could_not_verify}`);
    if (final.checks.unknown_chunk_ids.length || final.checks.refs_without_source.length || final.checks.viz_error || final.checks.unverified_quotes.length) console.log(`  grounding: ${JSON.stringify(final.checks)}`);
    for (const s of final.answer.sources.filter((x) => x.quote_verified === false)) console.log(`  quote not found [${s.n}] ${s.id}: ${s.quote}`);
    if (recordCache && checks.every((ch) => ch.pass) && SUGGESTED.includes(c.question)) {
      record(c.question, events);
      console.log("  recorded to data/cache");
    }
  }
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const round = (x: number | null, d = 0) => (x === null ? null : Number(x.toFixed(d)));
const done = results.filter((r) => !r.error);
const all = results.flatMap((r) => r.checks);
const passed = all.filter((ch) => ch.pass).length;
const failures: Record<string, number> = {};
for (const ch of all) if (!ch.pass) failures[ch.name] = (failures[ch.name] ?? 0) + 1;
const costs = done.map((r) => r.cost_usd).filter((x): x is number => typeof x === "number");
const noTools = done.length > 0 && done.every((r) => r.tool_calls === 0);
const summary = {
  status: (results.length && !done.length) || noTools ? "unsupported" : "ok",
  error: results.length && !done.length ? results[0].error : noTools ? "no tool call in any run: the model returned the structured answer at once, without calling a tool" : undefined,
  checks_passed: passed,
  checks_total: all.length,
  per_question: [...new Set(results.map((r) => r.question))].map((q) => {
    const qs = results.filter((r) => r.question === q).flatMap((r) => r.checks);
    return { question: q, passed: qs.filter((ch) => ch.pass).length, total: qs.length };
  }),
  failures,
  errors: results.length - done.length,
  latency_ms_mean: round(mean(done.map((r) => r.latency_ms!))),
  latency_ms_max: done.length ? Math.max(...done.map((r) => r.latency_ms!)) : null,
  steps_mean: round(mean(done.map((r) => r.usage!.steps)), 2),
  tool_calls_mean: round(mean(done.map((r) => r.tool_calls!)), 2),
  input_tokens_mean: round(mean(done.map((r) => r.usage!.input_tokens))),
  cache_read_tokens_mean: round(mean(done.map((r) => r.usage!.cache_read_tokens))),
  cache_write_tokens_mean: round(mean(done.map((r) => r.usage!.cache_write_tokens))),
  output_tokens_mean: round(mean(done.map((r) => r.usage!.output_tokens))),
  cost_usd_mean: round(mean(costs), 4),
  cost_usd_total: round(costs.reduce((a, b) => a + b, 0), 4),
  prompt_caching: done.some((r) => r.usage!.cache_read_tokens > 0),
};

console.log(`\n${model}: ${passed}/${all.length} checks passed${summary.errors ? `, ${summary.errors} runs failed with an error` : ""}. Mean latency ${((summary.latency_ms_mean ?? 0) / 1000).toFixed(1)}s, mean cost ${summary.cost_usd_mean === null ? "unknown" : `$${summary.cost_usd_mean.toFixed(4)}`} per question.`);
if (save) {
  const date = new Date().toISOString().slice(0, 10);
  const file = `evals/${date}-${model.replace(/\//g, "-")}.json`;
  mkdirSync("evals", { recursive: true });
  const providers = [...new Set(done.map((r) => r.provider).filter(Boolean))];
  writeFileSync(file, JSON.stringify({ date, model, providers, openrouter_pricing: routerPrice, runs: runCount, command: `pnpm eval --model=${model} --runs=${runCount} --save`, summary, results }, null, 2) + "\n");
  console.log(`saved ${file}`);
}
if (recordCache) saveQueryCache();
await sql.end();
process.exit(passed === all.length ? 0 : 1);

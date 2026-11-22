import { ask, SUGGESTED, type AskEvent } from "../lib/answer";
import { record } from "../lib/cache";
import { sql } from "../lib/db";
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

const recordCache = process.argv.includes("--record");
const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7);
let passed = 0;
let total = 0;
const runs: { latency: number; cost: number }[] = [];

for (const [i, c] of CASES.entries()) {
  if (only && !only.split(",").includes(String(i + 1))) continue;
  console.log(`\n[${i + 1}] ${c.question}`);
  const t0 = Date.now();
  const events: { t: number; event: AskEvent }[] = [];
  try {
    for await (const event of ask(c.question)) events.push({ t: Date.now() - t0, event });
  } catch (err) {
    console.log(`  ERROR ${(err as Error).message}`);
    for (const { event } of events) if (event.type === "tool-call" || event.type === "tool-error") console.log(`    ${event.type} ${JSON.stringify(event).slice(0, 400)}`);
    [...c.checks, SHORT].forEach(([name]) => console.log(`  FAIL ${name}`));
    total += c.checks.length + 1;
    continue;
  }
  const evs = events.map((e) => e.event);
  const final = evs.find((e): e is Final => e.type === "final")!;
  const calls = evs.filter((e): e is Call => e.type === "tool-call");
  const results = evs.filter((e) => e.type === "tool-result");
  let ok = true;
  for (const [name, fn] of [...c.checks, SHORT]) {
    const pass = fn(final, calls, results);
    ok &&= pass;
    passed += Number(pass);
    total++;
    console.log(`  ${pass ? "PASS" : "FAIL"} ${name}`);
  }
  const u = final.usage;
  runs.push({ latency: final.latency_ms, cost: u.cost_usd });
  console.log(`  latency ${(final.latency_ms / 1000).toFixed(1)}s, steps ${u.steps}, tokens in ${u.input_tokens} + cache read ${u.cache_read_tokens} + cache write ${u.cache_write_tokens}, out ${u.output_tokens}, cost $${u.cost_usd}`);
  const repeats = calls.length - new Set(calls.map((c) => c.name + JSON.stringify(c.args))).size;
  console.log(`  tools (${calls.length}, ${repeats} repeated): ${calls.map((c) => c.label).join(" | ")}`);
  console.log(`  sentences: ${sentences(final.answer.answer)}${final.trace.some((t) => t.full_text_only) ? ", search ran full text only" : ""}`);
  console.log(`  viz: ${final.answer.viz.type}, confidence: ${final.answer.confidence}, sources: ${final.answer.sources.map((s) => s.id).join(", ")}`);
  console.log(`  answer: ${final.answer.answer}`);
  if (final.answer.could_not_verify) console.log(`  not verified: ${final.answer.could_not_verify}`);
  if (final.checks.unknown_chunk_ids.length || final.checks.refs_without_source.length) console.log(`  grounding: ${JSON.stringify(final.checks)}`);
  if (recordCache && ok && SUGGESTED.includes(c.question)) {
    record(c.question, events);
    console.log("  recorded to data/cache");
  }
}

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
console.log(`\n${passed}/${total} checks passed. Average latency ${(avg(runs.map((r) => r.latency)) / 1000).toFixed(1)}s, average cost $${avg(runs.map((r) => r.cost)).toFixed(4)} per question.`);
if (recordCache) saveQueryCache();
await sql.end();
process.exit(passed === total ? 0 : 1);

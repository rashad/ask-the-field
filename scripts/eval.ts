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

const CASES: { question: string; checks: Check[] }[] = [
  {
    question: SUGGESTED[0],
    checks: [
      ["viz is ranked bars", (f) => f.answer.viz.type === "bar"],
      ["bars led by W-38 and W-23", (f) => { const top = bars(f).slice(0, 2).map((b) => b.label).join(" "); return top.includes("W-38") && top.includes("W-23"); }],
    ],
  },
  {
    question: SUGGESTED[1],
    checks: [
      ["viz is a map", (f) => f.answer.viz.type === "map"],
      ["highlights exactly W-05, W-12, W-25, W-34, W-36", (f) => highlighted(f).join(",") === "W-05,W-12,W-25,W-34,W-36"],
    ],
  },
  {
    question: SUGGESTED[2],
    checks: [
      ["viz is a line", (f) => f.answer.viz.type === "line"],
      ["line is for Field B", (f, calls) => series(f).some((s) => s.name.includes("Field B")) || calls.some((c) => c.name === "query_production" && args(c).field === "Field B" && args(c).metric === "water_cut")],
    ],
  },
  {
    question: SUGGESTED[3],
    checks: [
      ["cites the ESP trip incident note (IN-032)", (f) => f.answer.sources.some((s) => s.id.startsWith("IN-032"))],
      ["answer dates the event in March 2026", (f) => /March|2026-03/.test(f.answer.answer) && /2026/.test(f.answer.answer)],
    ],
  },
  {
    question: "Is the sand alarm in Bayda still open?",
    checks: [
      ["uses the Bayda field filter", (_, calls) => calls.some((c) => args(c).field === "Bayda")],
      ["finds the open W-34 alarm", (f, _, results) => /W-34/.test(f.answer.answer) && /open/i.test(f.answer.answer) && JSON.stringify(results).includes("EV-0180")],
      ["cites the sand alarm incident note (IN-067)", (f) => f.answer.sources.some((s) => s.id.startsWith("IN-067"))],
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

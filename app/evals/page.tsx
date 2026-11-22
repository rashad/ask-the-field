import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { MODEL } from "@/lib/answer";
import { longDate } from "@/lib/domain";
import { SUGGESTED } from "@/lib/questions";

export const metadata: Metadata = { title: "Evals", description: "How Ask the Field is tested: the five briefing questions, three runs each, across six models." };

interface Summary {
  status: string;
  checks_passed: number;
  checks_total: number;
  per_question: { question: number; passed: number; total: number; runs?: number }[];
  failures: Record<string, number>;
  latency_ms_mean: number;
  latency_ms_max: number;
  steps_mean: number;
  tool_calls_mean: number;
  cost_usd_mean: number;
  cost_usd_total?: number;
  status_note?: string;
}
interface Run { date: string; model: string; runs: number; command?: string; summary: Summary; results?: { question: number; checks: { name: string; pass: boolean }[] }[] }

// No JSON exists for this run: the script writes one only at the end and the owner stopped it. Figures come from evals/README.md and evals/2026-11-22-google-gemini-4-argon.partial.log.
const GEMINI_STOPPED: Run = {
  date: "2026-11-22",
  model: "google/gemini-4-argon",
  runs: 3,
  summary: {
    status: "interrupted",
    status_note: "Stopped: over 11 min for 15 questions",
    checks_passed: 101,
    checks_total: 101,
    per_question: [{ question: 1, passed: 21, total: 21 }, { question: 2, passed: 21, total: 21 }, { question: 3, passed: 24, total: 24 }, { question: 4, passed: 21, total: 21 }, { question: 5, passed: 14, total: 14, runs: 2 }],
    failures: {},
    latency_ms_mean: 57900,
    latency_ms_max: 108000,
    steps_mean: 3.36,
    tool_calls_mean: 3.93,
    cost_usd_mean: 0.0702,
  },
};

const SHORT = ["Open incidents", "W-17 outage", "Repeat failure", "Wadi water cut", "Sand alarm"];
const DIR = path.join(process.cwd(), "evals");

function load(): Run[] {
  const saved = readdirSync(DIR).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(readFileSync(path.join(DIR, f), "utf8")) as Run);
  const rank = (r: Run) => (r.model === MODEL ? 0 : r.summary.status === "ok" ? 1 : r.summary.status === "interrupted" ? 2 : 3);
  const order = (r: Run) => [rank(r), r.model.startsWith("claude-") ? 0 : 1] as const;
  return [...saved, GEMINI_STOPPED].sort((a, b) => order(a)[0] - order(b)[0] || order(a)[1] - order(b)[1]);
}

const s1 = (ms: number) => `${(ms / 1000).toFixed(1)} s`;
const usd = (x: number) => `$${x.toFixed(4)}`;
const pct = (s: Summary) => `${s.checks_passed}/${s.checks_total}${s.checks_total ? ` (${Number(((100 * s.checks_passed) / s.checks_total).toFixed(1))}%)` : ""}`;
const route = (m: string) => (m.startsWith("claude-") ? "Anthropic direct" : "OpenRouter");
const noTools = (r: Run) => r.summary.tool_calls_mean === 0;
const note = (r: Run) => [route(r.model), r.summary.status_note ?? (noTools(r) ? "No tool call in any run" : null)].filter(Boolean).join(" · ");
const checksCell = (r: Run) => (r.summary.status === "interrupted" ? `${r.summary.checks_passed}/${r.summary.checks_total} in ${r.summary.per_question.reduce((a, q) => a + (q.runs ?? r.runs), 0)} of ${SUGGESTED.length * r.runs} runs` : pct(r.summary));

function checkNames(run: Run) {
  const byQ = new Map<number, string[]>();
  for (const r of run.results ?? []) if (!byQ.has(r.question)) byQ.set(r.question, r.checks.map((c) => c.name));
  const lists = [...byQ.values()];
  const shared = lists[0]?.filter((name) => lists.every((l) => l.includes(name))) ?? [];
  return { shared, per: [...byQ.entries()].sort((a, b) => a[0] - b[0]).map(([q, l]) => [q, l.filter((x) => !shared.includes(x))] as const), sizes: lists.map((l) => l.length) };
}

export default function Evals() {
  const runs = load();
  const prod = runs.find((r) => r.model === MODEL) ?? runs[0];
  const p = prod.summary;
  const perRound = p.checks_total / prod.runs;
  const { shared, per, sizes } = checkNames(prod);
  const minC = Math.min(...sizes), maxC = Math.max(...sizes);
  const missed = runs.filter((r) => !noTools(r) && Object.keys(r.summary.failures).length);
  const silent = runs.filter(noTools);
  const spend = (claude: boolean) => runs.filter((r) => r.summary.cost_usd_total !== undefined && r.model.startsWith("claude-") === claude).reduce((a, r) => a + r.summary.cost_usd_total!, 0);
  return (
    <div className="page">
      <p className="eyebrow">Quality · {longDate(prod.date)}</p>
      <h1 className="h1">Evals</h1>
      <p className="lede">The {SUGGESTED.length} briefing questions, {prod.runs} runs each, through the same code path as the app: the same system prompt, the same four tools, at most 4 steps. That is {perRound} checks per round and {p.checks_total} per model.</p>
      <dl className="kpis">
        <div className="tile"><dt>Checks passed</dt><dd className="mono">{p.checks_passed}/{p.checks_total}</dd><span className="sub">{prod.model}, the model in production</span></div>
        <div className="tile"><dt>Mean latency</dt><dd>{(p.latency_ms_mean / 1000).toFixed(1)}<small>s</small></dd><span className="sub">Max {s1(p.latency_ms_max)}, per question</span></div>
        <div className="tile"><dt>Cost per question</dt><dd>{usd(p.cost_usd_mean)}</dd><span className="sub">Mean, with prompt caching</span></div>
        <div className="tile"><dt>Tool calls</dt><dd>{p.tool_calls_mean.toFixed(2)}</dd><span className="sub">Mean per question, {p.steps_mean.toFixed(2)} steps</span></div>
      </dl>

      <section className="block" aria-labelledby="cmp">
        <div className="sec-h"><h2 id="cmp">{runs.length} models, one harness</h2><span>Means are per question</span></div>
        <div className="tbl-w"><table className="tbl">
          <thead><tr><th>Model</th><th className="num-c">Checks passed</th><th className="num-c">Mean latency</th><th className="num-c">Max latency</th><th className="num-c">Tool calls</th><th className="num-c">Cost per question</th></tr></thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.model} className={r === prod ? "prod" : undefined}>
                <td><span className="m">{r.model}</span>{r === prod && <span className="tag">In production</span>}<span className="note">{note(r)}</span></td>
                <td className="num-c" data-l="Checks passed">{checksCell(r)}</td>
                <td className="num-c" data-l="Mean latency">{s1(r.summary.latency_ms_mean)}</td>
                <td className="num-c" data-l="Max latency">{s1(r.summary.latency_ms_max)}</td>
                <td className="num-c" data-l="Tool calls">{r.summary.tool_calls_mean ? r.summary.tool_calls_mean.toFixed(2) : "0"}</td>
                <td className="num-c" data-l="Cost per question">{usd(r.summary.cost_usd_mean)}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
        <p className="prose s">Claude models go direct to Anthropic. The others go through OpenRouter. Every row comes from the JSON that <span className="mono">--save</span> wrote, except {GEMINI_STOPPED.model}: that run was stopped before the script wrote its JSON, so its row comes from the console log. The saved runs cost ${spend(true).toFixed(2)} on Anthropic and ${spend(false).toFixed(2)} on OpenRouter.</p>
      </section>

      <section className="block" aria-labelledby="pq">
        <div className="sec-h"><h2 id="pq">Results per question</h2><span>Checks passed over {prod.runs} runs</span></div>
        <div className="tbl-w"><table className="tbl">
          <thead><tr><th>Model</th>{SHORT.map((t, i) => <th key={t} className="num-c">Q{i + 1} {t}</th>)}</tr></thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.model}>
                <td><span className="m">{r.model}</span></td>
                {r.summary.per_question.map((q) => {
                  const text = `${q.passed}/${q.total}${q.runs ? ` (${q.runs} runs)` : ""}`;
                  return <td key={q.question} className="num-c m" data-l={`Q${q.question} ${SHORT[q.question - 1]}`}>{q.passed < q.total ? <span className="miss" title="Some checks failed">{text}</span> : text}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table></div>
        <div className="prose s">
          {missed.map((r) => (
            <p key={r.model}><b className="mono">{r.model}</b> missed {Object.entries(r.summary.failures).map(([name, k]) => `"${name}" in ${k} of ${r.runs} runs`).join(" and ")}.</p>
          ))}
          {silent.length > 0 && <p><b>{silent.map((r) => r.model).join(" and ")}</b> returned the structured answer in the first step without a tool call, in all {SUGGESTED.length * silent[0].runs} runs each. Their answers hold no data from the database. The checks they passed are ones an answer can meet without data.</p>}
        </div>
      </section>

      <section className="block" aria-labelledby="chk">
        <div className="sec-h"><h2 id="chk">What the checks assert</h2><span>{minC === maxC ? minC : `${minC} or ${maxC}`} checks per question in the saved run</span></div>
        <div className="checks">
          <div className="card wide"><h3>{shared.length} checks on every question</h3><ul>{shared.map((c) => <li key={c}>{c[0].toUpperCase() + c.slice(1)}.</li>)}</ul></div>
          {per.map(([q, list], i) => (
            <div key={q} className={`card${i === per.length - 1 && per.length % 2 ? " wide" : ""}`}>
              <h3><span className="m">Q{q}</span>{SUGGESTED[q - 1]}</h3>
              <ul>{list.map((c) => <li key={c}>{c[0].toUpperCase() + c.slice(1)}.</li>)}</ul>
            </div>
          ))}
        </div>
        <p className="prose s">These are the checks of the saved run on {longDate(prod.date)}. The eval script has gained checks since then (marker and source consistency, ids returned by a tool); a new run with <span className="mono">--save</span> records them.</p>
      </section>

      <section className="block" aria-labelledby="not">
        <div className="sec-h"><h2 id="not">What the eval does not measure</h2></div>
        <div className="limits">
          <div><h3>Only the five briefing questions</h3><p>The system prompt carries guidance for these five questions. Free questions use only the general rules, and the eval does not measure them.</p></div>
          <div><h3>Assertions fit this dataset</h3><p>They name wells, notes and a batch of this synthetic data. They say nothing about real fields.</p></div>
          <div><h3>Easier than real documents</h3><p>An LLM wrote the 400 documents from the structured data. They agree with it by construction, so retrieval is easier than on real reports.</p></div>
          <div><h3>Costs differ by route</h3><p>Prompt caching, effort and token counts differ by provider. They do not compare one to one across models, and latency on OpenRouter varies with the upstream provider.</p></div>
        </div>
      </section>

      <section className="block" aria-labelledby="run">
        <div className="sec-h"><h2 id="run">Run it yourself</h2><span>Needs a loaded database and API keys</span></div>
        <div className="code">
          {[...new Set([prod, ...runs].map((r) => r.command).filter(Boolean))].slice(0, 2).map((c) => <div key={c}><span>$</span>{c}</div>)}
          <div><span>$</span>pnpm eval --only=1,3</div>
          <div><span>$</span>pnpm test</div>
        </div>
        <p className="prose s"><span className="mono">--save</span> writes <span className="mono">evals/&lt;date&gt;-&lt;model&gt;.json</span> with every run. <span className="mono">pnpm test</span> runs the unit tests for the chunker, the chart builder, the quote check and the request guard. It needs no key and no database.</p>
      </section>
    </div>
  );
}

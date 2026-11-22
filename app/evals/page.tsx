import path from "node:path";
import type { Metadata } from "next";
import { MODEL } from "@/lib/answer";
import { longDate, MAX_STEPS } from "@/lib/domain";
import { board, checkNames, loadRuns, questionCells, secs, usd, type Run } from "@/lib/evals";
import { SUGGESTED } from "@/lib/questions";

export const metadata: Metadata = { title: "Evals", description: `How Ask the Field is tested: the ${SUGGESTED.length} briefing questions, asked of several models through the same harness.` };

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

const pct = (s: Run["summary"]) => `${s.checks_passed}/${s.checks_total}${s.checks_total ? ` (${Number(((100 * s.checks_passed) / s.checks_total).toFixed(1))}%)` : ""}`;
const route = (m: string) => (m.startsWith("claude-") ? "Anthropic direct" : "OpenRouter");
const noTools = (r: Run) => r.summary.tool_calls_mean === 0;
const note = (r: Run) => [route(r.model), r.summary.status_note ?? (noTools(r) ? "No tool call in any run" : null)].filter(Boolean).join(" · ");
const checksCell = (r: Run) => (r.summary.status === "interrupted" ? `${r.summary.checks_passed}/${r.summary.checks_total} in ${r.summary.per_question.reduce((a, q) => a + (q.runs ?? r.runs), 0)} of ${SUGGESTED.length * r.runs} runs` : pct(r.summary));
const fixed = (x: number | null) => (x === null ? "n/a" : x ? x.toFixed(2) : "0");

export default function Evals() {
  const { runs, prod } = board(loadRuns(path.join(process.cwd(), "evals")), MODEL, [GEMINI_STOPPED]);
  if (!runs.length) {
    return (
      <div className="page">
        <p className="eyebrow">Quality</p>
        <h1 className="h1">Evals</h1>
        <p className="lede">No saved eval run yet. Run <span className="mono">pnpm eval --save</span> to write one to <span className="mono">evals/</span>.</p>
      </div>
    );
  }
  const p = prod?.summary;
  const ref = prod?.results?.length ? prod : runs.find((r) => r.results?.length) ?? null;
  const { shared, per, range } = ref ? checkNames(ref) : { shared: [], per: [], range: null };
  const missed = runs.filter((r) => !noTools(r) && Object.keys(r.summary.failures ?? {}).length);
  const silent = runs.filter(noTools);
  const spend = (claude: boolean) => runs.filter((r) => r.model.startsWith("claude-") === claude).reduce((a, r) => a + (r.summary.cost_usd_total ?? 0), 0);
  const stoppedShown = runs.includes(GEMINI_STOPPED);
  const commands = [...new Set([prod, ...runs].map((r) => r?.command).filter((c): c is string => !!c))].slice(0, 2);
  return (
    <div className="page">
      <p className="eyebrow">Quality · {longDate((prod ?? runs[0]).date)}</p>
      <h1 className="h1">Evals</h1>
      <p className="lede">The {SUGGESTED.length} briefing questions{prod ? `, ${prod.runs} runs each,` : ""} through the same code path as the app: the same system prompt, the same four tools, at most {MAX_STEPS} steps.{prod && p ? ` That is ${p.checks_total / prod.runs} checks per round and ${p.checks_total} per model.` : ""}</p>
      {prod && p && (
        <dl className="kpis">
          <div className="tile"><dt>Checks passed</dt><dd className="mono">{p.checks_passed}/{p.checks_total}</dd><span className="sub">{prod.model}, the model in production</span></div>
          <div className="tile"><dt>Mean latency</dt><dd>{p.latency_ms_mean === null ? "n/a" : <>{(p.latency_ms_mean / 1000).toFixed(1)}<small>s</small></>}</dd><span className="sub">Max {secs(p.latency_ms_max)}, per question</span></div>
          <div className="tile"><dt>Cost per question</dt><dd>{usd(p.cost_usd_mean)}</dd><span className="sub">Mean, with prompt caching</span></div>
          <div className="tile"><dt>Tool calls</dt><dd>{fixed(p.tool_calls_mean)}</dd><span className="sub">Mean per question, {fixed(p.steps_mean)} steps</span></div>
        </dl>
      )}

      <section className="block" aria-labelledby="cmp">
        <div className="sec-h"><h2 id="cmp">{runs.length} {runs.length === 1 ? "model" : "models"}, one harness</h2><span>Means are per question</span></div>
        <div className="tbl-w"><table className="tbl">
          <thead><tr><th>Model</th><th className="num-c">Checks passed</th><th className="num-c">Mean latency</th><th className="num-c">Max latency</th><th className="num-c">Tool calls</th><th className="num-c">Cost per question</th></tr></thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.model} className={r === prod ? "prod" : undefined}>
                <td><span className="m">{r.model}</span>{r === prod && <span className="tag">In production</span>}<span className="note">{note(r)}</span></td>
                <td className="num-c" data-l="Checks passed">{checksCell(r)}</td>
                <td className="num-c" data-l="Mean latency">{secs(r.summary.latency_ms_mean)}</td>
                <td className="num-c" data-l="Max latency">{secs(r.summary.latency_ms_max)}</td>
                <td className="num-c" data-l="Tool calls">{fixed(r.summary.tool_calls_mean)}</td>
                <td className="num-c" data-l="Cost per question">{usd(r.summary.cost_usd_mean)}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
        <p className="prose s">Claude models go direct to Anthropic. The others go through OpenRouter. Every row comes from the JSON that <span className="mono">--save</span> wrote{stoppedShown ? <>, except {GEMINI_STOPPED.model}: that run was stopped before the script wrote its JSON, so its row comes from the console log</> : null}. The saved runs cost ${spend(true).toFixed(2)} on Anthropic and ${spend(false).toFixed(2)} on OpenRouter.</p>
      </section>

      <section className="block" aria-labelledby="pq">
        <div className="sec-h"><h2 id="pq">Results per question</h2><span>Checks passed{prod ? ` over ${prod.runs} runs` : ""}</span></div>
        <div className="tbl-w"><table className="tbl">
          <thead><tr><th>Model</th>{SHORT.map((t, i) => <th key={t} className="num-c">Q{i + 1} {t}</th>)}</tr></thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.model}>
                <td><span className="m">{r.model}</span></td>
                {questionCells(r, SUGGESTED.length).map((c) => (
                  <td key={c.question} className="num-c m" data-l={`Q${c.question} ${SHORT[c.question - 1]}`}>{c.miss ? <span className="miss" title="Some checks failed">{c.text}</span> : c.text}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table></div>
        <div className="prose s">
          {missed.map((r) => (
            <p key={r.model}><b className="mono">{r.model}</b> missed {Object.entries(r.summary.failures ?? {}).map(([name, k]) => `"${name}" in ${k} of ${r.runs} runs`).join(" and ")}.</p>
          ))}
          {silent.length > 0 && <p><b>{silent.map((r) => r.model).join(" and ")}</b> returned the structured answer in the first step without a tool call, in {new Set(silent.map((r) => r.runs)).size === 1 ? `all ${SUGGESTED.length * silent[0].runs} runs each` : "every run"}. Their answers hold no data from the database. The checks they passed are ones an answer can meet without data.</p>}
        </div>
      </section>

      {ref && range && (
        <section className="block" aria-labelledby="chk">
          <div className="sec-h"><h2 id="chk">What the checks assert</h2><span>{range[0] === range[1] ? range[0] : `${range[0]} or ${range[1]}`} checks per question in the saved run</span></div>
          <div className="checks">
            <div className="card wide"><h3>{shared.length} checks on every question</h3><ul>{shared.map((c) => <li key={c}>{c[0].toUpperCase() + c.slice(1)}.</li>)}</ul></div>
            {per.map(([q, list], i) => (
              <div key={q} className={`card${i === per.length - 1 && per.length % 2 ? " wide" : ""}`}>
                <h3><span className="m">Q{q}</span>{SUGGESTED[q - 1]}</h3>
                <ul>{list.map((c) => <li key={c}>{c[0].toUpperCase() + c.slice(1)}.</li>)}</ul>
              </div>
            ))}
          </div>
          <p className="prose s">These are the checks of the saved {ref.model} run on {longDate(ref.date)}. The eval script has gained checks since then (marker and source consistency, ids returned by a tool); a new run with <span className="mono">--save</span> records them.</p>
        </section>
      )}

      <section className="block" aria-labelledby="not">
        <div className="sec-h"><h2 id="not">What the eval does not measure</h2></div>
        <div className="limits">
          <div><h3>Only the {SUGGESTED.length} briefing questions</h3><p>The system prompt carries guidance for these questions. Free questions use only the general rules, and the eval does not measure them.</p></div>
          <div><h3>Assertions fit this dataset</h3><p>They name wells, notes and a batch of this synthetic data. They say nothing about real fields.</p></div>
          <div><h3>Easier than real documents</h3><p>An LLM wrote the documents from the structured data. They agree with it by construction, so retrieval is easier than on real reports.</p></div>
          <div><h3>Costs differ by route</h3><p>Prompt caching, effort and token counts differ by provider. They do not compare one to one across models, and latency on OpenRouter varies with the upstream provider.</p></div>
        </div>
      </section>

      <section className="block" aria-labelledby="run">
        <div className="sec-h"><h2 id="run">Run it yourself</h2><span>Needs a loaded database and API keys</span></div>
        <div className="code">
          {commands.map((c) => <div key={c}><span>$</span>{c}</div>)}
          <div><span>$</span>pnpm eval --only=1,3</div>
          <div><span>$</span>pnpm test</div>
        </div>
        <p className="prose s"><span className="mono">--save</span> writes <span className="mono">evals/&lt;date&gt;-&lt;model&gt;.json</span> with every run. <span className="mono">pnpm test</span> runs the unit tests for the chunker, the chart builder, the quote check, the request guard, the eval loader and the source matcher. It needs no key and no database.</p>
      </section>
    </div>
  );
}

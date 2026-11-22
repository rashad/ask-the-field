import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

export interface Summary {
  status: string;
  checks_passed: number;
  checks_total: number;
  per_question: { question: number; passed: number; total: number; runs?: number }[];
  failures?: Record<string, number>;
  latency_ms_mean: number | null;
  latency_ms_max: number | null;
  steps_mean: number | null;
  tool_calls_mean: number | null;
  cost_usd_mean: number | null;
  cost_usd_total?: number | null;
  status_note?: string;
}
export interface Run { date: string; model: string; runs: number; command?: string; summary: Summary; results?: { question: number; checks: { name: string; pass: boolean }[] }[] }

export function loadRuns(dir: string): Run[] {
  if (!existsSync(dir)) return [];
  const latest = new Map<string, Run>();
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
    let run: Run;
    try { run = JSON.parse(readFileSync(path.join(dir, f), "utf8")); } catch { continue; }
    if (!run?.summary || typeof run.model !== "string") continue;
    const seen = latest.get(run.model);
    if (!seen || run.date >= seen.date) latest.set(run.model, run);
  }
  return [...latest.values()];
}

export function board(saved: Run[], model: string, stopped: Run[]) {
  const runs = [...saved, ...stopped.filter((s) => !saved.some((r) => r.model === s.model))];
  const rank = (r: Run) => (r.model === model ? 0 : r.summary.status === "ok" ? 1 : r.summary.status === "interrupted" ? 2 : 3);
  const vendor = (r: Run) => (r.model.startsWith("claude-") ? 0 : 1);
  runs.sort((a, b) => rank(a) - rank(b) || vendor(a) - vendor(b));
  return { runs, prod: runs.find((r) => r.model === model) ?? null };
}

export function checkNames(run: Run) {
  const byQ = new Map<number, string[]>();
  for (const r of run.results ?? []) if (!byQ.has(r.question)) byQ.set(r.question, r.checks.map((c) => c.name));
  const lists = [...byQ.values()];
  const shared = lists[0]?.filter((name) => lists.every((l) => l.includes(name))) ?? [];
  const sizes = lists.map((l) => l.length);
  return {
    shared,
    per: [...byQ.entries()].sort((a, b) => a[0] - b[0]).map(([q, l]) => [q, l.filter((x) => !shared.includes(x))] as const),
    range: sizes.length ? ([Math.min(...sizes), Math.max(...sizes)] as const) : null,
  };
}

export function questionCells(run: Run, questions: number) {
  return Array.from({ length: questions }, (_, i) => {
    const q = run.summary.per_question.find((x) => x.question === i + 1);
    if (!q) return { question: i + 1, text: "n/a", miss: false };
    return { question: i + 1, text: `${q.passed}/${q.total}${q.runs ? ` (${q.runs} runs)` : ""}`, miss: q.passed < q.total };
  });
}

export const secs = (ms: number | null) => (ms === null ? "n/a" : `${(ms / 1000).toFixed(1)} s`);
export const usd = (x: number | null) => (x === null ? "n/a" : `$${x.toFixed(4)}`);

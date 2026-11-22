import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { board, checkNames, loadRuns, questionCells, usd, type Run } from "./evals";

const summary = (over: Partial<Run["summary"]> = {}): Run["summary"] => ({
  status: "ok", checks_passed: 4, checks_total: 4, per_question: [{ question: 1, passed: 2, total: 2 }, { question: 2, passed: 1, total: 2 }],
  failures: {}, latency_ms_mean: 9000, latency_ms_max: 12000, steps_mean: 2, tool_calls_mean: 2, cost_usd_mean: 0.02, ...over,
});
const run = (model: string, date = "2026-11-22", over: Partial<Run> = {}): Run => ({ date, model, runs: 1, summary: summary(), ...over });

function folder(files: Record<string, unknown>) {
  const dir = mkdtempSync(path.join(tmpdir(), "evals-"));
  for (const [name, body] of Object.entries(files)) writeFileSync(path.join(dir, name), typeof body === "string" ? body : JSON.stringify(body));
  return dir;
}

test("a null mean cost loads and prints n/a", () => {
  const [r] = loadRuns(folder({ "a.json": run("m", "2026-11-22", { summary: summary({ cost_usd_mean: null, latency_ms_mean: null }) }) }));
  assert.equal(r.summary.cost_usd_mean, null);
  assert.equal(usd(r.summary.cost_usd_mean), "n/a");
  assert.equal(usd(0.02714), "$0.0271");
});

test("keeps only the latest run of a model saved on two dates", () => {
  const runs = loadRuns(folder({ "2026-11-23-m.json": run("m", "2026-11-23"), "2026-11-22-m.json": run("m", "2026-11-22"), "x.json": run("x") }));
  assert.deepEqual(runs.map((r) => `${r.model} ${r.date}`).sort(), ["m 2026-11-23", "x 2026-11-22"]);
});

test("skips files that do not parse or have no summary, and a missing folder gives no run", () => {
  assert.deepEqual(loadRuns(folder({ "bad.json": "{", "empty.json": { model: "m" }, "notes.md": "x" })), []);
  assert.deepEqual(loadRuns(path.join(tmpdir(), "no-such-evals-folder")), []);
});

test("a saved run of the stopped model replaces the typed constant", () => {
  const saved = [run("g", "2026-11-24", { summary: summary({ status: "ok", status_note: undefined }) })];
  const { runs } = board(saved, "m", [run("g", "2026-11-22", { summary: summary({ status: "interrupted" }) })]);
  assert.equal(runs.length, 1);
  assert.equal(runs[0].date, "2026-11-24");
  assert.equal(board([], "m", [run("g")]).runs.length, 1);
});

test("the production model ranks first, then ok runs, Claude first, then the rest", () => {
  const saved = [run("other/x", "d", { summary: summary({ status: "unsupported" }) }), run("other/ok"), run("claude-b"), run("claude-a")];
  const { runs, prod } = board(saved, "claude-a", [run("g", "d", { summary: summary({ status: "interrupted" }) })]);
  assert.deepEqual(runs.map((r) => r.model), ["claude-a", "claude-b", "other/ok", "g", "other/x"]);
  assert.equal(prod?.model, "claude-a");
});

test("no production row when the configured model has no run", () => {
  const { runs, prod } = board([run("claude-b"), run("other/ok")], "claude-a", []);
  assert.equal(prod, null);
  assert.equal(runs[0].model, "claude-b");
});

test("a run without results has no check names and no Infinity", () => {
  const names = checkNames(run("m"));
  assert.deepEqual(names, { shared: [], per: [], range: null });
});

test("check names split into shared and per question", () => {
  const r = run("m", "d", { results: [
    { question: 2, checks: [{ name: "a", pass: true }, { name: "q2", pass: true }] },
    { question: 1, checks: [{ name: "a", pass: true }, { name: "q1", pass: false }, { name: "q1b", pass: true }] },
    { question: 1, checks: [{ name: "a", pass: true }] },
  ] });
  assert.deepEqual(checkNames(r), { shared: ["a"], per: [[1, ["q1", "q1b"]], [2, ["q2"]]], range: [2, 3] });
});

test("per-question cells cover every question and flag misses", () => {
  const r = run("m", "d", { summary: summary({ per_question: [{ question: 1, passed: 2, total: 2 }, { question: 3, passed: 1, total: 2, runs: 2 }] }) });
  assert.deepEqual(questionCells(r, 3), [
    { question: 1, text: "2/2", miss: false },
    { question: 2, text: "n/a", miss: false },
    { question: 3, text: "1/2 (2 runs)", miss: true },
  ]);
});

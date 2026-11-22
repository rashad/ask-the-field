import assert from "node:assert/strict";
import { test } from "node:test";
import { buildChart } from "./chart";
import type { ToolRun } from "./tools";

const runs: ToolRun[] = [
  { ref: "E1", name: "list_events", output: { events: [
    { event_id: "EV-1", well_id: "W-09", start_date: "2025-10-21", lost_oil_bbl: 100, lost_revenue_usd: 7000, downtime_hours: 10 },
    { event_id: "EV-2", well_id: "W-09", start_date: "2025-10-27", lost_oil_bbl: 50, lost_revenue_usd: 3500, downtime_hours: 5 },
  ] } },
  { ref: "P1", name: "query_production", output: { metric: "water_cut", unit: "fraction", series: [{ name: "Wadi Field", points: [{ x: "2026-01-01", y: 0.3 }] }] } },
];

test("event bars sum the grouped rows on the server", () => {
  const { chart, error } = buildChart({ type: "bar", title: "t", ref: "E1", metric: "lost_oil_bbl", wells: [], event_groups: [["EV-1", "EV-2"]] }, runs);
  assert.equal(error, null);
  assert.deepEqual(chart?.type === "bar" && chart.bars, [{ label: "W-09, Oct 2025", value: 150, ids: ["EV-1", "EV-2"] }]);
});

test("line copies the referenced series", () => {
  const { chart } = buildChart({ type: "line", title: "t", ref: "P1", metric: "water_cut", series: [] }, runs);
  assert.equal(chart?.type === "line" && chart.series[0].points[0].y, 0.3);
});

test("an invalid reference gives no chart and an error", () => {
  for (const req of [
    { type: "line", title: "t", ref: "P9", metric: "water_cut", series: [] },
    { type: "line", title: "t", ref: "P1", metric: "oil", series: [] },
    { type: "bar", title: "t", ref: "E1", metric: "lost_oil_bbl", wells: [], event_groups: [["EV-404"]] },
    { type: "bar", title: "t", ref: "E1", metric: "change", wells: [], event_groups: [] },
    { type: "line", title: "t", ref: "E1", metric: "oil", series: [] },
  ] as const) {
    const r = buildChart(req as never, runs);
    assert.equal(r.chart, null);
    assert.ok(r.error);
  }
});

const wells: ToolRun[] = [{ ref: "P1", name: "query_production", output: { unit: "fraction", rows: [
  { well_id: "W-17", value: 0.5, change: 0.2, change_pct: 40 },
  { well_id: "W-18", value: 0.3, change: -0.1, change_pct: -25 },
  { well_id: "W-19", value: 0.1, change: 0.1, change_pct: null },
  { well_id: "W-20", value: 0.2 },
] } }];

test("change bars keep the requested direction and skip rows with no value", () => {
  const bars = (direction: "drops" | "rises" | null) => {
    const { chart } = buildChart({ type: "bar", title: "t", ref: "P1", metric: "change_pct", wells: [], event_groups: [], direction }, wells);
    return chart?.type === "bar" ? chart.bars.map((b) => b.label) : null;
  };
  assert.deepEqual(bars("rises"), ["W-17", "W-18"]);
  assert.deepEqual(bars(null), ["W-18", "W-17"]);
});

test("a named well with no value still fails", () => {
  const r = buildChart({ type: "bar", title: "t", ref: "P1", metric: "change_pct", wells: ["W-19"], event_groups: [] }, wells);
  assert.equal(r.chart, null);
});

test("event bars skip events with no lost oil when no group is named", () => {
  const withNull: ToolRun[] = [{ ref: "E1", name: "list_events", output: { events: [
    { event_id: "EV-1", well_id: "W-40", start_date: "2026-01-02", lost_oil_bbl: null, lost_revenue_usd: null, downtime_hours: null },
    { event_id: "EV-2", well_id: "W-09", start_date: "2025-10-27", lost_oil_bbl: 50, lost_revenue_usd: 3500, downtime_hours: 5 },
  ] } }];
  const { chart } = buildChart({ type: "bar", title: "t", ref: "E1", metric: "lost_oil_bbl", wells: [], event_groups: [] }, withNull);
  assert.deepEqual(chart?.type === "bar" && chart.bars.map((b) => b.ids[0]), ["EV-2"]);
});

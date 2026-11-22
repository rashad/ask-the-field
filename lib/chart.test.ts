import assert from "node:assert/strict";
import { test } from "node:test";
import { buildChart, type ToolRun } from "./chart";

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

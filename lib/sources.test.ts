import assert from "node:assert/strict";
import { test } from "node:test";
import { coveredEvents, producer, type ToolStep } from "./sources";

const ev = (id: string) => ({ event_id: id });
const steps: ToolStep[] = [
  { name: "list_events", args: {}, output: { ref: "E1", events: [ev("EV-0092"), ev("EV-0094")] } },
  { name: "query_production", args: { field: "Wadi Field", from: "2026-01-01", to: "2026-06-30" }, output: { ref: "P1" } },
  { name: "query_production", args: { field: "Wadi Field", from: "2026-01-01", to: "2026-11-22" }, output: { ref: "P2" } },
  { name: "query_production", args: { well_ids: ["W-17"], from: "2026-03-01", to: "2026-03-31" }, output: { ref: "P3", repeated: true } },
  { name: "get_wells", args: {}, output: { ref: "W1", wells: [{ well_id: "W-17" }] } },
];
const ref = (id: string) => producer(id, steps)?.output?.ref;

test("maps a table source id to the tool call that returned its rows", () => {
  assert.equal(ref("events:EV-0094"), "E1");
  assert.equal(ref("wells:W-17"), "W1");
  assert.equal(ref("events:EV-0001"), undefined);
});

test("a production source takes the call with its date range, else the first call that fits", () => {
  assert.equal(ref("production_daily:Wadi Field:2026-01-01..2026-11-22"), "P2");
  assert.equal(ref("production_daily:Wadi Field:2025-01-01..2025-02-01"), "P1");
  assert.equal(ref("production_daily:W-17:2026-03-01..2026-03-31"), undefined);
});

test("a source covers the events its label names or spans, when the tool returned them", () => {
  const rows = ["EV-0179", "EV-0180", "EV-0182", "EV-0184", "EV-0190"].map(ev);
  assert.deepEqual(coveredEvents("EV-0179", "Open incident events EV-0179 to EV-0184", rows).map((r) => r.event_id), ["EV-0179", "EV-0180", "EV-0182", "EV-0184"]);
  assert.deepEqual(coveredEvents("EV-0092", "W-17 ESP trip and EV-0094 workover (17,942 bbl)", [ev("EV-0092"), ev("EV-0094"), ev("EV-0095")]).map((r) => r.event_id), ["EV-0092", "EV-0094"]);
  assert.deepEqual(coveredEvents("EV-0092", "W-17 ESP trip and EV-0094 workover", [ev("EV-0092")]).map((r) => r.event_id), ["EV-0092"]);
});

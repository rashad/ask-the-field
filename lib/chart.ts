import { sql } from "./db";
import { monthYear } from "./domain";
import type { EventRow, ToolRun } from "./tools";

export const BAR_METRICS = ["value", "change", "change_pct", "lost_oil_bbl", "lost_revenue_usd", "downtime_hours"] as const;
type BarMetric = (typeof BAR_METRICS)[number];

export type ChartRequest =
  | { type: "line"; title: string; ref: string; metric: "oil" | "gas" | "water_cut"; series: string[] }
  | { type: "bar"; title: string; ref: string; metric: BarMetric; wells: string[]; event_groups: string[][]; direction?: "drops" | "rises" | null };

type MapRequest = { type: "map"; title: string; well_ids: string[]; highlighted: string[] };
export type VizRequest = ChartRequest | MapRequest | { type: "none" };

export interface MapWell { well_id: string; field: string; lat: number; lon: number; status: string; highlighted: boolean }

export type Chart =
  | { type: "line"; title: string; unit: string; ref: string; series: { name: string; points: { x: string; y: number }[] }[] }
  | { type: "bar"; title: string; unit: string; ref: string; metric: BarMetric; bars: { label: string; value: number; ids: string[] }[] };

export type FinalViz = Chart | (MapRequest & { wells: MapWell[] }) | { type: "none" };

interface Series { name: string; points: { x: string; y: number }[] }
interface WellRow { well_id: string; value: number; baseline?: number; change?: number; change_pct?: number | null }

const MAX_BARS = 10;
const EVENT_UNIT = { lost_oil_bbl: "bbl", lost_revenue_usd: "USD", downtime_hours: "hours" } as const;

class ChartError extends Error {}
const fail = (msg: string): never => {
  throw new ChartError(msg);
};

function line(req: Extract<ChartRequest, { type: "line" }>, out: { metric?: string; unit?: string; series?: Series[] }): Chart {
  if (!out.series) fail(`${req.ref} is not a production time series`);
  if (out.metric !== req.metric) fail(`${req.ref} holds ${out.metric}, not ${req.metric}`);
  const wanted = req.series.length ? req.series : out.series!.map((s) => s.name);
  const series = wanted.map((name) => out.series!.find((s) => s.name === name) ?? fail(`${req.ref} has no series "${name}"`));
  return { type: "line", title: req.title, unit: out.unit ?? "", ref: req.ref, series: structuredClone(series) };
}

function wellBars(req: Extract<ChartRequest, { type: "bar" }>, out: { unit: string; rows: WellRow[] }): Chart {
  const metric = req.metric;
  if (metric !== "value" && metric !== "change" && metric !== "change_pct") return fail(`${metric} is not a production metric`);
  const named = req.wells.length > 0;
  const rows = named ? req.wells.map((w) => out.rows.find((r) => r.well_id === w) ?? fail(`${req.ref} has no row for ${w}`)) : out.rows;
  const bars = rows.flatMap((r) => {
    const value = r[metric];
    if (typeof value === "number") return [{ label: r.well_id, value, ids: [r.well_id] }];
    return named ? fail(`${req.ref} has no ${metric} for ${r.well_id}`) : [];
  });
  if (!bars.length) fail(`${req.ref} has no ${metric} values`);
  const rises = metric === "value" || req.direction === "rises";
  bars.sort((a, b) => (rises ? b.value - a.value : a.value - b.value));
  const unit = metric === "value" ? out.unit : metric === "change" ? `${out.unit} change` : "% change";
  return { type: "bar", title: req.title, unit, ref: req.ref, metric, bars: bars.slice(0, MAX_BARS) };
}

function eventBars(req: Extract<ChartRequest, { type: "bar" }>, out: { events: EventRow[] }): Chart {
  const metric = req.metric;
  if (metric !== "lost_oil_bbl" && metric !== "lost_revenue_usd" && metric !== "downtime_hours") return fail(`${metric} is not an event metric`);
  const named = req.event_groups.length > 0;
  const groups = named ? req.event_groups : out.events.filter((e) => e[metric] != null).map((e) => [e.event_id]);
  if (!groups.length) fail(`${req.ref} has no ${metric} values`);
  const bars = groups.map((ids) => {
    if (!ids.length) fail("empty event group");
    const rows = ids.map((id) => out.events.find((e) => e.event_id === id) ?? fail(`${req.ref} has no event ${id}`));
    const values = rows.map((e) => e[metric] ?? fail(`${e.event_id} has no ${metric}`));
    const first = rows.reduce((a, b) => (b.start_date < a.start_date ? b : a));
    const wells = [...new Set(rows.map((e) => e.well_id))].join(" and ");
    return { label: `${wells}, ${monthYear(first.start_date, true)}`, value: values.reduce((a, b) => a + b, 0), ids: [...ids] };
  });
  bars.sort((a, b) => b.value - a.value);
  for (const b of bars) if (b.ids.length === 1 && bars.filter((x) => x.label === b.label).length > 1) b.label += ` (${b.ids[0]})`;
  return { type: "bar", title: req.title, unit: EVENT_UNIT[metric], ref: req.ref, metric, bars: bars.slice(0, MAX_BARS) };
}

export function buildChart(req: ChartRequest, runs: ToolRun[]): { chart: Chart | null; error: string | null } {
  try {
    const run = runs.find((r) => r.ref === req.ref) ?? fail(`no tool call with ref ${req.ref} in this request`);
    const out = run.output as Record<string, unknown>;
    if (run.name === "query_production" && req.type === "line") return { chart: line(req, out), error: null };
    if (run.name === "query_production" && req.type === "bar" && Array.isArray(out.rows)) return { chart: wellBars(req, out as never), error: null };
    if (run.name === "list_events" && req.type === "bar") return { chart: eventBars(req, out as never), error: null };
    return fail(`a ${req.type} chart cannot use ${run.name} ${req.ref}`);
  } catch (err) {
    if (err instanceof ChartError) return { chart: null, error: err.message };
    throw err;
  }
}

async function withWells(viz: MapRequest): Promise<FinalViz> {
  const query = (ids: string[]) => sql<Omit<MapWell, "highlighted">[]>`
    SELECT well_id, field, lat, lon, status FROM wells
    ${ids.length ? sql`WHERE field IN (SELECT field FROM wells WHERE well_id = ANY(${ids}))` : sql``} ORDER BY well_id`;
  const ids = viz.well_ids.length ? [...viz.well_ids, ...viz.highlighted] : [];
  let wells = await query(ids);
  if (!wells.length) wells = await query([]);
  const highlighted = new Set(viz.highlighted);
  return { ...viz, wells: wells.map((w) => ({ ...w, highlighted: highlighted.has(w.well_id) })) };
}

export async function buildViz(req: VizRequest, runs: ToolRun[]): Promise<{ viz: FinalViz; error: string | null }> {
  if (req.type === "none") return { viz: req, error: null };
  if (req.type === "map") return { viz: await withWells(req), error: null };
  const { chart, error } = buildChart(req, runs);
  return { viz: chart ?? { type: "none" }, error };
}

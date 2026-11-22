export interface ToolRun { ref: string; name: string; output: unknown }

export const BAR_METRICS = ["value", "change", "change_pct", "lost_oil_bbl", "lost_revenue_usd", "downtime_hours"] as const;
type BarMetric = (typeof BAR_METRICS)[number];

export type ChartRequest =
  | { type: "line"; title: string; ref: string; metric: "oil" | "gas" | "water_cut"; series: string[] }
  | { type: "bar"; title: string; ref: string; metric: BarMetric; wells: string[]; event_groups: string[][] };

export type Chart =
  | { type: "line"; title: string; unit: string; ref: string; series: { name: string; points: { x: string; y: number }[] }[] }
  | { type: "bar"; title: string; unit: string; ref: string; metric: BarMetric; bars: { label: string; value: number; ids: string[] }[] };

interface Series { name: string; points: { x: string; y: number }[] }
interface WellRow { well_id: string; value: number; baseline?: number; change?: number; change_pct?: number | null }
interface EventRow { event_id: string; well_id: string; start_date: string; lost_oil_bbl: number | null; lost_revenue_usd: number | null; downtime_hours: number | null }

const MAX_BARS = 10;
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
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
  const rows = req.wells.length ? req.wells.map((w) => out.rows.find((r) => r.well_id === w) ?? fail(`${req.ref} has no row for ${w}`)) : out.rows;
  const bars = rows.map((r) => {
    const value = r[metric];
    if (typeof value !== "number") fail(`${req.ref} has no ${metric} for ${r.well_id}`);
    return { label: r.well_id, value: value as number, ids: [r.well_id] };
  });
  bars.sort((a, b) => (metric === "value" ? b.value - a.value : a.value - b.value));
  const unit = metric === "value" ? out.unit : metric === "change" ? `${out.unit} change` : "% change";
  return { type: "bar", title: req.title, unit, ref: req.ref, metric, bars: bars.slice(0, MAX_BARS) };
}

function eventBars(req: Extract<ChartRequest, { type: "bar" }>, out: { events: EventRow[] }): Chart {
  const metric = req.metric;
  if (metric !== "lost_oil_bbl" && metric !== "lost_revenue_usd" && metric !== "downtime_hours") return fail(`${metric} is not an event metric`);
  const groups = req.event_groups.length ? req.event_groups : out.events.map((e) => [e.event_id]);
  const bars = groups.map((ids) => {
    if (!ids.length) fail("empty event group");
    const rows = ids.map((id) => out.events.find((e) => e.event_id === id) ?? fail(`${req.ref} has no event ${id}`));
    const values = rows.map((e) => e[metric] ?? fail(`${e.event_id} has no ${metric}`));
    const first = rows.reduce((a, b) => (b.start_date < a.start_date ? b : a));
    const wells = [...new Set(rows.map((e) => e.well_id))].join(" and ");
    const when = `${MONTH_SHORT[Number(first.start_date.slice(5, 7)) - 1]} ${first.start_date.slice(0, 4)}`;
    return { label: `${wells}, ${when}`, value: values.reduce((a, b) => a + b, 0), ids: [...ids] };
  });
  bars.sort((a, b) => b.value - a.value);
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

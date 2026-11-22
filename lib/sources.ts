export interface ToolStep { name: string; args: Record<string, unknown>; output?: Record<string, any> }

export function producer<S extends ToolStep>(id: string, steps: S[]): S | undefined {
  const [table, key, range] = id.split(":");
  if (table === "events") return steps.find((s) => s.output?.events?.some((e: { event_id: string }) => e.event_id === key));
  if (table === "wells") return steps.find((s) => s.output?.wells?.some((w: { well_id: string }) => w.well_id === key));
  if (table === "production_daily") {
    const [from, to] = (range ?? "").split("..");
    const fits = (s: S) => s.name === "query_production" && !s.output?.repeated && (key === "all" || s.args.field === key || (s.args.well_ids as string[] | undefined)?.includes(key));
    return steps.find((s) => fits(s) && s.args.from === from && s.args.to === to) ?? steps.find(fits);
  }
}

const EV = /EV-(\d{4})(?!\d)/g;
const RANGE = /EV-(\d{4})(?!\d)\s*(?:to|through|-|–|\.\.)\s*EV-(\d{4})(?!\d)/g;

export function coveredEvents<E extends { event_id: string }>(key: string, label: string, rows: E[]): E[] {
  const ids = new Set([key, ...[...label.matchAll(EV)].map((m) => m[0])]);
  const ranges = [...label.matchAll(RANGE)].map((m) => [Number(m[1]), Number(m[2])].sort((a, b) => a - b));
  const inRange = (id: string) => ranges.some(([a, b]) => { const k = Number(id.slice(3)); return k >= a && k <= b; });
  return rows.filter((r) => ids.has(r.event_id) || inRange(r.event_id));
}

import { docTypeLabel, monthYear } from "@/lib/domain";

export interface Step {
  id: string;
  name: string;
  args: Record<string, unknown>;
  state: "running" | "done" | "repeated" | "error";
  output?: Record<string, any>;
}

export const DOC_COUNT = 400;


const list = (xs: string[]) => (xs.length <= 2 ? xs.join(" and ") : xs.length <= 4 ? `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}` : `${xs.length} wells`);

function when(a: Record<string, any>) {
  if (a.from && a.to) return monthYear(a.from) === monthYear(a.to) ? ` in ${monthYear(a.from)}` : ` from ${monthYear(a.from)} to ${monthYear(a.to)}`;
  if (a.from) return ` since ${monthYear(a.from)}`;
  if (a.to) return ` up to ${monthYear(a.to)}`;
  return "";
}

function about(a: Record<string, any>) {
  const wells = a.well_ids?.length ? list(a.well_ids) : null;
  return wells ?? a.field ?? null;
}

export function say(name: string, a: Record<string, any>) {
  switch (name) {
    case "search_documents": {
      const what = a.doc_type ? `the ${docTypeLabel(a.doc_type).toLowerCase()}s` : `${DOC_COUNT} field reports`;
      const topic = about(a);
      return `Looking through ${what} for anything about ${topic ?? "this question"}${when(a)}...`;
    }
    case "list_events": {
      const kind = a.type === "incident" ? "incidents" : a.type === "maintenance" ? "maintenance jobs" : a.type ? `"${a.type}" events` : "events";
      const topic = about(a);
      return `Checking the event log for ${a.status ? `${a.status} ` : ""}${kind}${topic ? ` on ${topic}` : ""}${when(a)}...`;
    }
    case "query_production": {
      const metric = a.metric === "water_cut" ? "water cut (how much of what comes up is water)" : `${a.metric} production`;
      const topic = about(a) ?? "every well";
      return a.group_by === "well"
        ? `Comparing ${metric} well by well${when(a)}...`
        : `Reading the daily ${metric} numbers for ${topic}${when(a)}...`;
    }
    case "get_wells":
      return `Looking up the wells${a.field ? ` in ${a.field}` : ""} and their status...`;
    default:
      return "Working...";
  }
}

export function found(s: Step) {
  if (s.state === "error") return "This step failed, the AI went on without it.";
  if (s.state === "repeated") return "Already had this data, reused it.";
  const o = s.output ?? {};
  switch (s.name) {
    case "search_documents": {
      const docs = new Set((o.chunks ?? []).map((c: { document_id: string }) => c.document_id)).size;
      return `Found ${o.count ?? 0} relevant passages in ${docs} ${docs === 1 ? "report" : "reports"}.`;
    }
    case "list_events": {
      const n = o.count ?? 0;
      const kind = s.args.type === "incident" ? "incident" : "event";
      return `Found ${n} ${s.args.status ?? ""} ${kind}${n === 1 ? "" : "s"}.`.replace(/\s+/g, " ");
    }
    case "query_production":
      if (o.rows) return `Compared ${o.rows.length} wells.`;
      return `Read ${o.series?.reduce((n: number, x: { points: unknown[] }) => n + x.points.length, 0) ?? 0} ${o.bucket ?? ""}ly averages.`.replace(" dayly", " daily").replace(/\s+/g, " ");
    case "get_wells":
      return `Found ${o.count ?? 0} wells.`;
    default:
      return "Done.";
  }
}

export function docSlot(docId: string, taken: Set<number>) {
  let h = 0;
  for (const c of docId) h = (h * 31 + c.charCodeAt(0)) % 9973;
  let i = h % DOC_COUNT;
  while (taken.has(i)) i = (i + 1) % DOC_COUNT;
  taken.add(i);
  return i;
}


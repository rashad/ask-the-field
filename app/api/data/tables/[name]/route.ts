import { sql } from "@/lib/db";

const MONTHS = [6, 12, 18];

export async function GET(req: Request, ctx: RouteContext<"/api/data/tables/[name]">) {
  const { name } = await ctx.params;
  if (name === "wells") {
    const rows = await sql`
      SELECT w.well_id, w.field, w.status, w.well_type, w.lift_type, w.spud_date::text, w.lat, w.lon,
        (SELECT count(*)::int FROM events e WHERE e.well_id = w.well_id AND e.status = 'open') AS open_events
      FROM wells w ORDER BY w.well_id`;
    return Response.json({ rows });
  }
  if (name === "events") {
    const rows = await sql`
      SELECT e.event_id, e.well_id, w.field, e.category, e.type, e.start_date::text, e.end_date::text, e.downtime_hours, e.status, e.severity, e.description
      FROM events e JOIN wells w USING (well_id) ORDER BY e.start_date DESC, e.event_id`;
    return Response.json({ rows });
  }
  if (name === "production") {
    const months = Number(new URL(req.url).searchParams.get("months") ?? 6);
    if (!MONTHS.includes(months)) return Response.json({ error: "months must be 6, 12 or 18." }, { status: 400 });
    const rows = await sql`
      SELECT p.well_id, w.field, date_trunc('month', p.date)::date::text AS month, count(*)::int AS days,
        round(avg(p.oil_bbl)::numeric)::int AS oil_bbl_d, round(avg(p.gas_mscf)::numeric)::int AS gas_mscf_d,
        round(avg(p.water_cut)::numeric, 3)::float8 AS water_cut, round(avg(p.uptime_hours)::numeric, 1)::float8 AS uptime_h
      FROM production_daily p JOIN wells w USING (well_id)
      WHERE p.date >= date_trunc('month', (SELECT max(date) FROM production_daily)) - make_interval(months => ${months - 1})
      GROUP BY 1, 2, 3 ORDER BY 3 DESC, 1`;
    return Response.json({ rows, months });
  }
  return Response.json({ error: "Unknown table." }, { status: 404 });
}

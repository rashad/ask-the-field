import { sql } from "./db";
import { TODAY } from "./domain";
import { lostOil } from "./tools";

export interface MapWell { well_id: string; field: string; lat: number; lon: number; status: string; open_incident: boolean }

export interface Morning {
  today: string;
  yesterday: string;
  oil_yesterday: number;
  wells_total: number;
  wells_producing: number;
  wells_down: number;
  open_incidents: number;
  shut_in_by_incident: number;
  lost_month_bbl: number;
  wells: MapWell[];
  stakes: {
    w17_lost_bbl: number;
    w17_days: number;
    esp_workovers: number;
    esp_lost_bbl: number;
    wadi_wc_january: number;
    wadi_wc_now: number;
    sand_well: string;
    sand_since: string;
    sand_days: number;
  };
}

export async function morning(): Promise<Morning> {
  const yesterday = new Date(Date.parse(TODAY) - 864e5).toISOString().slice(0, 10);
  const month = TODAY.slice(0, 8) + "01";
  const [[k], wells, [w17], [esp], [wc], [sand]] = await Promise.all([
    sql`SELECT
      (SELECT sum(oil_bbl) FROM production_daily WHERE date = ${yesterday}) AS oil_yesterday,
      (SELECT count(*)::int FROM wells) AS wells_total,
      (SELECT count(*)::int FROM wells WHERE status = 'producing') AS wells_producing,
      (SELECT count(*)::int FROM events WHERE category = 'incident' AND status = 'open') AS open_incidents,
      (SELECT count(*)::int FROM events e JOIN wells w USING (well_id) WHERE e.category = 'incident' AND e.status = 'open' AND w.status = 'shut_in') AS shut_in_by_incident,
      (WITH base AS (SELECT well_id, avg(oil_bbl) AS b FROM production_daily WHERE uptime_hours = 24 AND date BETWEEN ${month}::date - 30 AND ${month}::date - 1 GROUP BY 1)
       SELECT sum(b * (24 - uptime_hours) / 24) FROM production_daily JOIN base USING (well_id) WHERE date BETWEEN ${month} AND ${yesterday}) AS lost_month`,
    sql<MapWell[]>`SELECT w.well_id, w.field, w.lat, w.lon, w.status,
      EXISTS (SELECT 1 FROM events e WHERE e.well_id = w.well_id AND e.category = 'incident' AND e.status = 'open') AS open_incident
      FROM wells w ORDER BY w.well_id`,
    sql`SELECT sum(${lostOil()})::int AS lost, (max(e.end_date) - min(e.start_date) + 1)::int AS days FROM events e
      WHERE e.well_id = 'W-17' AND e.start_date BETWEEN '2026-03-01' AND '2026-03-31' AND e.type ILIKE '%ESP%'`,
    sql`SELECT sum(lost)::int AS lost FROM (
      SELECT e.event_id, ${lostOil()} AS lost FROM events e WHERE e.type ILIKE '%ESP replacement%'
      UNION ALL
      SELECT e.event_id, ${lostOil()} FROM events e WHERE e.category = 'incident' AND EXISTS (
        SELECT 1 FROM events r WHERE r.well_id = e.well_id AND r.type ILIKE '%ESP replacement%' AND r.start_date BETWEEN e.start_date AND e.start_date + 10)
    ) x WHERE lost IS NOT NULL`,
    sql`SELECT
      (SELECT avg(water_cut) FROM production_daily JOIN wells USING (well_id) WHERE field = 'Wadi Field' AND uptime_hours > 0 AND date BETWEEN '2026-01-01' AND '2026-01-31') AS january,
      (SELECT avg(water_cut) FROM production_daily JOIN wells USING (well_id) WHERE field = 'Wadi Field' AND uptime_hours > 0 AND date BETWEEN ${month} AND ${yesterday}) AS now`,
    sql`SELECT e.well_id, e.start_date::text AS since, (${TODAY}::date - e.start_date)::int AS days FROM events e
      WHERE e.type ILIKE '%sand%' AND e.status = 'open' ORDER BY e.start_date LIMIT 1`,
  ]);
  const esp_workovers = (await sql`SELECT count(*)::int AS n FROM events WHERE type ILIKE '%ESP replacement%'`)[0].n;
  return {
    today: TODAY,
    yesterday,
    oil_yesterday: Math.round(k.oil_yesterday),
    wells_total: k.wells_total,
    wells_producing: k.wells_producing,
    wells_down: k.wells_total - k.wells_producing,
    open_incidents: k.open_incidents,
    shut_in_by_incident: k.shut_in_by_incident,
    lost_month_bbl: Math.round(k.lost_month),
    wells,
    stakes: {
      w17_lost_bbl: w17.lost,
      w17_days: w17.days,
      esp_workovers,
      esp_lost_bbl: esp.lost,
      wadi_wc_january: Math.round(wc.january * 100),
      wadi_wc_now: Math.round(wc.now * 100),
      sand_well: sand?.well_id ?? "",
      sand_since: sand?.since ?? "",
      sand_days: sand?.days ?? 0,
    },
  };
}

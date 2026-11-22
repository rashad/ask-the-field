export const START = "2025-05-23";
export const TODAY = "2026-11-22";

export type Field = "Field A" | "Field B" | "Bayda";
export type WellStatus = "producing" | "shut_in" | "workover" | "suspended";

export interface Well {
  well_id: string;
  field: Field;
  lat: number;
  lon: number;
  status: WellStatus;
  well_type: string;
  lift_type: string;
  spud_date: string;
}

export interface ProductionRow {
  well_id: string;
  date: string;
  oil_bbl: number;
  gas_mscf: number;
  water_cut: number;
  uptime_hours: number;
}

export interface Event {
  event_id: string;
  well_id: string;
  category: "maintenance" | "incident";
  type: string;
  start_date: string;
  end_date: string | null;
  downtime_hours: number;
  status: "open" | "closed";
  severity: string | null;
  description: string;
}

export interface Dataset {
  wells: Well[];
  production: ProductionRow[];
  events: Event[];
}

export function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DAY = 86_400_000;
export const toDate = (s: string) => new Date(s + "T00:00:00Z");
export const fmt = (d: Date) => d.toISOString().slice(0, 10);
export const addDays = (s: string, n: number) => fmt(new Date(toDate(s).getTime() + n * DAY));
export const dayIndex = (s: string) => Math.round((toDate(s).getTime() - toDate(START).getTime()) / DAY);
export const NDAYS = dayIndex(TODAY) + 1;

const round = (x: number, p = 1) => Math.round(x * 10 ** p) / 10 ** p;

const FIELDS: { field: Field; count: number; lat: number; lon: number; lift: string[] }[] = [
  { field: "Field A", count: 16, lat: 20.15, lon: 48.3, lift: ["ESP", "ESP", "gas lift", "natural flow"] },
  { field: "Field B", count: 14, lat: 20.42, lon: 48.78, lift: ["ESP", "ESP", "ESP", "gas lift"] },
  { field: "Bayda", count: 11, lat: 19.86, lon: 48.97, lift: ["gas lift", "gas lift", "ESP", "natural flow"] },
];

const LIFT_OVERRIDES: Record<string, string> = {
  "W-17": "ESP", "W-21": "ESP", "W-25": "ESP", "W-08": "ESP", "W-38": "gas lift", "W-34": "gas lift",
};

const STATUS_OVERRIDES: Record<string, WellStatus> = {
  "W-12": "shut_in", "W-36": "shut_in", "W-29": "workover", "W-40": "suspended",
};

interface Story {
  well_id: string;
  category: Event["category"];
  type: string;
  start: string;
  end: string | null;
  dailyDown: number;
  severity: string | null;
  description: string;
}

const STORIES: Story[] = [
  { well_id: "W-17", category: "incident", type: "ESP trip", start: "2026-03-04", end: "2026-03-10", dailyDown: 24, severity: "high",
    description: "ESP tripped on motor overload with phase current imbalance. Restart attempts failed; megger test showed low insulation resistance on the motor lead. Well shut in pending workover." },
  { well_id: "W-17", category: "maintenance", type: "Workover - ESP replacement", start: "2026-03-11", end: "2026-03-20", dailyDown: 24, severity: null,
    description: "Workover rig mobilized. Pulled completion, found burnt motor lead extension and scaled pump stages. Replaced ESP motor, pump and cable. Well returned to production on 2026-03-21." },
  { well_id: "W-08", category: "maintenance", type: "Scale squeeze treatment", start: "2026-10-05", end: "2026-10-07", dailyDown: 24, severity: null,
    description: "Scale inhibitor squeeze after carbonate scale build-up reduced ESP intake pressure and rate through Q3 2026." },
  { well_id: "W-23", category: "incident", type: "Water breakthrough", start: "2026-06-14", end: "2026-06-15", dailyDown: 4, severity: "medium",
    description: "Sharp rise in water cut from about 30 percent to over 55 percent within weeks, consistent with injector water breakthrough from the north flank." },
  { well_id: "W-34", category: "maintenance", type: "Choke bean-down for sand control", start: "2026-08-12", end: "2026-08-12", dailyDown: 3, severity: null,
    description: "Choke reduced from 48/64 to 32/64 after sand detected in separator; rate restricted to stay below the sand-free drawdown limit." },
  { well_id: "W-34", category: "incident", type: "Sand production alarm", start: "2026-11-09", end: null, dailyDown: 2, severity: "high",
    description: "Acoustic sand monitor alarm above threshold; erosion probe on flowline shows metal loss. Choke reduced again to 24/64, sand sampling every shift. Investigation open." },
  { well_id: "W-38", category: "incident", type: "Gas lift valve failure", start: "2026-07-20", end: "2026-07-21", dailyDown: 10, severity: "medium",
    description: "Unloading valve stuck open, lift gas injecting shallow. Rate fell by almost half. Slickline change-out scheduled." },
  { well_id: "W-38", category: "maintenance", type: "Gas lift valve change-out", start: "2026-12-03", end: null, dailyDown: 0, severity: null,
    description: "Slickline change-out of the stuck unloading valve, planned for early December 2026." },
  { well_id: "W-21", category: "maintenance", type: "ESP replacement", start: "2026-10-14", end: "2026-10-18", dailyDown: 24, severity: null,
    description: "ESP replaced after gradual pump wear reduced rate through Q3 2026." },
  { well_id: "W-12", category: "incident", type: "Sustained casing annulus pressure", start: "2026-10-28", end: null, dailyDown: 24, severity: "high",
    description: "B-annulus pressure built up above the allowed limit and did not bleed off. Well shut in pending integrity diagnostics." },
  { well_id: "W-05", category: "incident", type: "Wellhead pressure anomaly", start: "2026-11-15", end: null, dailyDown: 3, severity: "medium",
    description: "Flowing wellhead pressure swings of plus or minus 60 psi with no choke change. Gauge checked; suspected partial choke plugging. Monitoring." },
  { well_id: "W-25", category: "incident", type: "ESP high vibration", start: "2026-11-20", end: null, dailyDown: 2, severity: "medium",
    description: "ESP vibration rising above alarm level on the downhole sensor. Frequency reduced from 55 to 50 Hz, trend under review." },
  { well_id: "W-36", category: "incident", type: "Flowline leak", start: "2026-11-18", end: null, dailyDown: 24, severity: "high",
    description: "Pinhole leak found on flowline near the manifold during patrol. Well shut in, area isolated, clamp repair pending." },
  { well_id: "W-29", category: "maintenance", type: "Workover - tubing replacement", start: "2026-11-16", end: null, dailyDown: 24, severity: null,
    description: "Rig on location to replace corroded tubing found during caliper log." },
  { well_id: "W-40", category: "maintenance", type: "Well suspension", start: "2026-01-12", end: null, dailyDown: 24, severity: null,
    description: "Well suspended after water cut passed 90 percent and rate fell below the economic limit." },
  { well_id: "W-31", category: "incident", type: "Sand production alarm", start: "2025-11-03", end: "2025-11-06", dailyDown: 8, severity: "medium",
    description: "Sand monitor alarm after a rate increase. Choke reduced and sand settled after three days." },
];

const RANDOM_INCIDENTS = [
  { type: "ESP trip", desc: "ESP tripped on underload; restarted after checks.", down: [6, 30] },
  { type: "Power outage", desc: "Field power dip tripped the well; restarted after power restored.", down: [3, 12] },
  { type: "Flowline leak", desc: "Small leak on flowline flange; isolated and repaired.", down: [8, 40] },
  { type: "H2S alarm", desc: "Fixed H2S detector alarm near the wellhead; area cleared, leak found on a needle valve and fixed.", down: [2, 8] },
  { type: "Wellhead leak", desc: "Leak on wellhead valve stem packing; packing replaced.", down: [4, 14] },
  { type: "Sand production alarm", desc: "Sand monitor alarm; choke reduced until readings normal.", down: [4, 20] },
  { type: "High separator level trip", desc: "Test separator high-level trip shut in the well; level controller recalibrated.", down: [2, 6] },
];

const RANDOM_MAINTENANCE = [
  { type: "ESP inspection", desc: "Routine ESP surface equipment inspection and VSD parameter check.", down: [2, 6] },
  { type: "Choke replacement", desc: "Eroded choke bean replaced.", down: [3, 8] },
  { type: "Wellhead maintenance", desc: "Wellhead valve greasing and function test.", down: [2, 6] },
  { type: "Flowline pigging", desc: "Flowline pigging to remove wax and sand deposits.", down: [4, 10] },
  { type: "Gas lift valve change-out", desc: "Slickline gas lift valve change-out.", down: [10, 24] },
  { type: "Safety valve test", desc: "Subsurface safety valve function and leak test.", down: [3, 6] },
  { type: "Scale squeeze treatment", desc: "Preventive scale inhibitor squeeze.", down: [24, 48] },
];

interface WellModel {
  qL0: number;
  decline: number;
  wc0: number;
  wcSlope: number;
  gor: number;
}

function storyFactor(well_id: string, date: string): { liquid: number; wcAdd: number } {
  const d = dayIndex(date);
  const ramp = (a: string, b: string, from: number, to: number) => {
    const da = dayIndex(a), db = dayIndex(b);
    if (d <= da) return from;
    if (d >= db) return to;
    return from + ((to - from) * (d - da)) / (db - da);
  };
  switch (well_id) {
    case "W-08":
      return { liquid: d < dayIndex("2026-10-08") ? ramp("2026-06-25", "2026-09-30", 1, 0.58) : 0.9, wcAdd: 0 };
    case "W-21":
      return { liquid: d < dayIndex("2026-10-19") ? ramp("2026-06-20", "2026-10-13", 1, 0.66) : 0.97, wcAdd: 0 };
    case "W-23":
      return { liquid: 1.05, wcAdd: ramp("2026-06-10", "2026-08-20", 0, 0.29) };
    case "W-34":
      return { liquid: d < dayIndex("2026-08-12") ? 1 : d < dayIndex("2026-11-09") ? 0.62 : 0.48, wcAdd: 0 };
    case "W-38":
      return { liquid: d < dayIndex("2026-07-20") ? 1 : 0.54, wcAdd: 0 };
    case "W-17":
      return { liquid: d < dayIndex("2026-03-21") ? ramp("2026-01-20", "2026-03-03", 1, 0.86) : 0.92, wcAdd: 0 };
    case "W-40":
      return { liquid: 1, wcAdd: ramp("2025-08-01", "2026-01-11", 0, 0.25) };
    default:
      return { liquid: 1, wcAdd: 0 };
  }
}

export function generate(seed = 42): Dataset {
  const rnd = mulberry32(seed);
  const between = (a: number, b: number) => a + (b - a) * rnd();
  const pick = <T,>(xs: T[]) => xs[Math.floor(rnd() * xs.length)];
  const gauss = () => {
    let s = 0;
    for (let i = 0; i < 6; i++) s += rnd();
    return (s - 3) / Math.sqrt(0.5);
  };

  const wells: Well[] = [];
  const models = new Map<string, WellModel>();
  let n = 1;
  for (const f of FIELDS) {
    for (let i = 0; i < f.count; i++, n++) {
      const well_id = `W-${String(n).padStart(2, "0")}`;
      const angle = rnd() * Math.PI * 2;
      const r = Math.sqrt(rnd()) * 0.09;
      wells.push({
        well_id,
        field: f.field,
        lat: round(f.lat + r * Math.sin(angle), 5),
        lon: round(f.lon + r * Math.cos(angle) * 1.2, 5),
        status: STATUS_OVERRIDES[well_id] ?? "producing",
        well_type: rnd() < 0.3 ? "horizontal" : rnd() < 0.5 ? "deviated" : "vertical",
        lift_type: LIFT_OVERRIDES[well_id] ?? pick(f.lift),
        spud_date: fmt(new Date(toDate("2012-01-01").getTime() + Math.floor(rnd() * 11 * 365) * DAY)),
      });
      const fieldWc = f.field === "Field B" ? [0.18, 0.32] : f.field === "Bayda" ? [0.1, 0.25] : [0.05, 0.3];
      models.set(well_id, {
        qL0: between(700, 2600),
        decline: between(0.08, 0.26),
        wc0: between(fieldWc[0], fieldWc[1]),
        wcSlope: f.field === "Field B" ? between(0.08, 0.14) : between(0.02, 0.08),
        gor: f.field === "Bayda" ? between(1100, 1900) : between(450, 1100),
      });
    }
  }
  models.get("W-17")!.qL0 = 2350;
  models.get("W-17")!.wc0 = 0.22;
  models.get("W-23")!.wc0 = 0.24;
  models.get("W-40")!.wc0 = 0.6;
  models.get("W-40")!.qL0 = 900;

  const events: Event[] = [];
  const down = new Map<string, Float64Array>();
  for (const w of wells) down.set(w.well_id, new Float64Array(NDAYS));

  const applyDown = (well_id: string, start: string, end: string | null, daily: number) => {
    const arr = down.get(well_id)!;
    const a = Math.max(0, dayIndex(start));
    const b = Math.min(NDAYS - 1, dayIndex(end ?? TODAY));
    let total = 0;
    for (let d = a; d <= b; d++) {
      const h = Math.min(24 - arr[d], daily);
      arr[d] += h;
      total += h;
    }
    return total;
  };

  for (const s of STORIES) {
    const future = dayIndex(s.start) > dayIndex(TODAY);
    const hours = future ? 0 : applyDown(s.well_id, s.start, s.end, s.dailyDown);
    events.push({
      event_id: "",
      well_id: s.well_id,
      category: s.category,
      type: s.type,
      start_date: s.start,
      end_date: s.end,
      downtime_hours: round(hours),
      status: s.end && dayIndex(s.end) <= dayIndex(TODAY) ? "closed" : "open",
      severity: s.severity,
      description: s.description,
    });
  }

  const storyIncidents = events.filter((e) => e.category === "incident").length;
  const storyMaintenance = events.filter((e) => e.category === "maintenance").length;
  const randomEvent = (category: Event["category"]) => {
    const w = pick(wells.filter((x) => x.status !== "suspended"));
    const fits = (t: string) => (!t.includes("ESP") || w.lift_type === "ESP") && (!t.toLowerCase().includes("gas lift") || w.lift_type === "gas lift");
    const tpl = pick((category === "incident" ? RANDOM_INCIDENTS : RANDOM_MAINTENANCE).filter((t) => fits(t.type)));
    const start = addDays(START, Math.floor(between(5, NDAYS - 30)));
    const hours = Math.round(between(tpl.down[0], tpl.down[1]));
    const days = Math.ceil(hours / 24);
    const end = addDays(start, days - 1);
    const daily = hours / days;
    const actual = applyDown(w.well_id, start, end, daily);
    events.push({
      event_id: "",
      well_id: w.well_id,
      category,
      type: tpl.type,
      start_date: start,
      end_date: end,
      downtime_hours: round(actual),
      status: "closed",
      severity: category === "incident" ? pick(["low", "low", "medium", "medium", "high"]) : null,
      description: tpl.desc,
    });
  };
  for (let i = storyIncidents; i < 70; i++) randomEvent("incident");
  for (let i = storyMaintenance; i < 115; i++) randomEvent("maintenance");

  events.sort((a, b) => a.start_date.localeCompare(b.start_date) || a.well_id.localeCompare(b.well_id));
  events.forEach((e, i) => (e.event_id = `EV-${String(i + 1).padStart(4, "0")}`));

  const production: ProductionRow[] = [];
  for (const w of wells) {
    const m = models.get(w.well_id)!;
    const arr = down.get(w.well_id)!;
    for (let d = 0; d < NDAYS; d++) {
      const date = addDays(START, d);
      const t = d / 365;
      const sf = storyFactor(w.well_id, date);
      const qL = m.qL0 * Math.exp(-m.decline * t) * sf.liquid * (1 + 0.035 * gauss());
      const wc = Math.min(0.96, Math.max(0.01, m.wc0 + m.wcSlope * t + sf.wcAdd + 0.012 * gauss()));
      const uptime = 24 - arr[d];
      const oil = Math.max(0, qL * (1 - wc) * (uptime / 24));
      production.push({
        well_id: w.well_id,
        date,
        oil_bbl: round(oil),
        gas_mscf: round((oil * m.gor * (1 + 0.04 * gauss())) / 1000),
        water_cut: uptime > 0 ? round(wc, 3) : 0,
        uptime_hours: round(uptime),
      });
    }
  }

  return { wells, production, events };
}

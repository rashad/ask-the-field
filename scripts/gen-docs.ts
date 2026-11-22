import Anthropic from "@anthropic-ai/sdk";
import { appendFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { stringify } from "yaml";
import { DATA_START as START, TODAY, type DocType } from "../lib/domain";
import { addDays, dayIndex, Event, generate, mulberry32, Well } from "../lib/synth";

const MODEL = "claude-sonnet-5-5";
const OUT = "data/docs";
const CONCURRENCY = 8;
const BANNED = /\b(Aramco|Exxon|Chevron|Schlumberger|SLB|Halliburton|Baker Hughes)\b/;


interface Plan {
  doc_id: string;
  doc_type: DocType;
  well_id: string | null;
  field: string | null;
  date: string;
  title: string;
  words: [number, number];
  facts: Record<string, unknown>;
  must?: string[];
}

const { wells, production, events } = generate();
const rnd = mulberry32(7);
const pick = <T,>(xs: T[]) => xs[Math.floor(rnd() * xs.length)];
const wellById = new Map(wells.map((w) => [w.well_id, w]));
const prod = new Map(production.map((p) => [`${p.well_id}|${p.date}`, p]));
const r1 = (x: number) => Math.round(x * 10) / 10;

function prodOn(well_id: string, date: string) {
  const p = prod.get(`${well_id}|${date}`);
  return p && { well_id, date, oil_bbl: p.oil_bbl, gas_mscf: p.gas_mscf, water_cut_pct: r1(p.water_cut * 100), uptime_hours: p.uptime_hours };
}

function avgProd(well_id: string, end: string, days: number) {
  const rows = Array.from({ length: days }, (_, i) => prod.get(`${well_id}|${addDays(end, -i)}`)).filter((p) => p && p.uptime_hours > 0);
  if (!rows.length) return null;
  const mean = (f: (p: (typeof rows)[0]) => number) => r1(rows.reduce((s, p) => s + f(p), 0) / rows.length);
  const oil = mean((p) => p!.oil_bbl);
  const gas = mean((p) => p!.gas_mscf);
  return { period_end: end, days: rows.length, oil_bbl_d: oil, gas_mscf_d: gas, water_cut_pct: mean((p) => p!.water_cut * 100), gor_scf_bbl: oil ? Math.round((gas * 1000) / oil) : null };
}

const PUMPS: Record<string, { serial: string; from: string; to: string | null }[]> = {
  "W-09": [{ serial: "7Q-0419-027", from: "2025-02-14", to: "2025-10-21" }, { serial: "4D-0733-115", from: "2025-11-02", to: null }],
  "W-17": [{ serial: "7Q-0419-112", from: "2025-02-03", to: "2026-03-04" }, { serial: "2M-1187-044", from: "2026-03-17", to: null }],
  "W-27": [{ serial: "7Q-0419-086", from: "2025-09-09", to: "2026-08-18" }, { serial: "5C-0822-019", from: "2026-08-29", to: null }],
  "W-21": [{ serial: "1H-0956-071", from: "2024-03-12", to: "2026-10-14" }, { serial: "5C-0822-034", from: "2026-10-18", to: null }],
  "W-25": [{ serial: "3K-1102-058", from: "2025-01-20", to: null }],
};
const pumpOn = (well_id: string, d: string) => {
  const p = PUMPS[well_id]?.find((x) => x.from <= d && (!x.to || d <= x.to));
  return p ? { vendor: "Varenta", model: "VL-538", serial: p.serial, batch: p.serial.slice(0, 7), installed: p.from } : null;
};

function fieldWc(field: string, from: string, to: string) {
  const ids = new Set(wells.filter((w) => w.field === field).map((w) => w.well_id));
  const rows = production.filter((p) => ids.has(p.well_id) && p.uptime_hours > 0 && p.date >= from && p.date <= to);
  return rows.length ? r1((rows.reduce((t, p) => t + p.water_cut, 0) / rows.length) * 100) : null;
}

const PROCEDURES: { id: string; title: string; sections: string[]; date: string }[] = [
  { id: "SOP-OPS-001", title: "ESP Trip Response and Restart", date: "2025-09-15", sections: ["Purpose and scope", "Roles", "Immediate actions after a trip", "Diagnosis: reading VSD trip codes, phase currents and downhole sensor data", "Restart rules (no more than two restart attempts, wait times)", "Megger and insulation resistance checks", "When to call a workover", "Records and handover"] },
  { id: "SOP-OPS-002", title: "Sand Management and Sand Production Alarms", date: "2025-12-01", sections: ["Purpose and scope", "Sand-prone wells and sand-free drawdown limits", "Acoustic sand monitor and erosion probe alarm thresholds", "Response to a sand alarm: choke bean-down steps", "Sampling and separator checks", "Flowline erosion inspection", "Return to normal rate", "Records"] },
  { id: "SOP-HSE-003", title: "H2S Alarm Response", date: "2025-07-10", sections: ["Purpose and scope", "Detector set points", "Immediate actions and muster", "Breathing apparatus and entry rules", "Leak search and isolation", "All-clear and reporting"] },
  { id: "SOP-OPS-004", title: "Well Test Procedure with the Mobile Test Separator", date: "2025-10-20", sections: ["Purpose and scope", "Test frequency per well", "Line-up and stabilisation", "Measurements: oil, gas, water cut, pressures", "Sand and BS&W sampling", "Data validation against allocation", "Test report contents"] },
  { id: "SOP-HSE-005", title: "Permit to Work for Workover and Rig Operations", date: "2026-01-05", sections: ["Purpose and scope", "Permit types", "Well handover from production to rig", "Isolation and barrier verification", "Simultaneous operations", "Well handback and restart", "Records"] },
  { id: "SOP-HSE-006", title: "Flowline Leak Response", date: "2025-08-25", sections: ["Purpose and scope", "Leak detection sources", "Immediate isolation", "Spill containment and reporting", "Temporary clamp repair", "Permanent repair and pressure test", "Return to service"] },
  { id: "SOP-OPS-007", title: "Gas Lift Troubleshooting", date: "2026-02-18", sections: ["Purpose and scope", "Normal gas lift operating envelope", "Symptoms of a stuck or failed valve", "Surface checks: injection rate, casing pressure, temperature survey", "Slickline valve change-out planning", "Optimising injection after repair"] },
  { id: "SOP-OPS-008", title: "Scale Inhibitor Squeeze Treatment", date: "2026-04-02", sections: ["Purpose and scope", "Scale risk indicators: intake pressure, rate loss, water chemistry", "Treatment design", "Pumping sequence and shut-in time", "Restart and inhibitor return monitoring", "Records"] },
  { id: "SOP-OPS-009", title: "Shift Handover and Daily Shift Report", date: "2025-06-30", sections: ["Purpose and scope", "Handover meeting", "Contents of the shift report", "Wells offline and open incidents", "Production figures and sources", "Escalation rules"] },
  { id: "SOP-INT-010", title: "Well Integrity: Annulus Pressure Management", date: "2026-05-11", sections: ["Purpose and scope", "Annulus naming and allowed operating pressures", "Monitoring frequency", "Bleed-down test", "Sustained annulus pressure: shut-in criteria", "Diagnostics and repair options", "Records"] },
];

const PROC_FOR: Record<string, string> = {
  "ESP trip": "SOP-OPS-001", "ESP high vibration": "SOP-OPS-001", "Workover - ESP replacement": "SOP-HSE-005", "ESP replacement": "SOP-HSE-005",
  "Sand production alarm": "SOP-OPS-002", "Choke bean-down for sand control": "SOP-OPS-002", "H2S alarm": "SOP-HSE-003",
  "Flowline leak": "SOP-HSE-006", "Gas lift valve failure": "SOP-OPS-007", "Gas lift valve change-out": "SOP-OPS-007",
  "Scale squeeze treatment": "SOP-OPS-008", "Sustained casing annulus pressure": "SOP-INT-010", "Workover - tubing replacement": "SOP-HSE-005",
};
const procRef = (type: string) => {
  const p = PROCEDURES.find((x) => x.id === PROC_FOR[type]);
  return p ? `${p.id} ${p.title}` : null;
};

function downtimeUntil(well_id: string, from: string, to: string) {
  let h = 0;
  for (let d = from; dayIndex(d) <= Math.min(dayIndex(to), dayIndex(TODAY)); d = addDays(d, 1)) h += 24 - (prod.get(`${well_id}|${d}`)?.uptime_hours ?? 24);
  return r1(h);
}

const eventFacts = (e: Event, asOf: string) => {
  const ended = e.end_date !== null && dayIndex(e.end_date) <= dayIndex(asOf);
  const started = dayIndex(e.start_date) <= dayIndex(asOf);
  return {
    event_id: e.event_id, well_id: e.well_id, category: e.category, type: e.type, start_date: e.start_date,
    end_date: ended ? e.end_date : null, status_as_of_document_date: !started ? "planned" : ended ? "closed" : "open",
    downtime_hours_as_of_document_date: started ? (ended ? e.downtime_hours : downtimeUntil(e.well_id, e.start_date, asOf)) : 0,
    severity: e.severity, summary: ended || !started ? e.description : e.description.replace(/ Well returned to production on [0-9-]+\./, ""),
  };
};
const related = (e: Event, docDate: string) =>
  events
    .filter((x) => x !== e && x.well_id === e.well_id && Math.abs(dayIndex(x.start_date) - dayIndex(e.start_date)) <= 30)
    .map((x) => ({ ...eventFacts(x, docDate), relative_to_document_date: dayIndex(x.start_date) > dayIndex(docDate) ? "after: mention only as planned or expected" : "before or same day" }));
const wellFacts = (w: Well) => ({ well_id: w.well_id, field: w.field, lift_type: w.lift_type, well_type: w.well_type, status_today: w.status });

function buildPlan(): Plan[] {
  const plan: Plan[] = [];
  const inRange = (d: string) => dayIndex(d) >= 0 && dayIndex(d) <= dayIndex(TODAY);

  events.filter((e) => e.category === "incident").forEach((e, i) => {
    const w = wellById.get(e.well_id)!;
    const date = e.end_date && e.status === "closed" ? e.end_date : e.start_date;
    plan.push({
      doc_id: `IN-${String(i + 1).padStart(3, "0")}`, doc_type: "incident_note", well_id: e.well_id, field: w.field, date,
      title: `Incident note: ${e.type} on ${e.well_id}`, words: [160, 360], must: e.description.includes("7Q-0419") ? ["7Q-0419"] : undefined,
      facts: {
        note_date: date, incident: eventFacts(e, date), well: wellFacts(w), applicable_procedure: procRef(e.type),
        status_at_note_date: e.end_date && dayIndex(e.end_date) <= dayIndex(date) ? "closed" : "open",
        production_before: avgProd(e.well_id, addDays(e.start_date, -1), 7), production_on_day: prodOn(e.well_id, e.start_date),
        related_events_within_30_days: related(e, date),
      },
    });
  });

  const storyWo = new Set(["W-09", "W-17", "W-27", "W-08", "W-34", "W-38", "W-21", "W-29", "W-40"]);
  const maint = events.filter((e) => e.category === "maintenance");
  const chosen = [...maint.filter((e) => storyWo.has(e.well_id)), ...maint.filter((e) => !storyWo.has(e.well_id))].slice(0, 60);
  chosen.sort((a, b) => a.start_date.localeCompare(b.start_date));
  chosen.forEach((e, i) => {
    const w = wellById.get(e.well_id)!;
    const raised = inRange(e.start_date) ? addDays(e.start_date, -2) : "2026-11-12";
    const after = e.end_date && inRange(addDays(e.end_date, 7)) ? avgProd(e.well_id, addDays(e.end_date, 7), 6) : null;
    plan.push({
      doc_id: `WO-${String(i + 1).padStart(3, "0")}`, doc_type: "work_order", well_id: e.well_id, field: w.field, date: inRange(e.start_date) ? e.start_date : raised,
      title: `Work order: ${e.type}, ${e.well_id}`, words: [140, 320], must: e.description.includes("7Q-0419") ? ["7Q-0419"] : undefined,
      facts: {
        work_order_raised: raised, planned_or_actual_start: e.start_date, completion_date: e.end_date, work: eventFacts(e, e.end_date ?? TODAY), well: wellFacts(w),
        applicable_procedure: procRef(e.type), production_before: avgProd(e.well_id, addDays(e.start_date, -1), 14), production_after_restart: after,
        related_events_within_30_days: related(e, e.end_date ?? TODAY), note: e.end_date ? "Write it as a completed work order with close-out remarks." : "Write it as an open work order; work not finished as of today.",
      },
    });
  });

  const forcedTests: [string, string][] = [
    ["W-09", "2025-09-30"], ["W-09", "2025-11-10"], ["W-27", "2026-07-28"], ["W-27", "2026-09-08"],
    ["W-19", "2026-02-03"], ["W-19", "2026-10-27"], ["W-22", "2026-04-14"], ["W-26", "2026-09-15"], ["W-30", "2026-11-04"],
    ["W-17", "2026-02-10"], ["W-17", "2026-03-23"], ["W-17", "2026-05-12"], ["W-23", "2026-05-20"], ["W-23", "2026-07-15"], ["W-23", "2026-09-02"],
    ["W-34", "2026-08-10"], ["W-34", "2026-11-11"], ["W-08", "2026-09-15"], ["W-08", "2026-10-20"], ["W-38", "2026-08-05"], ["W-21", "2026-09-20"],
    ["W-40", "2026-01-05"], ["W-31", "2025-11-10"],
  ];
  const tests = [...forcedTests];
  while (tests.length < 40) {
    const w = pick(wells.filter((x) => x.status === "producing"));
    const d = addDays(START, 20 + Math.floor(rnd() * (dayIndex(TODAY) - 25)));
    if ((prod.get(`${w.well_id}|${d}`)?.uptime_hours ?? 0) === 24 && !tests.some(([a, b]) => a === w.well_id && b === d)) tests.push([w.well_id, d]);
  }
  tests.sort((a, b) => a[1].localeCompare(b[1]));
  tests.forEach(([wid, d], i) => {
    const w = wellById.get(wid)!;
    const measured = avgProd(wid, d, 3)!;
    plan.push({
      doc_id: `WT-${String(i + 1).padStart(3, "0")}`, doc_type: "well_test", well_id: wid, field: w.field, date: d,
      title: `Well test: ${wid}, ${d}`, words: [120, 280],
      facts: {
        test_date: d, well: wellFacts(w), test_duration_hours: pick([8, 12, 12, 24]), choke_64ths: pick([24, 28, 32, 36, 40, 48]),
        flowing_wellhead_pressure_psi: Math.round(180 + rnd() * 420), measured: measured, previous_test_baseline: avgProd(wid, addDays(d, -60), 7),
        installed_esp: pumpOn(wid, d),
        ...(w.field === "Wadi Field" && { wadi_field_avg_water_cut_pct: { january_2026: fieldWc("Wadi Field", "2026-01-01", "2026-01-31"), last_30_days: fieldWc("Wadi Field", addDays(d, -29), d) } }),
        sand_ppm: w.field === "Salt Flat Field" ? Math.round(2 + rnd() * 18) : Math.round(rnd() * 3),
        events_last_45_days: events.filter((e) => e.well_id === wid && dayIndex(e.start_date) <= dayIndex(d) && dayIndex(e.start_date) > dayIndex(d) - 45).map((e) => eventFacts(e, d)),
        procedure: "SOP-OPS-004 Well Test Procedure with the Mobile Test Separator",
      },
    });
  });

  const forcedShifts: [string, string][] = [
    ["Wadi Field", "2026-01-15"], ["Wadi Field", "2026-03-04"], ["Wadi Field", "2026-03-05"], ["Wadi Field", "2026-03-10"], ["Wadi Field", "2026-03-14"], ["Wadi Field", "2026-03-17"], ["Wadi Field", "2026-03-18"],
    ["Wadi Field", "2026-06-15"], ["Wadi Field", "2026-08-18"], ["Wadi Field", "2026-08-23"], ["Wadi Field", "2026-08-30"], ["Wadi Field", "2026-10-14"], ["Wadi Field", "2026-11-16"], ["Wadi Field", "2026-11-20"],
    ["Dune Field", "2025-10-21"], ["Dune Field", "2025-10-27"], ["Dune Field", "2025-11-03"], ["Dune Field", "2026-10-05"], ["Dune Field", "2026-10-28"], ["Dune Field", "2026-11-15"], ["Dune Field", "2026-11-21"],
    ["Salt Flat Field", "2026-07-20"], ["Salt Flat Field", "2026-08-12"], ["Salt Flat Field", "2026-11-09"], ["Salt Flat Field", "2026-11-10"], ["Salt Flat Field", "2026-11-18"], ["Salt Flat Field", "2026-11-21"],
  ];
  const shiftKeys = new Set<string>();
  const shifts: { field: string; date: string; shift: "day" | "night" }[] = [];
  const addShift = (field: string, date: string, shift: "day" | "night") => {
    const k = `${field}|${date}|${shift}`;
    if (!inRange(date) || shiftKeys.has(k)) return;
    shiftKeys.add(k);
    shifts.push({ field, date, shift });
  };
  forcedShifts.forEach(([f, d]) => addShift(f, d, "day"));
  for (const e of events) if (shifts.length < 150 && e.category === "incident") addShift(wellById.get(e.well_id)!.field, e.start_date, rnd() < 0.5 ? "day" : "night");
  while (shifts.length < 220) addShift(pick(["Dune Field", "Wadi Field", "Salt Flat Field"]), addDays(START, Math.floor(rnd() * (dayIndex(TODAY) + 1))), rnd() < 0.6 ? "day" : "night");
  shifts.sort((a, b) => a.date.localeCompare(b.date) || a.field.localeCompare(b.field) || a.shift.localeCompare(b.shift));
  shifts.forEach((s, i) => {
    const fw = wells.filter((w) => w.field === s.field);
    const rows = fw.map((w) => ({ w, p: prod.get(`${w.well_id}|${s.date}`)! }));
    const active = events.filter((e) => fw.some((w) => w.well_id === e.well_id) && dayIndex(e.start_date) <= dayIndex(s.date) && dayIndex(e.end_date ?? TODAY) >= dayIndex(s.date) && inRange(e.start_date));
    const starting = active.filter((e) => e.start_date === s.date);
    const focus = starting[0]?.well_id ?? active.find((e) => e.category === "incident")?.well_id ?? null;
    const online = rows.filter((r) => r.p.uptime_hours > 0);
    const totalOil = r1(rows.reduce((t, r) => t + r.p.oil_bbl, 0));
    plan.push({
      doc_id: `SR-${String(i + 1).padStart(3, "0")}`, doc_type: "shift_report", well_id: focus, field: s.field, date: s.date,
      title: `Shift report: ${s.field}, ${s.date}, ${s.shift} shift`, words: [150, 320],
      facts: {
        date: s.date, shift: s.shift, field: s.field, wells_total: fw.length, wells_online: online.length,
        field_oil_bbl_day: totalOil, field_gas_mscf_day: r1(rows.reduce((t, r) => t + r.p.gas_mscf, 0)),
        field_avg_water_cut_pct: online.length ? r1((online.reduce((t, r) => t + r.p.water_cut, 0) / online.length) * 100) : null,
        wells_offline_or_restricted: rows.filter((r) => r.p.uptime_hours < 24).map((r) => ({ well_id: r.w.well_id, uptime_hours: r.p.uptime_hours, oil_bbl: r.p.oil_bbl })),
        events_starting_today: starting.map((e) => eventFacts(e, s.date)), events_ongoing: active.filter((e) => e.start_date !== s.date).map((e) => eventFacts(e, s.date)),
        top_producers: [...online].sort((a, b) => b.p.oil_bbl - a.p.oil_bbl).slice(0, 3).map((r) => prodOn(r.w.well_id, s.date)),
        focus_well_today: focus ? prodOn(focus, s.date) : null,
        ...(s.field === "Wadi Field" && dayIndex(s.date) >= dayIndex("2026-02-01") && { field_avg_water_cut_trend_pct: { january_2026: fieldWc("Wadi Field", "2026-01-01", "2026-01-31"), last_30_days: fieldWc("Wadi Field", addDays(s.date, -29), s.date), note: "Mention this trend in one short line of the production summary." } }),
        routine_activity: pick(["flowline patrol", "chemical injection rate checks", "separator sampling", "fire and gas detector tests", "generator maintenance", "manifold valve greasing", "road inspection after sandstorm"]),
      },
    });
  });

  PROCEDURES.forEach((p) =>
    plan.push({
      doc_id: p.id, doc_type: "procedure", well_id: null, field: null, date: p.date, title: `${p.id} ${p.title}`, words: [1100, 1800],
      facts: { procedure_id: p.id, title: p.title, revision_date: p.date, required_sections: p.sections, applies_to: "All three fields: Dune Field, Wadi Field and Salt Flat Field" },
    }),
  );
  return plan;
}

const SYSTEM = `You write synthetic internal documents for a fictional upstream oil and gas asset. The documents feed a demo of a retrieval system, so they must read like real field paperwork and agree exactly with the data you are given.

Setting:
- One fictional operating asset in a desert concession with three fields: Dune Field, Wadi Field and Salt Flat Field. Fluids go to one central processing facility, CPF-1.
- Wells are named W-01 to W-41. Dune Field has W-01 to W-16, Wadi Field has W-17 to W-30, Salt Flat Field has W-31 to W-41. Salt Flat Field is sand-prone and has high GOR. Wadi Field is under water flood and its water cut is rising.
- ESP wells run Varenta VL-538 pumps (Varenta is the fictional ESP vendor). Each pump has a serial whose first part is its manufacturing batch: serial 7Q-0419-112 belongs to batch 7Q-0419.
- Units: oil in bbl/d (or bbl for a day), gas in Mscf/d, water cut in percent, pressure in psi, sand in ppm, choke in 64ths of an inch.
- People appear only by role (Production Supervisor, Lead Operator, Night Lead Operator, Production Engineer, Field Engineer, HSE Advisor, Workover Supervisor, Maintenance Planner, Integrity Engineer), optionally with an initial such as "Lead Operator (K.M.)".

Hard rules:
- Never name a real company, operator, contractor, country, city, oil field or brand. Use generic terms (the rig contractor, the ESP vendor, the slickline unit).
- Never use em dashes or en dashes. Use commas, colons, parentheses or a plain hyphen.
- Every number about production, dates, durations, events and well status must come from the facts JSON. Do not contradict it. You may add plausible operational detail (checks done, readings on equipment not covered by the facts, people informed, next steps) as long as it does not contradict the facts.
- Write the date as YYYY-MM-DD.
- When the facts give an ESP serial or batch, state it once as a plain equipment detail, for example "pump serial 7Q-0419-112 (batch 7Q-0419)". Never compare it with other wells and never suggest a batch problem: each document only knows its own well.
- Output only the document in Markdown. Start with a level 1 heading equal to the title you are given. No front matter, no preamble, no closing remarks.

Well register:
${wells.map((w) => `${w.well_id} | ${w.field} | ${w.well_type} | ${w.lift_type} | status today (${TODAY}): ${w.status}`).join("\n")}

Document styles:
- shift_report: a field shift report written by the lead operator at the end of the shift. Short labelled sections or bullet lists: production summary, wells offline or restricted, events, routine work, handover notes. Terse, factual.
- incident_note: written by the production engineer or HSE advisor on the note date. What happened, immediate actions, findings so far, impact (downtime, deferred oil), status at the note date, next actions, reference to the applicable procedure. Only state the incident is closed if status_at_note_date is closed.
- work_order: a maintenance work order: header fields (WO number equal to the doc id, well, priority, planned dates), scope of work, safety and permits, materials, execution notes or close-out remarks.
- well_test: a well test note: test conditions, measured rates and water cut, GOR, comparison with the previous baseline, sand, observations, recommendation.
- procedure: a standard operating procedure with a short header block, then one "## " heading per required section, in order. Numbered steps, concrete thresholds and responsibilities. Generic: do not cite specific wells or dates except the revision date.`;

function userPrompt(p: Plan) {
  return `Document type: ${p.doc_type}
Document id: ${p.doc_id}
Title: ${p.title}
Length: ${p.words[0]} to ${p.words[1]} words.

Facts (JSON):
${JSON.stringify(p.facts, null, 1)}`;
}

function clean(text: string) {
  return text.replace(/\s*—\s*/g, ", ").replace(/–/g, "-").replace(/\r/g, "").trim() + "\n";
}

const client = new Anthropic();

async function write(p: Plan) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 8000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low" },
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: userPrompt(p) }],
    });
    appendFileSync("data/.gen-usage.jsonl", JSON.stringify({ doc_id: p.doc_id, model: res.model, usage: res.usage }) + "\n");
    if (res.stop_reason === "refusal" || res.stop_reason === "max_tokens") {
      console.warn(`${p.doc_id}: stop_reason=${res.stop_reason}, attempt ${attempt}`);
      continue;
    }
    const body = clean(res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join(""));
    if (BANNED.test(body)) {
      console.warn(`${p.doc_id}: banned name found, attempt ${attempt}`);
      continue;
    }
    if (p.must?.some((m) => !body.includes(m))) {
      console.warn(`${p.doc_id}: missing ${p.must.join(", ")}, attempt ${attempt}`);
      continue;
    }
    const front = stringify({ doc_id: p.doc_id, doc_type: p.doc_type, well_id: p.well_id, field: p.field, date: p.date, title: p.title });
    writeFileSync(`${OUT}/${p.doc_id}.md`, `---\n${front}---\n\n${body}`);
    return;
  }
  throw new Error(`${p.doc_id}: failed after 3 attempts`);
}

const plan = buildPlan();
const counts = plan.reduce<Record<string, number>>((c, p) => ((c[p.doc_type] = (c[p.doc_type] ?? 0) + 1), c), {});
console.log(`plan: ${plan.length} documents`, counts);
if (process.argv.includes("--dry")) {
  if (process.argv.includes("--list")) for (const p of plan) console.log(p.doc_id, p.well_id ?? "-", p.date, p.title);
  process.exit(0);
}

mkdirSync(OUT, { recursive: true });
const ids = process.argv.find((a) => a.startsWith("--ids="))?.slice(6).split(",");
const todo = plan.filter((p) => !existsSync(`${OUT}/${p.doc_id}.md`) && (!ids || ids.includes(p.doc_id)));
const limit = Number(process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? todo.length);
const queue = todo.slice(0, limit);
console.log(`to generate: ${queue.length}`);

let done = 0;
const failed: string[] = [];
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    for (let p = queue.shift(); p; p = queue.shift()) {
      try {
        await write(p);
      } catch (err) {
        failed.push(p.doc_id);
        console.error(`${p.doc_id}: ${err instanceof Error ? err.message : err}`);
      }
      if (++done % 20 === 0) console.log(`${done} done`);
    }
  }),
);
console.log(`finished: ${done - failed.length} written, ${failed.length} failed ${failed.join(" ")}`);

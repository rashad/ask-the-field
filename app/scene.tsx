"use client";
import { ArrowRight, ChatCircleText, ListMagnifyingGlass, Play, SealCheck } from "@phosphor-icons/react/ssr";
import { PRICE_NOTE, PRICE_PER_BBL, round100, usd } from "@/lib/money";
import { longDate } from "@/lib/domain";
import { SUGGESTED } from "@/lib/questions";
import type { Morning, SnapshotWell } from "@/lib/morning";
import { Term, GLOSSARY, type TermKey } from "./term";

const n = (x: number) => x.toLocaleString("en-US");
const WEEKDAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const weekday = (d: string) => WEEKDAY[new Date(`${d}T00:00:00Z`).getUTCDay()];

function FieldMap({ wells }: { wells: SnapshotWell[] }) {
  const W = 440, H = 250, P = 24;
  const names = [...new Set(wells.map((w) => w.field))];
  const centre = new Map(names.map((f) => {
    const fw = wells.filter((w) => w.field === f);
    return [f, [fw.reduce((t, w) => t + w.lat, 0) / fw.length, fw.reduce((t, w) => t + w.lon, 0) / fw.length]] as const;
  }));
  // Fields sit far apart; spreading each cluster around its centre keeps the wells readable at this size.
  const pos = new Map(wells.map((w) => { const [la, lo] = centre.get(w.field)!; return [w.well_id, [la + (w.lat - la) * 1.8, lo + (w.lon - lo) * 1.8]] as const; }));
  const lats = [...pos.values()].map((p) => p[0]), lons = [...pos.values()].map((p) => p[1]);
  const [minLat, maxLat, minLon, maxLon] = [Math.min(...lats), Math.max(...lats), Math.min(...lons), Math.max(...lons)];
  const sx = (W - 2 * P) / (maxLon - minLon), sy = (H - 2 * P - 28) / (maxLat - minLat);
  const xy = (w: SnapshotWell) => { const [la, lo] = pos.get(w.well_id)!; return [P + (lo - minLon) * sx, H - P - 10 - (la - minLat) * sy] as const; };
  const labels = names.map((f) => {
    const pts = wells.filter((w) => w.field === f).map(xy);
    const ys = pts.map((p) => p[1]);
    const cx = pts.reduce((t, p) => t + p[0], 0) / pts.length;
    const top = Math.min(...ys), bottom = Math.max(...ys);
    return { f, x: Math.min(Math.max(cx, 48), W - 48), y: (top + bottom) / 2 < H / 2 ? Math.max(top - 12, 12) : Math.min(bottom + 20, H - 4) };
  });
  const open = wells.filter((w) => w.open_incident);
  const down = wells.filter((w) => w.status !== "producing").length;
  return (
    <figure className="fmap">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Well map: ${wells.length} wells in ${names.length} fields, ${wells.length - down} producing, ${down} down, ${open.length} with an open incident`}>
        {labels.map((l) => <text key={l.f} className="fn" x={l.x} y={l.y} textAnchor="middle">{l.f}</text>)}
        {wells.filter((w) => !w.open_incident).map((w) => {
          const [x, y] = xy(w);
          const up = w.status === "producing";
          return <circle key={w.well_id} className={up ? "w-up" : "w-dn"} cx={x} cy={y} r={up ? 3 : 4}><title>{`${w.well_id} ${up ? "producing" : "down"}`}</title></circle>;
        })}
        {open.map((w) => {
          const [x, y] = xy(w);
          return (
            <g key={w.well_id}>
              <circle className={`w-inc${w.status === "producing" ? "" : " dn"}`} cx={x} cy={y} r={4.5}><title>{`${w.well_id} open incident`}</title></circle>
              <text x={x + 8} y={y + 3}>{w.well_id}</text>
            </g>
          );
        })}
      </svg>
      <figcaption className="legend"><span><i />Producing</span><span><i className="dn" />Down</span><span><i className="inc" />Open incident</span></figcaption>
    </figure>
  );
}

export function Intro({ m }: { m: Morning | null }) {
  return (
    <>
      <p className="eyebrow">{m ? `Demo workspace · ${weekday(m.today)} ${longDate(m.today)}` : "Demo workspace"}</p>
      <h1 className="h1">You run an oil field. Ask it what went wrong.</h1>
      <p className="lede">
        You run operations for a fictional oil company in the desert: 3 fields, {m?.wells_total ?? 41} <Term k="well">wells</Term>, and crews who write a <Term k="shift" /> every shift and an <Term k="incident" /> for every problem. Every barrel a well does not produce is money lost.
      </p>
    </>
  );
}

export function Snapshot({ m }: { m: Morning }) {
  const fields = [...new Set(m.wells.map((w) => w.field))];
  return (
    <section className="block" aria-labelledby="snap-t">
      <div className="sec-h"><h2 id="snap-t">Your field this morning, {longDate(m.today)}</h2><span>{fields.join(", ")}</span></div>
      <div className="snap">
        <dl className="tiles">
          <div className="tile"><dt>Wells</dt><dd>{m.wells_total}</dd></div>
          <div className="tile"><dt>Producing</dt><dd>{m.wells_producing}</dd></div>
          <div className="tile"><dt>Down</dt><dd>{m.wells_down}</dd></div>
          <div className="tile"><dt>Open incidents</dt><dd>{m.open_incidents}</dd><span className="sub">{m.shut_in_by_incident} wells <Term k="shutin" /></span></div>
          <div className="tile span2"><dt>Produced yesterday</dt><dd>{n(m.oil_yesterday)}<small><Term k="bbl">barrels</Term></small></dd></div>
          <div className="tile span2"><dt>Lost this month to downtime</dt><dd>{round100(m.lost_month_bbl)}<small>barrels</small></dd><span className="sub">About {usd(m.lost_month_bbl)} at an assumed ${PRICE_PER_BBL} a barrel</span></div>
        </dl>
        <FieldMap wells={m.wells} />
      </div>
    </section>
  );
}

export function Briefing({ m, onPick, onDemo }: { m: Morning | null; onPick: (q: string) => void; onDemo: () => void }) {
  const s = m?.stakes;
  const stakes = s && m ? [
    `${m.open_incidents} incidents open this morning, ${m.shut_in_by_incident} wells shut in`,
    `W-17 down ${s.w17_days} days in March: about ${round100(s.w17_lost_bbl)} barrels, ${usd(s.w17_lost_bbl)}* lost`,
    `${s.esp_workovers} pump replacements since May 2025: about ${round100(s.esp_lost_bbl)} barrels, ${usd(s.esp_lost_bbl)}* lost`,
    `Wadi Field water cut: ${s.wadi_wc_january}% in January, ${s.wadi_wc_now}% now`,
    `Sand alarm on ${s.sand_well} since ${longDate(s.sand_since)}, ${s.sand_days} days ago`,
  ] : [];
  return (
    <section className="block" id="briefing" aria-labelledby="brief-t">
      <div className="sec-h">
        <h2 id="brief-t">Morning briefing</h2>
        {m ? <button type="button" className="btn btn-ghost" onClick={onDemo}><Play weight="fill" aria-hidden />Watch the demo: W-17</button> : <span>{SUGGESTED.length} questions</span>}
      </div>
      <ol className="rows">
        {SUGGESTED.map((q, i) => (
          <li key={q}>
            <a href={`/?q=${encodeURIComponent(q)}`} onClick={(e) => { e.preventDefault(); onPick(q); }}>
              <span className="n">{i + 1}</span>
              <span className="q"><span>{q}</span>{stakes[i] && <span className="st">{stakes[i]}</span>}</span>
              <ArrowRight className="go" aria-hidden />
            </a>
          </li>
        ))}
      </ol>
      {m && <p className="note-s">* {PRICE_NOTE}</p>}
      <p className="glossary"><span className="faint">Words used here:</span> {(Object.keys(GLOSSARY) as TermKey[]).map((k) => <Term key={k} k={k} />)}</p>
    </section>
  );
}

export function HowItWorks() {
  return (
    <section className="block" aria-labelledby="how3-t">
      <div className="sec-h"><h2 id="how3-t">How it works in 3 steps</h2></div>
      <ol className="trio">
        <li><h3><ChatCircleText aria-hidden />1. You ask</h3><p>A question in your own words, like you would ask a colleague.</p></li>
        <li><h3><ListMagnifyingGlass aria-hidden />2. It looks through the reports and the data</h3><p>It picks the few passages and numbers that matter out of thousands.</p></li>
        <li><h3><SealCheck aria-hidden />3. It answers and shows its sources</h3><p>Every fact links to the report it came from, so you can check it.</p></li>
      </ol>
    </section>
  );
}

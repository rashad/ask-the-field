"use client";
import { ArrowRight, BookOpenText, ChartLine, FileText, MapTrifold, Play, Repeat } from "@phosphor-icons/react/ssr";
import { about, PRICE_NOTE, usd } from "@/lib/money";
import { SUGGESTED } from "@/lib/questions";
import type { MapWell, Morning } from "@/lib/stakes";
import { Term, GLOSSARY, type TermKey } from "./term";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const longDate = (d: string) => `${Number(d.slice(8, 10))} ${MONTHS[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`;
const n = (x: number) => x.toLocaleString("en-US");

function FieldMap({ wells }: { wells: MapWell[] }) {
  const W = 300, H = 168, P = 20;
  const centre = new Map([...new Set(wells.map((w) => w.field))].map((f) => {
    const fw = wells.filter((w) => w.field === f);
    return [f, [fw.reduce((t, w) => t + w.lat, 0) / fw.length, fw.reduce((t, w) => t + w.lon, 0) / fw.length]] as const;
  }));
  // Fields sit far apart; spreading each cluster around its centre keeps the wells readable at this size.
  const pos = new Map(wells.map((w) => { const [la, lo] = centre.get(w.field)!; return [w.well_id, [la + (w.lat - la) * 1.8, lo + (w.lon - lo) * 1.8]] as const; }));
  const lats = [...pos.values()].map((p) => p[0]), lons = [...pos.values()].map((p) => p[1]);
  const [minLat, maxLat, minLon, maxLon] = [Math.min(...lats), Math.max(...lats), Math.min(...lons), Math.max(...lons)];
  const kx = Math.cos(((minLat + maxLat) / 2) * (Math.PI / 180));
  const scale = Math.min((W - 2 * P - 150) / ((maxLon - minLon) * kx), (H - 2 * P - 10) / (maxLat - minLat));
  const ox = (W - (maxLon - minLon) * kx * scale) / 2, oy = (H - (maxLat - minLat) * scale) / 2 - 4;
  const xy = (w: MapWell) => { const [la, lo] = pos.get(w.well_id)!; return [ox + (lo - minLon) * kx * scale, H - oy - (la - minLat) * scale] as const; };
  const fields = [...new Set(wells.map((w) => w.field))].map((f) => {
    const pts = wells.filter((w) => w.field === f).map(xy);
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    return { f, cx: (Math.min(...xs) + Math.max(...xs)) / 2, cy: (Math.min(...ys) + Math.max(...ys)) / 2, rx: (Math.max(...xs) - Math.min(...xs)) / 2 + 9, ry: (Math.max(...ys) - Math.min(...ys)) / 2 + 9 };
  });
  const open = wells.filter((w) => w.open_incident).length;
  return (
    <figure className="fmap">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Map of the ${fields.length} fields and ${wells.length} wells; ${open} wells have an open incident`}>
        {fields.map((f) => (
          <g key={f.f}>
            <ellipse cx={f.cx} cy={f.cy} rx={f.rx} ry={f.ry} className="fm-field" />
            {f.cx === Math.min(...fields.map((g) => g.cx)) ? <text x={f.cx - f.rx - 5} y={f.cy + 3} className="fm-label" textAnchor="end">{f.f}</text>
              : f.cy === Math.max(...fields.map((g) => g.cy)) ? <text x={f.cx + f.rx + 5} y={f.cy + 3} className="fm-label">{f.f}</text>
              : <text x={f.cx} y={Math.max(f.cy - f.ry - 5, 10)} className="fm-label" textAnchor="middle">{f.f}</text>}
          </g>
        ))}
        {wells.map((w) => {
          const [x, y] = xy(w);
          return w.open_incident ? null : <circle key={w.well_id} cx={x} cy={y} r={2.6} className={w.status === "producing" ? "fm-on" : "fm-off"} />;
        })}
        {wells.filter((w) => w.open_incident).map((w) => {
          const [x, y] = xy(w);
          return <circle key={w.well_id} cx={x} cy={y} r={4.5} className="fm-inc"><title>{`${w.well_id}: open incident`}</title></circle>;
        })}
      </svg>
      <figcaption className="caption-4 mute"><i className="dot" style={{ background: "var(--ink)" }} />producing <i className="dot dot-ring" />down <i className="dot" style={{ background: "var(--bad)" }} />open incident</figcaption>
    </figure>
  );
}

export function Scene({ m }: { m: Morning }) {
  return (
    <div className="scene">
      <p className="caption-3 eyebrow">Ask the Field, a demo with invented data</p>
      <h1 className="hero-title heading-2">You run an oil field. Ask it what went wrong.</h1>
      <p className="scene-lead body-3">
        You run operations for a fictional oil company in the desert: 3 fields, {m.wells_total} <Term k="well">wells</Term>, and crews who write a <Term k="shift" /> every shift and an <Term k="incident" /> for every problem. Every barrel a well does not produce is money lost.
      </p>
      <section className="card morning" aria-labelledby="morning-t">
        <div className="morning-kpis">
          <h2 id="morning-t" className="caption-3 mute morning-k">Your field this morning, {longDate(m.today)}</h2>
          <dl>
            <div><dt className="caption-4 mute">Oil produced yesterday</dt><dd><b className="title-1">{n(m.oil_yesterday)}</b> <span className="body-6"><Term k="bbl">barrels</Term></span></dd></div>
            <div><dt className="caption-4 mute">Wells producing</dt><dd><b className="title-1">{m.wells_producing} of {m.wells_total}</b> <span className="body-6">{m.wells_down} down</span></dd></div>
            <div><dt className="caption-4 mute">Open incidents</dt><dd><b className="title-1 neg">{m.open_incidents}</b> <span className="body-6">{m.shut_in_by_incident} wells <Term k="shutin" /></span></dd></div>
            <div><dt className="caption-4 mute">Lost this month to downtime</dt><dd><b className="title-1">{about(m.lost_month_bbl)}</b> <span className="body-6">barrels, about {usd(m.lost_month_bbl)}*</span></dd></div>
          </dl>
          <p className="caption-4 mute morning-note">* {PRICE_NOTE}</p>
        </div>
        <FieldMap wells={m.wells} />
      </section>
    </div>
  );
}

export function Briefing({ m, onPick, onDemo }: { m: Morning; onPick: (q: string) => void; onDemo: () => void }) {
  const s = m.stakes;
  const items = [
    [MapTrifold, `${m.open_incidents} incidents open this morning, ${m.shut_in_by_incident} wells shut in`, "On a map, with the note behind each one"],
    [FileText, `W-17 down ${s.w17_days} days in March: about ${about(s.w17_lost_bbl)} barrels, ${usd(s.w17_lost_bbl)}* lost`, "The cause, read from the incident notes"],
    [Repeat, `${s.esp_workovers} pump replacements since May 2025: about ${about(s.esp_lost_bbl)} barrels, ${usd(s.esp_lost_bbl)}* lost`, "Connects notes written months apart"],
    [ChartLine, `Wadi Field water cut: ${s.wadi_wc_january}% in January, ${s.wadi_wc_now}% now`, "The trend, month by month"],
    [BookOpenText, `Sand alarm on ${s.sand_well} since ${longDate(s.sand_since)}, ${s.sand_days} days ago`, "The alarm and the procedure to follow"],
  ] as const;
  return (
    <div className="hero-sug brief">
      <div className="sug-head">
        <div>
          <h2 className="title-3">Your morning briefing</h2>
          <p className="body-6 mute">Five questions, in the order an operations manager asks them.</p>
        </div>
        <button type="button" className="btn btn-ghost button-sm" onClick={onDemo}><Play weight="fill" aria-hidden />Watch the demo: W-17</button>
      </div>
      <ol className="sug">
        {items.map(([Icon, stake, hint], i) => {
          const q = SUGGESTED[i];
          return (
            <li key={q}>
              <a href={`/?q=${encodeURIComponent(q)}`} onClick={(e) => { e.preventDefault(); onPick(q); }}>
                <span className="ic"><Icon aria-hidden /></span>
                <span className="txt">
                  <span className="caption-4 stake">{i + 1}. {stake}</span>
                  <span className="title-3" style={{ display: "block" }}>{q}</span>
                  <span className="caption-4 mute">{hint}</span>
                </span>
                <ArrowRight className="go" aria-hidden />
              </a>
            </li>
          );
        })}
      </ol>
      <p className="caption-4 mute brief-note">* {PRICE_NOTE}</p>
      <p className="glossary body-6"><span className="mute">Words used here:</span> {(Object.keys(GLOSSARY) as TermKey[]).map((k) => <Term key={k} k={k} />)}</p>
    </div>
  );
}

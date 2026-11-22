"use client";
import { useEffect, useRef, useState } from "react";
import { monthYear, shortDate } from "@/lib/domain";

export interface MapWell { well_id: string; field: string; lat: number; lon: number; status: string; highlighted: boolean }
export interface EventRow { event_id: string; well_id: string; field: string; type: string; start_date: string; status: string; severity: string | null; category: string }

type Viz =
  | { type: "map"; title: string; wells: MapWell[]; highlighted: string[] }
  | { type: "line"; title: string; unit: string; series: { name: string; points: { x: string; y: number }[] }[] }
  | { type: "bar"; title: string; unit: string; bars: { label: string; value: number }[] }
  | { type: "none" };

const STATUS: Record<string, [string, string]> = {
  producing: ["#0B1B3A", "Producing"],
  shut_in: ["#6A7590", "Shut in"],
  workover: ["#5A8BD0", "Workover"],
  suspended: ["#A9B0C0", "Suspended"],
};
const SERIES = ["#0B1B3A", "#5A8BD0", "#6A7590", "#A9B0C0"];
const ORANGE = "#F04E0E";
const fmt = (n: number) => (Math.abs(n) < 1 && n !== 0 ? n.toFixed(3) : Math.round(n).toLocaleString("en-US"));
const pointLabel = (d: string, monthly: boolean) =>
  /^\d{4}-\d{2}$/.test(d) || (monthly && /^\d{4}-\d{2}-01$/.test(d)) ? monthYear(d, true) : /^\d{4}-\d{2}-\d{2}$/.test(d) ? shortDate(d) : d;

function useWidth(fallback: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width) || fallback));
    ro.observe(el);
    return () => ro.disconnect();
  }, [fallback]);
  return [ref, width] as const;
}

function niceStep(span: number, count: number) {
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
}

export function VizCard({ viz, events }: { viz: Viz; events: EventRow[] }) {
  if (viz.type === "none") return null;
  return (
    <section className="card pad" aria-labelledby="vt">
      {viz.type === "map" ? <MapViz viz={viz} events={events} /> : viz.type === "bar" ? <BarViz viz={viz} /> : <LineViz viz={viz} />}
    </section>
  );
}

function spread(points: { x: number; y: number }[], r: number, W: number, H: number) {
  const out = points.map((p, i) => ({ x: p.x + Math.cos(i * 2.4) * 0.5, y: p.y + Math.sin(i * 2.4) * 0.5 }));
  const min = 2 * r + 6;
  for (let it = 0; it < 200; it++) {
    let moved = false;
    for (let i = 0; i < out.length; i++)
      for (let j = i + 1; j < out.length; j++) {
        const dx = out[j].x - out[i].x, dy = out[j].y - out[i].y;
        const d = Math.hypot(dx, dy) || 0.01;
        if (d >= min) continue;
        const push = (min - d) / 2;
        out[i].x -= (dx / d) * push; out[i].y -= (dy / d) * push;
        out[j].x += (dx / d) * push; out[j].y += (dy / d) * push;
        moved = true;
      }
    for (const p of out) {
      p.x = Math.min(W - r - 2, Math.max(r + 2, p.x));
      p.y = Math.min(H - r - 2, Math.max(r + 2, p.y));
    }
    if (!moved) break;
  }
  return out;
}

function MapViz({ viz, events }: { viz: Extract<Viz, { type: "map" }>; events: EventRow[] }) {
  const [ref, W] = useWidth(800);
  const narrow = W < 560;
  const P = narrow ? 28 : 44;
  const lats = viz.wells.map((w) => w.lat), lons = viz.wells.map((w) => w.lon);
  const [minLat, maxLat, minLon, maxLon] = [Math.min(...lats), Math.max(...lats), Math.min(...lons), Math.max(...lons)];
  const kx = Math.cos(((minLat + maxLat) / 2) * (Math.PI / 180));
  const spanX = Math.max((maxLon - minLon) * kx, 1e-6), spanY = Math.max(maxLat - minLat, 1e-6);
  const H = Math.round(Math.min(Math.max((spanY / spanX) * (W - 2 * P) + 2 * P + 16, narrow ? 300 : 320), narrow ? 440 : 520));
  const scale = Math.min((W - 2 * P) / spanX, (H - 2 * P - 16) / spanY);
  const ox = (W - spanX * scale) / 2, oy = (H - spanY * scale) / 2 + 8;
  const xy = (w: MapWell) => [ox + (w.lon - minLon) * kx * scale, H - oy - (w.lat - minLat) * scale] as const;
  const order = viz.highlighted.filter((id) => viz.wells.some((w) => w.well_id === id));
  const fields = [...new Set(viz.wells.map((w) => w.field))].map((f) => {
    const pts = viz.wells.filter((w) => w.field === f).map(xy);
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const pad = narrow ? 14 : 22;
    return { f, cx: (Math.min(...xs) + Math.max(...xs)) / 2, cy: (Math.min(...ys) + Math.max(...ys)) / 2, rx: (Math.max(...xs) - Math.min(...xs)) / 2 + pad, ry: (Math.max(...ys) - Math.min(...ys)) / 2 + pad };
  });
  const R = 11;
  const anchors = order.map((id) => { const [x, y] = xy(viz.wells.find((w) => w.well_id === id)!); return { x, y }; });
  const pins = spread(anchors, R, W, H);
  const counts = Object.entries(STATUS).map(([k, [c, l]]) => [c, l, viz.wells.filter((w) => w.status === k).length] as const).filter(([, , n]) => n > 0);
  const eventFor = (id: string) => events.find((e) => e.well_id === id && e.status === "open") ?? events.find((e) => e.well_id === id);
  return (
    <>
      <div className="viz-head">
        <h2 id="vt" className="title-4">{viz.title}</h2>
        <div className="legend caption-4" aria-label="Well status">
          {counts.map(([c, l, n]) => <span key={l}><i className="dot" style={{ background: c }} />{l} <span className="mono">{n}</span></span>)}
          {order.length > 0 && <span><i className="dot" style={{ background: ORANGE }} />In this answer <span className="mono">{order.length}</span></span>}
        </div>
      </div>
      <div className={order.length ? "mapgrid" : undefined}>
        <div className="mapbox" ref={ref}>
          <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={`Map of ${viz.wells.length} wells, ${order.length} in this answer`}>
            <rect width={W} height={H} fill="#FFFFFF" />
            {fields.map((f) => (
              <g key={f.f}>
                <ellipse cx={f.cx} cy={f.cy} rx={f.rx} ry={f.ry} fill="#F3F3EF" stroke="#8F99AE" strokeDasharray="4 5" />
                <text x={f.cx} y={Math.max(f.cy - f.ry - 8, 14)} fontSize="13" fill="#566280" fontWeight="600" textAnchor="middle">{f.f}</text>
              </g>
            ))}
            {viz.wells.filter((w) => !order.includes(w.well_id)).map((w) => {
              const [x, y] = xy(w);
              return (
                <g key={w.well_id} className="well">
                  <title>{`${w.well_id}, ${w.field}, ${STATUS[w.status]?.[1] ?? w.status}`}</title>
                  <circle cx={x} cy={y} r={narrow ? 3.5 : 4.5} fill={STATUS[w.status]?.[0] ?? "#0B1B3A"} stroke="#FFFFFF" strokeWidth="1" />
                </g>
              );
            })}
            {order.map((id, i) => {
              const a = anchors[i], p = pins[i];
              const moved = Math.hypot(p.x - a.x, p.y - a.y) > 4;
              return moved ? (
                <g key={`l-${id}`}>
                  <line x1={a.x} y1={a.y} x2={p.x} y2={p.y} stroke={ORANGE} strokeWidth="1.5" />
                  <circle cx={a.x} cy={a.y} r="3.5" fill={ORANGE} stroke="#FFFFFF" strokeWidth="1" />
                </g>
              ) : null;
            })}
            {order.map((id, i) => {
              const w = viz.wells.find((x) => x.well_id === id)!;
              const p = pins[i];
              return (
                <g key={id} className="mk" role="img" aria-label={`${i + 1}, ${id}, ${w.field}`}>
                  <title>{`${i + 1}, ${id}, ${w.field}, ${STATUS[w.status]?.[1] ?? w.status}`}</title>
                  <circle className="pulse" cx={p.x} cy={p.y} r={R + 2} fill="none" stroke={ORANGE} strokeWidth="2" />
                  <g className="body"><circle cx={p.x} cy={p.y} r={R} fill={ORANGE} stroke="#FFFFFF" strokeWidth="1.5" /><text x={p.x} y={p.y}>{i + 1}</text></g>
                </g>
              );
            })}
          </svg>
        </div>
        {order.length > 0 && (
          <ol className="incs" aria-label="Wells in this answer">
            {order.map((id, i) => {
              const w = viz.wells.find((x) => x.well_id === id)!;
              const e = eventFor(id);
              return (
                <li key={id}>
                  <span className="num mono caption-3">{i + 1}</span>
                  <div style={{ minWidth: 0 }}>
                    <p className="body-5"><span className="mono">{id}</span> {e ? e.type : STATUS[w.status]?.[1]}</p>
                    <p className="caption-4 mute">{w.field}{e ? `, ${e.status === "open" ? "opened" : "started"} ${shortDate(e.start_date)}${e.severity ? `, ${e.severity} severity` : ""}` : ""}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </>
  );
}

function BarViz({ viz: raw }: { viz: Extract<Viz, { type: "bar" }> }) {
  const fraction = /fraction/.test(raw.unit);
  const viz = fraction ? { ...raw, unit: raw.unit.replace("fraction change", "points change").replace("fraction", "%"), bars: raw.bars.map((b) => ({ ...b, value: Number((b.value * 100).toFixed(1)) })) } : raw;
  const max = Math.max(...viz.bars.map((b) => Math.abs(b.value)), 1e-9);
  return (
    <>
      <div className="viz-head"><div><h2 id="vt" className="title-4">{viz.title}</h2><p className="caption-4 mute">{viz.unit}</p></div></div>
      <ol className="bars">
        {viz.bars.map((b, i) => (
          <li key={b.label + i} className="bar-row">
            <p className="mono body-5">{b.label}</p>
            <svg viewBox="0 0 400 24" preserveAspectRatio="none" role="img" aria-label={`${b.label} ${fmt(b.value)} ${viz.unit}`}>
              <rect width="400" height="24" fill="#E4E6EB" />
              <rect width={(400 * Math.abs(b.value)) / max} height="24" fill="#0B1B3A" fillOpacity={i === 0 ? 1 : 0.55} />
            </svg>
            <div className="val"><span className="mono body-5">{b.value > 0 && /change/i.test(viz.unit) ? "+" : ""}{fraction ? b.value.toFixed(1) : fmt(b.value)}</span><span className="mono caption-4 mute">{viz.unit}</span></div>
          </li>
        ))}
      </ol>
    </>
  );
}

function LineViz({ viz }: { viz: Extract<Viz, { type: "line" }> }) {
  const [ref, W] = useWidth(800);
  const narrow = W < 560;
  const H = narrow ? 240 : 300, L = narrow ? 44 : 56, R = 16, T = 16, B = 36;
  const pct = /fraction/i.test(viz.unit) || viz.series.every((s) => s.points.every((p) => p.y >= 0 && p.y <= 1)) && /water/i.test(viz.title + viz.unit);
  const k = pct ? 100 : 1;
  const unit = pct ? "% of the liquid produced is water" : viz.unit;
  const xs = [...new Set(viz.series.flatMap((s) => s.points.map((p) => p.x)))].sort();
  const ys = viz.series.flatMap((s) => s.points.map((p) => p.y * k));
  const dataMin = Math.min(0, ...ys), dataMax = Math.max(...ys, 0);
  const step = niceStep(dataMax - dataMin || 1, narrow ? 3 : 4);
  const lo = Math.floor(dataMin / step) * step, hi = Math.max(Math.ceil(dataMax / step) * step, lo + step);
  const ticks = Array.from({ length: Math.round((hi - lo) / step) + 1 }, (_, i) => lo + i * step);
  const x = (v: string) => L + (xs.length > 1 ? (xs.indexOf(v) / (xs.length - 1)) * (W - L - R) : (W - L - R) / 2);
  const y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const every = Math.max(1, Math.ceil(xs.length / Math.max(2, Math.floor((W - L) / 80))));
  const monthly = xs.every((d) => /^\d{4}-\d{2}(-01)?$/.test(d));
  const tick = (t: number) => (pct ? `${Number(t.toFixed(1))}%` : fmt(t));
  return (
    <>
      <div className="viz-head">
        <div><h2 id="vt" className="title-4">{viz.title}</h2><p className="caption-4 mute">{unit}</p></div>
        {viz.series.length > 1 && (
          <div className="legend caption-4">{viz.series.map((s, i) => <span key={s.name}><i className="dot" style={{ background: SERIES[i % SERIES.length] }} />{s.name}</span>)}</div>
        )}
      </div>
      <div className="chartbox" ref={ref}>
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={`${viz.title}, ${xs.length} points`}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke={t === 0 ? "#8F99AE" : "#E4E6EB"} />
              <text x={L - 8} y={y(t)} className="t-mono" fontSize="12" fill="#6A7590" textAnchor="end" dominantBaseline="central">{tick(t)}</text>
            </g>
          ))}
          {xs.map((v, i) => (i % every === 0 || i === xs.length - 1) && (i === xs.length - 1 || xs.length - 1 - i >= every / 2) && (
            <text key={v} x={x(v)} y={H - 12} className="t-mono" fontSize="12" fill="#6A7590" textAnchor={i === 0 ? "start" : i === xs.length - 1 ? "end" : "middle"}>{pointLabel(v, monthly).replace(/ \d{4}$/, "")}</text>
          ))}
          {viz.series.map((s, i) => (
            <g key={s.name}>
              <polyline fill="none" stroke={SERIES[i % SERIES.length]} strokeWidth="2" points={s.points.map((p) => `${x(p.x)},${y(p.y * k)}`).join(" ")} />
              {s.points.map((p) => <circle key={p.x} cx={x(p.x)} cy={y(p.y * k)} r="3" fill={SERIES[i % SERIES.length]}><title>{`${s.name}, ${pointLabel(p.x, monthly)}: ${pct ? `${(p.y * 100).toFixed(1)}%` : `${fmt(p.y)} ${viz.unit}`}`}</title></circle>)}
            </g>
          ))}
        </svg>
      </div>
    </>
  );
}

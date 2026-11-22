"use client";
import { useEffect, useRef, useState } from "react";
import { monthYear, shortDate } from "@/lib/domain";
import type { FinalViz as Viz, MapWell } from "@/lib/chart";
import type { EventRow } from "@/lib/tools";

const STATUS: Record<string, [string, string]> = {
  producing: ["", "Producing"],
  shut_in: ["dn", "Shut in"],
  workover: ["wo", "Workover"],
  suspended: ["su", "Suspended"],
};
const SERIES = 4;
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

export function VizCard({ viz, events, from }: { viz: Viz; events: EventRow[]; from: string | null }) {
  if (viz.type === "none") return null;
  return (
    <section className="chart" aria-labelledby="vt">
      {viz.type === "map" ? <MapViz viz={viz} events={events} /> : viz.type === "bar" ? <BarViz viz={viz} /> : <LineViz viz={viz} />}
      <p className="chart-f">The model picks the chart. {viz.type === "map" ? "The server reads the well coordinates from the database." : `The server fills the values from the rows that tool call ${viz.ref}${from ? ` (${from})` : ""} returned.`}</p>
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
  const [ref, W] = useWidth(600);
  const narrow = W < 480;
  const P = narrow ? 24 : 36;
  const lats = viz.wells.map((w) => w.lat), lons = viz.wells.map((w) => w.lon);
  const [minLat, maxLat, minLon, maxLon] = [Math.min(...lats), Math.max(...lats), Math.min(...lons), Math.max(...lons)];
  const kx = Math.cos(((minLat + maxLat) / 2) * (Math.PI / 180));
  const spanX = Math.max((maxLon - minLon) * kx, 1e-6), spanY = Math.max(maxLat - minLat, 1e-6);
  const H = Math.round(Math.min(Math.max((spanY / spanX) * (W - 2 * P) + 2 * P + 16, narrow ? 260 : 300), narrow ? 400 : 460));
  const scale = Math.min((W - 2 * P) / spanX, (H - 2 * P - 16) / spanY);
  const ox = (W - spanX * scale) / 2, oy = (H - spanY * scale) / 2 + 8;
  const xy = (w: MapWell) => [ox + (w.lon - minLon) * kx * scale, H - oy - (w.lat - minLat) * scale] as const;
  const order = viz.highlighted.filter((id) => viz.wells.some((w) => w.well_id === id));
  const fields = [...new Set(viz.wells.map((w) => w.field))].map((f) => {
    const pts = viz.wells.filter((w) => w.field === f).map(xy);
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const pad = narrow ? 12 : 18;
    return { f, cx: (Math.min(...xs) + Math.max(...xs)) / 2, cy: (Math.min(...ys) + Math.max(...ys)) / 2, rx: (Math.max(...xs) - Math.min(...xs)) / 2 + pad, ry: (Math.max(...ys) - Math.min(...ys)) / 2 + pad };
  });
  const R = 10;
  const anchors = order.map((id) => { const [x, y] = xy(viz.wells.find((w) => w.well_id === id)!); return { x, y }; });
  const pins = spread(anchors, R, W, H);
  const counts = Object.entries(STATUS).map(([k, [c, l]]) => [c, l, viz.wells.filter((w) => w.status === k).length] as const).filter(([, , n]) => n > 0);
  const eventFor = (id: string) => events.find((e) => e.well_id === id && e.status === "open") ?? events.find((e) => e.well_id === id);
  return (
    <>
      <div className="chart-h">
        <h2 id="vt">{viz.title}</h2>
        <div className="legend" aria-label="Well status">
          {counts.map(([c, l, n]) => <span key={l}><i className={c} />{l} <span className="mono">{n}</span></span>)}
          {order.length > 0 && <span><i className="inc" />In this answer <span className="mono">{order.length}</span></span>}
        </div>
      </div>
      <div className={order.length ? "mapgrid" : undefined} style={order.length ? undefined : { marginTop: 16 }}>
        <div className="mapbox" ref={ref}>
          <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={`Map of ${viz.wells.length} wells, ${order.length} in this answer`}>
            {fields.map((f) => (
              <g key={f.f}>
                <ellipse className="fe" cx={f.cx} cy={f.cy} rx={f.rx} ry={f.ry} />
                <text className="fl" x={f.cx} y={Math.max(f.cy - f.ry - 8, 14)} textAnchor="middle">{f.f}</text>
              </g>
            ))}
            {viz.wells.filter((w) => !order.includes(w.well_id)).map((w) => {
              const [x, y] = xy(w);
              return (
                <circle key={w.well_id} className={`st-${STATUS[w.status] ? w.status : "producing"}`} cx={x} cy={y} r={narrow ? 3 : 4}>
                  <title>{`${w.well_id}, ${w.field}, ${STATUS[w.status]?.[1] ?? w.status}`}</title>
                </circle>
              );
            })}
            {order.map((id, i) => {
              const a = anchors[i], p = pins[i];
              return Math.hypot(p.x - a.x, p.y - a.y) > 4 ? (
                <g key={`l-${id}`}>
                  <line className="pin-l" x1={a.x} y1={a.y} x2={p.x} y2={p.y} />
                  <circle className="pin" cx={a.x} cy={a.y} r="3" />
                </g>
              ) : null;
            })}
            {order.map((id, i) => {
              const w = viz.wells.find((x) => x.well_id === id)!;
              const p = pins[i];
              return (
                <g key={id} role="img" aria-label={`${i + 1}, ${id}, ${w.field}`}>
                  <title>{`${i + 1}, ${id}, ${w.field}, ${STATUS[w.status]?.[1] ?? w.status}`}</title>
                  <circle className="pin" cx={p.x} cy={p.y} r={R} />
                  <text className="pin-t" x={p.x} y={p.y}>{i + 1}</text>
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
                  <span className="num">{i + 1}</span>
                  <div style={{ minWidth: 0 }}>
                    <p><span className="mono">{id}</span> {e ? e.type : STATUS[w.status]?.[1]}</p>
                    <p>{w.field}{e ? `, ${e.status === "open" ? "opened" : "started"} ${shortDate(e.start_date)}${e.severity ? `, ${e.severity} severity` : ""}` : ""}</p>
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
      <div className="chart-h"><h2 id="vt">{viz.title}</h2><span className="unit">{viz.unit}</span></div>
      <ol className="bars">
        {viz.bars.map((b, i) => (
          <li key={b.label + i} className={`bar${i === 0 ? " hl" : ""}`}>
            <span className="lab" title={b.label}>{b.label}</span>
            <span className="track" role="img" aria-label={`${b.label} ${fmt(b.value)} ${viz.unit}`}><i style={{ width: `${(100 * Math.abs(b.value)) / max}%` }} /></span>
            <span className="val">{b.value > 0 && /change/i.test(viz.unit) ? "+" : ""}{fraction ? b.value.toFixed(1) : fmt(b.value)}</span>
          </li>
        ))}
      </ol>
    </>
  );
}

function LineViz({ viz }: { viz: Extract<Viz, { type: "line" }> }) {
  const [ref, W] = useWidth(600);
  const narrow = W < 480;
  const H = narrow ? 220 : 260, L = narrow ? 40 : 52, R = 12, T = 12, B = 28;
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
  const every = Math.max(1, Math.ceil(xs.length / Math.max(2, Math.floor((W - L) / 72))));
  const monthly = xs.every((d) => /^\d{4}-\d{2}(-01)?$/.test(d));
  const tick = (t: number) => (pct ? `${Number(t.toFixed(1))}%` : fmt(t));
  return (
    <>
      <div className="chart-h">
        <h2 id="vt">{viz.title}</h2><span className="unit">{unit}</span>
        {viz.series.length > 1 && <div className="legend">{viz.series.map((s, i) => <span key={s.name}><i className={`s${i % SERIES}`} />{s.name}</span>)}</div>}
      </div>
      <div className="plot" ref={ref}>
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={`${viz.title}, ${xs.length} points`}>
          {ticks.map((t) => (
            <g key={t}>
              <line className={t === 0 ? "zero" : "grid"} x1={L} x2={W - R} y1={y(t)} y2={y(t)} />
              <text x={L - 8} y={y(t)} textAnchor="end" dominantBaseline="central">{tick(t)}</text>
            </g>
          ))}
          {xs.map((v, i) => (i % every === 0 || i === xs.length - 1) && (i === xs.length - 1 || xs.length - 1 - i >= every / 2) && (
            <text key={v} x={x(v)} y={H - 8} textAnchor={i === 0 ? "start" : i === xs.length - 1 ? "end" : "middle"}>{pointLabel(v, monthly).replace(/ \d{4}$/, "")}</text>
          ))}
          {viz.series.map((s, i) => (
            <g key={s.name} className={`s${i % SERIES}`}>
              <polyline points={s.points.map((p) => `${x(p.x)},${y(p.y * k)}`).join(" ")} />
              {s.points.map((p) => <circle key={p.x} cx={x(p.x)} cy={y(p.y * k)} r="3"><title>{`${s.name}, ${pointLabel(p.x, monthly)}: ${pct ? `${(p.y * 100).toFixed(1)}%` : `${fmt(p.y)} ${viz.unit}`}`}</title></circle>)}
            </g>
          ))}
        </svg>
      </div>
    </>
  );
}

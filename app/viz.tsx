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
const fmt = (n: number) => (Math.abs(n) < 1 && n !== 0 ? n.toFixed(3) : Math.round(n).toLocaleString("en-US"));
const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const shortDate = (d: string) => `${Number(d.slice(8, 10))} ${MONTH[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`;
const pointLabel = (d: string, monthly: boolean) =>
  /^\d{4}-\d{2}$/.test(d) || (monthly && /^\d{4}-\d{2}-01$/.test(d)) ? `${MONTH[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}` : /^\d{4}-\d{2}-\d{2}$/.test(d) ? shortDate(d) : d;

export function VizCard({ viz, events }: { viz: Viz; events: EventRow[] }) {
  if (viz.type === "none") return null;
  return (
    <section className="card pad" aria-labelledby="vt">
      {viz.type === "map" ? <MapViz viz={viz} events={events} /> : viz.type === "bar" ? <BarViz viz={viz} /> : <LineViz viz={viz} />}
    </section>
  );
}

function MapViz({ viz, events }: { viz: Extract<Viz, { type: "map" }>; events: EventRow[] }) {
  const W = 800, H = 500, P = 48;
  const lats = viz.wells.map((w) => w.lat), lons = viz.wells.map((w) => w.lon);
  const [minLat, maxLat, minLon, maxLon] = [Math.min(...lats), Math.max(...lats), Math.min(...lons), Math.max(...lons)];
  const kx = Math.cos(((minLat + maxLat) / 2) * (Math.PI / 180));
  const scale = Math.min((W - 2 * P) / Math.max((maxLon - minLon) * kx, 1e-6), (H - 2 * P) / Math.max(maxLat - minLat, 1e-6));
  const ox = (W - (maxLon - minLon) * kx * scale) / 2, oy = (H - (maxLat - minLat) * scale) / 2;
  const xy = (w: MapWell) => [ox + (w.lon - minLon) * kx * scale, H - oy - (w.lat - minLat) * scale] as const;
  const order = viz.highlighted.filter((id) => viz.wells.some((w) => w.well_id === id));
  const fields = [...new Set(viz.wells.map((w) => w.field))].map((f) => {
    const pts = viz.wells.filter((w) => w.field === f).map(xy);
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    return { f, cx: (Math.min(...xs) + Math.max(...xs)) / 2, cy: (Math.min(...ys) + Math.max(...ys)) / 2, rx: (Math.max(...xs) - Math.min(...xs)) / 2 + 28, ry: (Math.max(...ys) - Math.min(...ys)) / 2 + 28 };
  });
  const counts = Object.entries(STATUS).map(([k, [c, l]]) => [c, l, viz.wells.filter((w) => w.status === k).length] as const).filter(([, , n]) => n > 0);
  const eventFor = (id: string) => events.find((e) => e.well_id === id && e.status === "open") ?? events.find((e) => e.well_id === id);
  return (
    <>
      <div className="viz-head">
        <h2 id="vt" className="title-4">{viz.title}</h2>
        <div className="legend caption-4" aria-label="Well status">
          {counts.map(([c, l, n]) => <span key={l}><i className="dot" style={{ background: c }} />{l} <span className="mono">{n}</span></span>)}
          {order.length > 0 && <span><i className="dot" style={{ background: "#F04E0E" }} />In this answer <span className="mono">{order.length}</span></span>}
        </div>
      </div>
      <div className={order.length ? "mapgrid" : undefined}>
        <div className="mapbox">
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Map of ${viz.wells.length} wells, ${order.length} in this answer`}>
            <rect width={W} height={H} fill="#FFFFFF" />
            {fields.map((f) => (
              <g key={f.f}>
                <ellipse cx={f.cx} cy={f.cy} rx={f.rx} ry={f.ry} fill="none" stroke="#8F99AE" strokeDasharray="4 5" />
                <text x={f.cx} y={f.cy - f.ry - 8 < 16 ? f.cy - f.ry + 20 : f.cy - f.ry - 8} fontSize="14" fill="#6A7590" fontWeight="500" textAnchor="middle">{f.f}</text>
              </g>
            ))}
            {viz.wells.filter((w) => !order.includes(w.well_id)).map((w) => {
              const [x, y] = xy(w);
              return (
                <g key={w.well_id} className="well">
                  <title>{`${w.well_id}, ${w.field}, ${STATUS[w.status]?.[1] ?? w.status}`}</title>
                  <circle cx={x} cy={y} r="5" fill={STATUS[w.status]?.[0] ?? "#0B1B3A"} stroke="#FFFFFF" strokeWidth="1.5" />
                </g>
              );
            })}
            {order.map((id, i) => {
              const w = viz.wells.find((x) => x.well_id === id)!;
              const [x, y] = xy(w);
              return (
                <g key={id} className="mk" role="img" aria-label={`${i + 1}, ${id}, ${w.field}`}>
                  <title>{`${i + 1}, ${id}, ${w.field}, ${STATUS[w.status]?.[1] ?? w.status}`}</title>
                  <circle className="pulse" cx={x} cy={y} r="14" fill="none" stroke="#F04E0E" strokeWidth="2" />
                  <g className="body"><circle cx={x} cy={y} r="12" fill="#F04E0E" stroke="#FFFFFF" strokeWidth="1.5" /><text x={x} y={y}>{i + 1}</text></g>
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
                    {e && <p className="caption-5 mute mono">{e.event_id}</p>}
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

function BarViz({ viz }: { viz: Extract<Viz, { type: "bar" }> }) {
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
            <div className="val"><span className="mono body-5">{b.value > 0 && /%|change/i.test(viz.unit) ? "+" : ""}{fmt(b.value)}</span><span className="mono caption-4 mute">{viz.unit}</span></div>
          </li>
        ))}
      </ol>
    </>
  );
}

function LineViz({ viz }: { viz: Extract<Viz, { type: "line" }> }) {
  const W = 800, H = 300, L = 56, R = 16, T = 16, B = 36;
  const xs = [...new Set(viz.series.flatMap((s) => s.points.map((p) => p.x)))].sort();
  const ys = viz.series.flatMap((s) => s.points.map((p) => p.y));
  let [lo, hi] = [Math.min(...ys), Math.max(...ys)];
  const pad = (hi - lo) * 0.1 || Math.abs(hi) * 0.1 || 1;
  [lo, hi] = [lo >= 0 ? Math.max(0, lo - pad) : lo - pad, hi + pad];
  const x = (v: string) => L + (xs.length > 1 ? (xs.indexOf(v) / (xs.length - 1)) * (W - L - R) : (W - L - R) / 2);
  const y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const ticks = [0, 0.5, 1].map((t) => lo + t * (hi - lo));
  const step = Math.max(1, Math.ceil(xs.length / 6));
  const monthly = xs.every((d) => /^\d{4}-\d{2}(-01)?$/.test(d));
  return (
    <>
      <div className="viz-head">
        <div><h2 id="vt" className="title-4">{viz.title}</h2><p className="caption-4 mute">{viz.unit}</p></div>
        {viz.series.length > 1 && (
          <div className="legend caption-4">{viz.series.map((s, i) => <span key={s.name}><i className="dot" style={{ background: SERIES[i % SERIES.length] }} />{s.name}</span>)}</div>
        )}
      </div>
      <div className="chartbox">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${viz.title}, ${xs.length} points`}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#E4E6EB" />
              <text x={L - 8} y={y(t)} className="t-mono" fontSize="12" fill="#6A7590" textAnchor="end" dominantBaseline="central">{fmt(t)}</text>
            </g>
          ))}
          {xs.map((v, i) => (i % step === 0 || i === xs.length - 1) && (
            <text key={v} x={x(v)} y={H - 12} className="t-mono" fontSize="12" fill="#6A7590" textAnchor={i === 0 ? "start" : i === xs.length - 1 ? "end" : "middle"}>{pointLabel(v, monthly).replace(/ \d{4}$/, "")}</text>
          ))}
          {viz.series.map((s, i) => (
            <g key={s.name}>
              <polyline fill="none" stroke={SERIES[i % SERIES.length]} strokeWidth="2" points={s.points.map((p) => `${x(p.x)},${y(p.y)}`).join(" ")} />
              {s.points.map((p) => <circle key={p.x} cx={x(p.x)} cy={y(p.y)} r="3" fill={SERIES[i % SERIES.length]}><title>{`${s.name}, ${pointLabel(p.x, monthly)}: ${fmt(p.y)} ${viz.unit}`}</title></circle>)}
            </g>
          ))}
        </svg>
      </div>
    </>
  );
}

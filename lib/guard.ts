const WINDOW_MS = 60_000;

export function envInt(name: string, fallback: number) {
  const n = Number(process.env[name]);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

const PER_IP = envInt("RATE_LIMIT_PER_MINUTE", 6);
const DAILY_CAP = envInt("LLM_DAILY_CAP", 300);
const DAILY_PER_IP = envInt("LLM_DAILY_PER_IP", 20);

// In memory: correct for one instance only; a restart or a second instance resets the counters.
const hits = new Map<string, number[]>();
let day = "";
let calls = 0;
const callsByIp = new Map<string, number>();

export function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= PER_IP) return true;
  hits.set(ip, [...recent, now]);
  if (hits.size > 10_000) for (const [k, ts] of hits) if (now - ts[ts.length - 1] >= WINDOW_MS) hits.delete(k);
  return false;
}

export function takeDailyCall(ip: string): "ip_cap" | "daily_cap" | null {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== day) {
    [day, calls] = [today, 0];
    callsByIp.clear();
  }
  const mine = callsByIp.get(ip) ?? 0;
  if (mine >= DAILY_PER_IP) return "ip_cap";
  if (calls >= DAILY_CAP) return "daily_cap";
  calls++;
  callsByIp.set(ip, mine + 1);
  return null;
}

// Railway's edge sets X-Real-IP to the connecting address; the rightmost X-Forwarded-For entry is the one the last proxy appended.
export function clientIp(headers: Headers) {
  return headers.get("x-real-ip")?.trim() || headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() || "local";
}

export function crossSite(headers: Headers) {
  const site = headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") return true;
  const origin = headers.get("origin");
  if (!origin) return false;
  let host: string;
  try {
    host = new URL(origin).host;
  } catch {
    return true;
  }
  const allowed = [headers.get("host"), headers.get("x-forwarded-host"), process.env.SITE_URL?.replace(/^https?:\/\//, "").replace(/\/.*$/, "")];
  return !allowed.includes(host);
}

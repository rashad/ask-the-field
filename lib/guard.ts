const WINDOW_MS = 60_000;
const PER_IP = Number(process.env.RATE_LIMIT_PER_MINUTE ?? 6);
const DAILY_CAP = Number(process.env.LLM_DAILY_CAP ?? 300);

// In memory: correct for one instance only; a restart or a second instance resets the counters.
const hits = new Map<string, number[]>();
let day = "";
let calls = 0;

export function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= PER_IP) return true;
  hits.set(ip, [...recent, now]);
  if (hits.size > 10_000) hits.clear();
  return false;
}

export function takeDailyCall() {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== day) [day, calls] = [today, 0];
  if (calls >= DAILY_CAP) return false;
  calls++;
  return true;
}

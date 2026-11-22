import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { AskEvent } from "./answer";

const DIR = "data/cache";
const MAX_GAP_MS = 1200;

interface Recording {
  question: string;
  recorded_at: string;
  events: { t: number; event: AskEvent }[];
}

const slug = (q: string) => q.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const path = (q: string) => `${DIR}/${slug(q)}.json`;

export function hasRecording(question: string) {
  return existsSync(path(question));
}

export function record(question: string, events: { t: number; event: AskEvent }[]) {
  mkdirSync(DIR, { recursive: true });
  const rec: Recording = { question, recorded_at: new Date().toISOString(), events };
  writeFileSync(path(question), JSON.stringify(rec, null, 1) + "\n");
}

export async function* replay(question: string, reason: string, signal?: AbortSignal, maxGap = MAX_GAP_MS): AsyncGenerator<AskEvent> {
  const rec: Recording = JSON.parse(readFileSync(path(question), "utf8"));
  let last = 0;
  for (const { t, event } of rec.events) {
    if (signal?.aborted) return;
    await new Promise((r) => setTimeout(r, Math.min(t - last, maxGap)));
    last = t;
    yield event.type === "start" ? { ...event, mode: "cache", reason } : event;
  }
}

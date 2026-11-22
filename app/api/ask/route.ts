import { z } from "zod";
import { ask, type AskEvent } from "@/lib/answer";
import { hasRecording, replay } from "@/lib/cache";
import { rateLimited, takeDailyCall } from "@/lib/guard";

export const maxDuration = 120;

const LIVE_LIMIT_MS = 20_000;
const body = z.object({ question: z.string().trim().min(3).max(300) });

export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Send { question: string } (3 to 300 characters)." }, { status: 400 });
  const { question } = parsed.data;
  const cached = hasRecording(question);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
  const limited = rateLimited(ip);
  if (limited && !cached) return Response.json({ error: "Too many questions. Try again in a minute." }, { status: 429 });

  const blocked = limited ? "rate_limit" : !process.env.ANTHROPIC_API_KEY || !process.env.VOYAGE_API_KEY ? "no_key" : !takeDailyCall() ? "daily_cap" : null;
  if (blocked && !cached) {
    const error = blocked === "no_key" ? "Live answers are off. Try one of the suggested questions." : "The daily limit is reached. Try one of the suggested questions.";
    return Response.json({ error, reason: blocked }, { status: 503 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: AskEvent) => controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
      const live = new AbortController();
      const stop = () => live.abort();
      req.signal.addEventListener("abort", stop);
      let slow = false;
      const timer = cached ? setTimeout(() => { slow = true; live.abort(); }, LIVE_LIMIT_MS) : undefined;
      try {
        if (blocked) for await (const e of replay(question, blocked, req.signal)) send(e);
        else
          try {
            for await (const e of ask(question, live.signal)) send(e);
          } catch (err) {
            if (!slow) console.error("ask failed:", (err as Error).message);
            if (!cached || req.signal.aborted) throw err;
            const reason = slow ? "slow" : "api_error";
            send({ type: "fallback", reason });
            for await (const e of replay(question, reason, req.signal, 500)) send(e);
          }
      } catch {
        if (!req.signal.aborted) send({ type: "error", message: "The answer failed. Try again, or pick a suggested question." });
      } finally {
        clearTimeout(timer);
        req.signal.removeEventListener("abort", stop);
      }
      controller.close();
    },
  });
  return new Response(stream, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" } });
}

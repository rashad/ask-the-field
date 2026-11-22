import { z } from "zod";
import { ask, type AskEvent } from "@/lib/answer";
import { hasRecording, replay } from "@/lib/cache";
import { clientIp, crossSite, rateLimited, readBody, takeDailyCall } from "@/lib/guard";

export const maxDuration = 120;

const LIVE_LIMIT_MS = 20_000;
const MAX_BODY_BYTES = 2048;
const body = z.object({ question: z.string().trim().min(3).max(300) });
const BAD_BODY = { error: "Send { question: string } (3 to 300 characters)." };

export async function POST(req: Request) {
  if (crossSite(req.headers)) return Response.json({ error: "Cross-site requests are not allowed." }, { status: 403 });
  const text = await readBody(req, MAX_BODY_BYTES).catch(() => "");
  if (text === null) return Response.json(BAD_BODY, { status: 413 });
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {}
  const parsed = body.safeParse(json);
  if (!parsed.success) return Response.json(BAD_BODY, { status: 400 });
  const { question } = parsed.data;
  const cached = hasRecording(question);

  const ip = clientIp(req.headers);
  const limited = rateLimited(ip);
  if (limited && !cached) return Response.json({ error: "Too many questions. Try again in a minute." }, { status: 429 });

  const blocked = limited ? "rate_limit" : !process.env.ANTHROPIC_API_KEY || !process.env.VOYAGE_API_KEY ? "no_key" : takeDailyCall(ip);
  if (blocked && !cached) {
    const error = blocked === "no_key" ? "Live answers are off. Try one of the suggested questions." : blocked === "ip_cap" ? "You reached today's limit of live questions. Try one of the suggested questions." : "The daily limit is reached. Try one of the suggested questions.";
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

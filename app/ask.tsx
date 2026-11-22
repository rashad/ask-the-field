"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AskEvent } from "@/lib/answer";
import { Drawer, type Step } from "./drawer";
import { VizCard, type EventRow } from "./viz";

type Final = Extract<AskEvent, { type: "final" }>;

const SUGGESTED = [
  ["Which wells dropped production last quarter?", "ph-chart-bar-horizontal", "Shown as ranked bars"],
  ["Where are the open incidents right now?", "ph-map-trifold", "Shown as a map"],
  ["How did water cut evolve on Field B this year?", "ph-chart-line", "Shown as a line"],
  ["Why did W-17 go down in March?", "ph-file-text", "Answered from reports and events"],
] as const;

const REASON: Record<string, string> = {
  daily_cap: "The daily limit on live answers is reached.",
  no_key: "Live answers are off on this server.",
  api_error: "The live answer failed.",
};

function sourceHref(kind: string, id: string) {
  if (kind === "chunk") return `/data?chunk=${encodeURIComponent(id)}`;
  const [table, scope] = id.split(":");
  const name = table === "production_daily" ? "production" : table;
  const q = name === "production" ? (scope === "all" ? "" : scope) : scope;
  return `/data?tab=tables&table=${name}${q ? `&q=${encodeURIComponent(q)}` : ""}`;
}

function AnswerText({ text }: { text: string }) {
  const tidy = text.replace(/([.!?])((?:\s*\[\d+\])+)/g, "$2$1");
  return (
    <p className="answer-text title-2">
      {tidy.split(/(\[\d+\])/).map((part, i) => {
        const m = part.match(/^\[(\d+)\]$/);
        return m ? <sup key={i} className="ref mono">{m[1]}</sup> : part;
      })}
    </p>
  );
}

export function Ask() {
  const params = useSearchParams();
  const router = useRouter();
  const [input, setInput] = useState(params.get("q") ?? "");
  const [asked, setAsked] = useState("");
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [steps, setSteps] = useState<Step[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [final, setFinal] = useState<Final | null>(null);
  const [recorded, setRecorded] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [invalid, setInvalid] = useState("");
  const [drawer, setDrawer] = useState(false);
  const abort = useRef<AbortController | null>(null);

  const run = useCallback(async (question: string) => {
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    setAsked(question);
    setStatus("running");
    setSteps([]);
    setEvents([]);
    setFinal(null);
    setRecorded(null);
    setError("");
    setDrawer(false);
    try {
      const res = await fetch("/api/ask", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question }), signal: ctrl.signal });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? `The server answered ${res.status}.`);
        setStatus("error");
        return;
      }
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buf = "";
      let ended = false;
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += value;
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines.filter(Boolean)) {
          const e = JSON.parse(line) as AskEvent;
          if (e.type === "start") setRecorded(e.mode === "cache" ? e.reason ?? "" : null);
          else if (e.type === "fallback") {
            setRecorded(e.reason);
            setSteps([]);
            setEvents([]);
          } else if (e.type === "tool-call") setSteps((s) => [...s, { id: e.id, name: e.name, args: e.args as Record<string, unknown>, label: e.label, state: "running" }]);
          else if (e.type === "tool-result") {
            const out = e.output as { repeated?: boolean; events?: EventRow[]; count?: number };
            setSteps((s) => s.map((x) => (x.id === e.id ? { ...x, state: out?.repeated ? "repeated" : "done", count: out?.count } : x)));
            if (out?.events) setEvents((ev) => [...ev, ...out.events!]);
          } else if (e.type === "tool-error") setSteps((s) => s.map((x) => (x.id === e.id ? { ...x, state: "error" } : x)));
          else if (e.type === "final") {
            ended = true;
            setFinal(e);
            setStatus("done");
          } else if (e.type === "error") {
            ended = true;
            setError(e.message);
            setStatus("error");
          }
        }
      }
      if (!ended) {
        setError("The answer stopped before it finished. Try again.");
        setStatus("error");
      }
    } catch (err) {
      if (ctrl.signal.aborted) return;
      setError(`The request failed (${(err as Error).message}). Check the connection and try again.`);
      setStatus("error");
    }
  }, []);

  const q = params.get("q");
  useEffect(() => {
    if (!q) return;
    setInput(q);
    run(q);
  }, [q, run]);
  useEffect(() => {
    if (status === "done" && params.get("how") === "1") setDrawer(true);
  }, [status, params]);

  const submit = (question: string) => {
    const text = question.trim();
    if (text.length < 3) return setInvalid("Type a question of at least 3 characters.");
    if (text.length > 300) return setInvalid("Keep the question under 300 characters.");
    setInvalid("");
    if (text === q) run(text);
    else router.push(`/?q=${encodeURIComponent(text)}`, { scroll: false });
  };

  const answer = final?.answer;
  const cited = new Set(answer?.sources.filter((s) => s.kind === "chunk").map((s) => s.id));

  return (
    <>
      {status === "idle" && (
        <div className="hero">
          <h1 className="hero-title heading-1">Ask your<br />operations data</h1>
          <p className="hero-sub title-2" style={{ marginTop: "var(--sp-200)", fontWeight: 400 }}>Ask about wells, incidents and production. Get the answer first, with the sources and what could not be verified.</p>
        </div>
      )}
      <form className={status === "idle" ? "hero-form" : undefined} noValidate onSubmit={(e) => { e.preventDefault(); submit(input); }}>
        <div className="qbar" data-invalid={invalid ? "true" : undefined}>
          <i className="ph ph-magnifying-glass lead" aria-hidden="true" />
          <label className="sr" htmlFor="q">Your question</label>
          <input id="q" name="q" type="text" className="body-3" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask a question about your wells" autoComplete="off" maxLength={300} />
          <button className="btn btn-primary button-md" type="submit" disabled={status === "running"}><i className="ph-bold ph-arrow-up" aria-hidden="true" />Ask</button>
        </div>
        {invalid && <p className="qerr body-6" role="alert"><i className="ph ph-warning-circle" aria-hidden="true" /><span>{invalid}</span></p>}
      </form>

      {status === "idle" && (
        <ul className="sug hero-sug">
          {SUGGESTED.map(([text, icon, hint]) => (
            <li key={text}>
              <a href={`/?q=${encodeURIComponent(text)}`} onClick={(e) => { e.preventDefault(); setInput(text); submit(text); }}>
                <span className="ic"><i className={`ph ${icon}`} aria-hidden="true" /></span>
                <span className="txt"><span className="title-3" style={{ display: "block" }}>{text}</span><span className="caption-4 mute">{hint}</span></span>
                <i className="ph ph-arrow-right go" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      )}

      {status !== "idle" && (
        <div className="answer" aria-live="polite">
          {recorded !== null && (
            <p className="recorded body-6"><span className="badge badge-mute caption-3"><i className="ph-bold ph-record" aria-hidden="true" />Recorded answer</span>{REASON[recorded] ?? "Replayed from a recording."} This is a saved run of the same question, replayed step by step.</p>
          )}
          {status === "running" && (
            <>
              <ol className="live caption-1" aria-label="Steps so far">
                {steps.length === 0 && <li><i className="ph ph-circle-notch spin" aria-hidden="true" />Reading the question...</li>}
                {steps.map((s) => (
                  <li key={s.id} data-state={s.state}>
                    <i className={`ph ${s.state === "running" ? "ph-circle-notch spin" : s.state === "error" ? "ph-x-circle" : "ph-check-circle"}`} aria-hidden="true" />
                    {s.state === "running" ? s.label : s.label.replace(/\.\.\.$/, "")}
                    {s.state === "repeated" && <span className="mute"> (reused the earlier result)</span>}
                    {s.state === "done" && s.count !== undefined && <span className="mute mono"> {s.count} {s.name === "search_documents" ? "passages" : "rows"}</span>}
                  </li>
                ))}
                {steps.length > 0 && steps.every((s) => s.state !== "running") && <li><i className="ph ph-circle-notch spin" aria-hidden="true" />Writing the answer...</li>}
              </ol>
              <div className="skel" aria-hidden="true">
                <div style={{ height: 28, width: "92%" }} />
                <div style={{ height: 28, width: "64%" }} />
                <div style={{ height: 320, marginTop: "var(--sp-100)" }} />
                <div style={{ height: 72 }} />
              </div>
            </>
          )}
          {status === "error" && (
            <div className="card pad errbox" role="alert">
              <p className="body-4"><i className="ph-fill ph-warning-circle" aria-hidden="true" />No answer for &ldquo;{asked}&rdquo;</p>
              <p className="body-6 mute">{error}</p>
              <div className="errbtns">
                <button className="btn btn-ghost button-sm" type="button" onClick={() => run(asked)}><i className="ph ph-arrow-clockwise" aria-hidden="true" />Try again</button>
                <Link className="btn btn-ghost button-sm" href="/" onClick={() => setStatus("idle")}>Pick a suggested question</Link>
              </div>
            </div>
          )}
          {status === "done" && answer && (
            <>
              <AnswerText text={answer.answer} />
              <VizCard viz={answer.viz as Parameters<typeof VizCard>[0]["viz"]} events={events} />
              <div className="card pad trust">
                <div className="trust-main">
                  <span className={`badge caption-3 ${answer.confidence === "high" ? "badge-mint" : answer.confidence === "medium" ? "badge-warn" : "badge-bad"}`}>
                    <i className="ph-bold ph-seal-check" aria-hidden="true" />{answer.confidence[0].toUpperCase() + answer.confidence.slice(1)} confidence
                  </span>
                  <div className="trust-src">
                    <span className="caption-4 mute">Sources</span>
                    {answer.sources.map((s) => (
                      <Link key={s.n + s.id} className="chip caption-4" href={sourceHref(s.kind, s.id)} title={s.id}>
                        <span className="n mono caption-3">{s.n}</span>{s.label}
                      </Link>
                    ))}
                  </div>
                  <button className="btn btn-ghost button-sm" type="button" onClick={() => setDrawer(true)} aria-controls="drawer">
                    <i className="ph ph-list-magnifying-glass" aria-hidden="true" />How this answer was built
                  </button>
                </div>
                {answer.could_not_verify && (
                  <p className="unv body-6"><i className="ph-fill ph-warning-circle" aria-hidden="true" /><span><span className="body-5" style={{ color: "var(--ink)" }}>Could not verify.</span> {answer.could_not_verify}</span></p>
                )}
                {final.trace.some((t) => t.full_text_only) && (
                  <p className="unv body-6"><i className="ph-fill ph-info" aria-hidden="true" /><span>Document search ran on full text only: the embedding service did not answer.</span></p>
                )}
                <p className="caption-4 mute meta-line mono">{final.model}, {final.usage.steps} steps, {(final.latency_ms / 1000).toFixed(1)} s, ${final.usage.cost_usd.toFixed(4)}</p>
              </div>
              <Drawer open={drawer} onClose={() => setDrawer(false)} steps={steps} traces={final.trace} cited={cited} />
            </>
          )}
        </div>
      )}
    </>
  );
}

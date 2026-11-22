"use client";
import { ArrowClockwise, CheckCircle, CircleNotch, Info, Lightbulb, Play, Record, Rows, WarningCircle, X, XCircle } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import type { AskEvent } from "@/lib/answer";
import { shortDate, TODAY } from "@/lib/domain";
import { usd } from "@/lib/money";
import { DEMO, SUGGESTED } from "@/lib/questions";
import type { Morning } from "@/lib/morning";
import type { EventRow } from "@/lib/tools";
import { Built } from "./built";
import { useConnector } from "./connector";
import { callLabel, Evidence, type Final } from "./evidence";
import { DOC_COUNT, docSlot, found, say, type Step } from "./human";
import { Briefing, HowItWorks, Intro, Snapshot } from "./scene";
import { ASK_EVENT } from "./shell";
import { VizCard } from "./viz";

const REASON: Record<string, string> = {
  daily_cap: "The daily limit on live answers is reached.",
  ip_cap: "You reached today's limit of live answers.",
  no_key: "Live answers are off on this server.",
  api_error: "The live answer failed.",
  slow: "The live answer took more than 20 seconds.",
  rate_limit: "Many questions came in a short time.",
};

const WHY: Record<string, string> = {
  high: "The field reports and the data tables say the same thing.",
  medium: "Only one kind of evidence was found, reports or tables, not both.",
  low: "The evidence is thin or does not agree.",
};
const LEVEL = { high: 3, medium: 2, low: 1 } as const;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const IDS = /\b(W-\d{2}|EV-\d{4}|SOP-[A-Z]+-\d{3}|[A-Z]{2}-\d{3}|7Q-\d{4}(?:-\d{3})?)\b/;

function withIds(text: string) {
  return text.split(IDS).map((p, i) => (i % 2 ? <span key={i} className="id">{p}</span> : p));
}

function AnswerText({ text, labels }: { text: string; labels: Map<number, string> }) {
  const tidy = text.replace(/([.!?])((?:\s*\[\d+\])+)/g, "$2$1");
  const sentences = tidy.split(/(?<=[.!?])\s+/).filter(Boolean);
  return (
    <p className="ans" id="answer">
      {sentences.map((s, i) => {
        const parts = s.split(/(\[\d+\])/);
        const refs = [...new Set(parts.map((p) => p.match(/^\[(\d+)\]$/)?.[1]).filter(Boolean))];
        return (
          <Fragment key={i}>
            {i > 0 && " "}
            <span className="sent" data-refs={refs.join(" ")}>
              {parts.map((p, j) => {
                const m = p.match(/^\[(\d+)\]$/);
                if (!m) return <Fragment key={j}>{withIds(p)}</Fragment>;
                const label = labels.get(Number(m[1]));
                return <button key={j} type="button" className="cite" data-ref={m[1]} aria-controls={label ? `src-${m[1]}` : undefined} aria-label={label ? `Source ${m[1]}: ${label}` : `Source ${m[1]}, missing`}>{m[1]}</button>;
              })}
            </span>
          </Fragment>
        );
      })}
    </p>
  );
}

function Tip({ children, show }: { children: React.ReactNode; show: boolean }) {
  if (!show) return null;
  return <p className="tip"><Lightbulb weight="fill" aria-hidden /><span>{children}</span></p>;
}

function DocGrid({ steps }: { steps: Step[] }) {
  const search = steps.filter((s) => s.name === "search_documents");
  const running = search.some((s) => s.state === "running");
  const docs = [...new Set(search.flatMap((s) => (s.output?.chunks ?? []).map((c: { document_id: string }) => c.document_id)))] as string[];
  const taken = new Set<number>();
  const slots = new Map(docs.map((d) => [docSlot(d, taken), d]));
  const phase = docs.length ? "found" : running ? "scan" : "idle";
  const COLS = 25;
  return (
    <div className="dg" data-phase={phase}>
      <svg viewBox={`0 0 ${COLS * 12} ${(DOC_COUNT / COLS) * 12}`} role="img" aria-label={docs.length ? `${docs.length} of ${DOC_COUNT} reports picked` : `${DOC_COUNT} field reports`}>
        {Array.from({ length: DOC_COUNT }, (_, i) => (
          <rect key={i} x={(i % COLS) * 12 + 1} y={Math.floor(i / COLS) * 12 + 1} width="9" height="10" rx="1" className={slots.has(i) ? "hit" : undefined} style={{ animationDelay: `${(i % COLS) * 40 + Math.floor(i / COLS) * 15}ms` }} />
        ))}
      </svg>
      <p>{docs.length ? `${docs.length} of ${DOC_COUNT} reports kept` : running ? `Reading ${DOC_COUNT} reports...` : `${DOC_COUNT} field reports`}</p>
      {docs.length > 0 && <ul className="dg-ids">{docs.map((d, i) => <li key={d} style={{ animationDelay: `${i * 90}ms` }}>{d}</li>)}</ul>}
    </div>
  );
}

function Narration({ steps, writing }: { steps: Step[]; writing: boolean }) {
  const current = steps.filter((s) => s.state === "running").sort((a, b) => Number(b.name === "search_documents") - Number(a.name === "search_documents"));
  const caption = writing ? "Writing the answer and linking each fact to its source..." : current.length ? say(current[0].name, current[0].args) : steps.length ? "Deciding what to check next..." : "Reading your question and deciding where to look...";
  return (
    <section className="narr" aria-label="What the AI is doing now">
      <p className="narr-k">Live, step by step</p>
      <p className="narr-cap" key={caption} aria-live="polite"><CircleNotch className="spin" aria-hidden />{caption}</p>
      {current.length > 1 && <p className="narr-also">At the same time: {current.slice(1).map((s) => say(s.name, s.args).replace(/\.\.\.$/, "").replace(/^./, (c) => c.toLowerCase())).join("; ")}.</p>}
      <ol className="narr-done">
        {steps.filter((s) => s.state !== "running").map((s) => (
          <li key={s.id}>
            {s.state === "error" ? <XCircle className="neg" aria-hidden /> : <CheckCircle weight="fill" aria-hidden />}
            <span>{say(s.name, s.args).replace(/\.\.\.$/, "")}. <b>{found(s)}</b></span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function readTipsOff() {
  try { return localStorage.getItem("tips-off") === "1"; } catch { return false; }
}

export function Ask({ morning }: { morning: Morning | null }) {
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
  const [tips, setTips] = useState(true);
  const abort = useRef<AbortController | null>(null);
  const typed = useRef<string | null>(null);
  const stage = useRef<HTMLDivElement>(null);

  const demo = params.get("demo");
  const how = params.get("how") === "1";
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => setTips(!readTipsOff()), []);
  useEffect(() => {
    if (demo !== "1" || status !== "done") {
      setCountdown(null);
      return;
    }
    setCountdown(8);
    const t = setInterval(() => setCountdown((c) => (c ? c - 1 : c)), 1000);
    return () => clearInterval(t);
  }, [demo, status]);
  useEffect(() => {
    if (countdown === 0) router.push(`/?q=${encodeURIComponent(DEMO[1])}&demo=2`);
  }, [countdown, router]);

  const run = useCallback(async (question: string) => {
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    const guided = SUGGESTED.includes(question);
    const dwell = guided ? 1500 : 700;
    setAsked(question);
    setStatus("running");
    setSteps([]);
    setEvents([]);
    setFinal(null);
    setRecorded(null);
    setError("");
    let nextAt = Date.now() + (guided ? 1200 : 0);
    const pace = async () => {
      const wait = nextAt - Date.now();
      if (wait > 0) await sleep(wait);
      nextAt = Date.now() + dwell;
    };
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
          if (e.type === "tool-call" || e.type === "tool-result" || e.type === "final") await pace();
          if (ctrl.signal.aborted) return;
          if (e.type === "start") setRecorded(e.mode === "cache" ? e.reason ?? "" : null);
          else if (e.type === "fallback") {
            setRecorded(e.reason);
            setSteps([]);
            setEvents([]);
          } else if (e.type === "tool-call") setSteps((s) => [...s, { id: e.id, name: e.name, args: e.args as Record<string, unknown>, state: "running" }]);
          else if (e.type === "tool-result") {
            const out = e.output as Record<string, any>;
            setSteps((s) => s.map((x) => (x.id === e.id ? { ...x, state: out?.repeated ? "repeated" : "done", output: out } : x)));
            if (out?.events) setEvents((ev) => [...ev, ...out.events]);
          } else if (e.type === "tool-error") setSteps((s) => s.map((x) => (x.id === e.id ? { ...x, state: "error", error: e.error } : x)));
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
    setInput(q ?? "");
    if (q && (SUGGESTED.includes(q) || typed.current === q)) {
      typed.current = null;
      run(q);
      return;
    }
    abort.current?.abort();
    setStatus("idle");
  }, [q, run]);
  useEffect(() => () => abort.current?.abort(), []);

  const submit = useCallback((question: string) => {
    const text = question.trim();
    if (text.length < 3) return setInvalid("Type a question of at least 3 characters.");
    if (text.length > 300) return setInvalid("Keep the question under 300 characters.");
    setInvalid("");
    if (text === q) run(text);
    else {
      typed.current = text;
      router.push(`/?q=${encodeURIComponent(text)}`, { scroll: false });
    }
  }, [q, run, router]);

  useEffect(() => {
    const onAsk = (e: Event) => {
      e.preventDefault();
      submit((e as CustomEvent<string>).detail);
    };
    window.addEventListener(ASK_EVENT, onAsk);
    return () => window.removeEventListener(ASK_EVENT, onAsk);
  }, [submit]);

  useEffect(() => {
    if (status === "running") window.scrollTo({ top: 0 });
    if (status !== "done" || !how) return;
    const t = setTimeout(() => document.getElementById("built")?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }), 50);
    return () => clearTimeout(t);
  }, [status, how]);

  useConnector(stage, status === "done" && !!final);

  const hideTips = () => {
    setTips(false);
    try { localStorage.setItem("tips-off", "1"); } catch {}
  };

  if (status === "idle") {
    return (
      <div className="page">
        <Intro m={morning} />
        <form className="composer" data-invalid={invalid ? "" : undefined} noValidate onSubmit={(e) => { e.preventDefault(); submit(input); }}>
          <label className="sr" htmlFor="q">Your question</label>
          <textarea id="q" name="q" rows={2} value={input} maxLength={300} placeholder="Ask about wells, incidents, production or procedures" aria-invalid={invalid ? true : undefined} aria-describedby={invalid ? "q-err" : undefined}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit(input); } }} />
          <div className="composer-b">
            <span className="hint"><Rows aria-hidden />Reports and data tables</span>
            <button className="btn btn-primary" type="submit">Ask<kbd aria-hidden>Enter</kbd></button>
          </div>
        </form>
        {invalid && <p className="qerr" id="q-err" role="alert"><WarningCircle aria-hidden /><span>{invalid}</span></p>}
        {morning && <Snapshot m={morning} />}
        <Briefing m={morning} onPick={(x) => { setInput(x); submit(x); }} onDemo={() => router.push(`/?q=${encodeURIComponent(DEMO[0])}&demo=1`)} />
        <HowItWorks />
      </div>
    );
  }

  const answer = final?.answer;
  const passages = final ? new Set(final.trace.flatMap((t) => t.chunks_sent.map((c) => c.document_id))).size : 0;
  const tableRows = steps.reduce((n, s) => n + (s.name === "search_documents" ? 0 : (s.output?.count ?? s.output?.rows?.length ?? 0)), 0);
  const labels = new Map(answer?.sources.map((s) => [s.n, s.label]) ?? []);
  const vizFrom = answer && (answer.viz.type === "line" || answer.viz.type === "bar") ? callLabel(steps.find((s) => s.output?.ref === (answer.viz as { ref: string }).ref && !s.output?.repeated)) : null;
  const toBuilt = () => document.getElementById("built")?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });

  return (
    <>
      <div className="stage" ref={stage}>
        <svg className="links" aria-hidden="true" data-links />
        <div className="col-main" data-col aria-live="polite" aria-busy={status === "running"}>
          <p className="eyebrow">{status === "running" ? "Answering" : status === "error" ? "No answer" : recorded !== null ? "Recorded answer" : "Answer"}</p>
          <h1 className="h1">{asked}</h1>
          {final && (
            <p className="runline">
              <span>{shortDate(TODAY)}</span>
              <span>{(final.latency_ms / 1000).toFixed(1)} s</span>
              {passages > 0 && <span>{passages} {passages === 1 ? "report" : "reports"}</span>}
              {tableRows > 0 && <span>{tableRows} rows of data</span>}
              <span><button type="button" onClick={toBuilt}>How this answer was built</button></span>
            </p>
          )}
          {invalid && <p className="qerr" role="alert"><WarningCircle aria-hidden /><span>{invalid}</span></p>}
          {demo && morning && (
            <div className="notice">
              <Play weight="fill" aria-hidden />
              <div>
                <b>Demo, question {demo === "2" ? "2" : "1"} of 2. </b>
                {demo === "2" ? "Second question: was it a one-off? The AI reads the pump records of every well, not only W-17, and connects notes written months apart."
                  : `W-17, a Wadi Field well, stopped for ${morning.stakes.w17_days} days in March: about ${usd(morning.stakes.w17_lost_bbl)} in lost revenue at an assumed $70 a barrel (demo assumption). First the AI finds out why. Then it checks if it can happen again.`}
              </div>
            </div>
          )}
          {recorded !== null && (
            <div className="notice"><Record weight="bold" aria-hidden /><div><b>Recorded answer. </b>{REASON[recorded] ?? "Replayed from a recording."} You are watching a saved run of the same question, replayed step by step.</div></div>
          )}
          {status === "running" && <Narration steps={steps} writing={steps.length > 0 && steps.every((s) => s.state !== "running")} />}
          {status === "error" && (
            <div className="notice bad" role="alert">
              <WarningCircle weight="fill" aria-hidden />
              <div>
                <b>No answer for &ldquo;{asked}&rdquo;</b>
                <p>{error}</p>
                <div className="acts">
                  <button className="btn btn-ghost" type="button" onClick={() => run(asked)}><ArrowClockwise aria-hidden />Try again</button>
                  <Link className="btn btn-ghost" href="/">Pick a suggested question</Link>
                </div>
              </div>
            </div>
          )}
          {status === "done" && answer && final && (
            <>
              <AnswerText text={answer.answer} labels={labels} />
              <Tip show={tips}>Each small number points to the report or table it came from. Hover, focus or click one to see the exact passage.</Tip>
              <VizCard viz={answer.viz} events={events} from={vizFrom} />
              <section className="verdict" aria-label="How sure the answer is">
                <div>
                  <h3>Confidence</h3>
                  <p className="lvl"><span className="meter" aria-hidden>{[1, 2, 3].map((i) => <i key={i} data-on={i <= LEVEL[answer.confidence] ? "" : undefined} />)}</span>{answer.confidence[0].toUpperCase() + answer.confidence.slice(1)}</p>
                  <p>{WHY[answer.confidence]}</p>
                </div>
                <div>
                  <h3>Could not verify</h3>
                  <p>{answer.could_not_verify ?? "Nothing: the answer reports no gap in the data."}</p>
                </div>
              </section>
              <Tip show={tips}>The confidence says how sure the AI is, and why. Could not verify says what it could not check, instead of guessing.</Tip>
              {final.trace.some((t) => t.full_text_only) && (
                <div className="notice"><Info weight="fill" aria-hidden /><div>The search ran on exact words only this time: the meaning search service did not answer.</div></div>
              )}
              {tips && <button type="button" className="tips-off" onClick={hideTips}><X aria-hidden />Hide these tips</button>}
              {countdown !== null && (
                <div className="notice">
                  <Play weight="fill" aria-hidden />
                  <div>
                    <b>Next question in {countdown} s: </b>{DEMO[1]}
                    <div className="acts">
                      <button className="btn btn-primary" type="button" onClick={() => setCountdown(0)}><Play weight="fill" aria-hidden />Go now</button>
                      <button className="btn btn-ghost" type="button" onClick={() => router.replace(`/?q=${encodeURIComponent(DEMO[0])}`, { scroll: false })}><X aria-hidden />Stop the demo</button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        <aside className="col-side" aria-label="Evidence">
          {status === "done" && final ? <Evidence final={final} steps={steps} events={events} />
            : status === "running" ? <><div className="side-h"><h2>Reports</h2></div><DocGrid steps={steps} /></>
            : null}
        </aside>
      </div>
      {status === "done" && final && <Built question={asked} final={final} steps={steps} recorded={recorded} all={how} />}
    </>
  );
}

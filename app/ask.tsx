"use client";
import { ArrowClockwise, ArrowRight, ArrowUp, ChatCircleText, CheckCircle, CircleNotch, Info, Lightbulb, ListMagnifyingGlass, MagnifyingGlass, Play, Record, SealCheck, WarningCircle, X, XCircle } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AskEvent } from "@/lib/answer";
import { usd } from "@/lib/money";
import { DEMO, SUGGESTED } from "@/lib/questions";
import type { Morning } from "@/lib/stakes";
import { Drawer } from "./drawer";
import { DOC_COUNT, docSlot, found, say, type Step } from "./human";
import { Briefing, Scene } from "./scene";
import { VizCard, type EventRow } from "./viz";

type Final = Extract<AskEvent, { type: "final" }>;


const REASON: Record<string, string> = {
  daily_cap: "The daily limit on live answers is reached.",
  ip_cap: "You reached today's limit of live answers.",
  no_key: "Live answers are off on this server.",
  api_error: "The live answer failed.",
  slow: "The live answer took more than 20 seconds.",
  rate_limit: "Many questions came in a short time.",
};

const WHY: Record<string, string> = {
  high: "High means the field reports and the data tables say the same thing.",
  medium: "Medium means only one kind of evidence was found, reports or tables, not both.",
  low: "Low means the evidence is thin or does not agree.",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function AnswerText({ text, onRef }: { text: string; onRef: (n: number) => void }) {
  const tidy = text.replace(/([.!?])((?:\s*\[\d+\])+)/g, "$2$1");
  return (
    <p className="answer-text title-2">
      {tidy.split(/(\[\d+\])/).map((part, i) => {
        const m = part.match(/^\[(\d+)\]$/);
        return m ? (
          <button key={i} type="button" className="ref mono" onClick={() => onRef(Number(m[1]))} aria-label={`Source ${m[1]}: open the passage`}>{m[1]}</button>
        ) : part;
      })}
    </p>
  );
}

function Tip({ children, show }: { children: React.ReactNode; show: boolean }) {
  if (!show) return null;
  return <p className="tip caption-2"><Lightbulb weight="fill" aria-hidden /><span>{children}</span></p>;
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
          <rect key={i} x={(i % COLS) * 12 + 1} y={Math.floor(i / COLS) * 12 + 1} width="9" height="10" className={slots.has(i) ? "hit" : undefined} style={{ animationDelay: `${(i % COLS) * 40 + Math.floor(i / COLS) * 15}ms` }} />
        ))}
      </svg>
      <p className="caption-4 mute">{docs.length ? `${docs.length} of ${DOC_COUNT} reports kept` : running ? `Reading ${DOC_COUNT} reports...` : `${DOC_COUNT} field reports`}</p>
      {docs.length > 0 && <ul className="dg-ids">{docs.map((d, i) => <li key={d} className="mono caption-4" style={{ animationDelay: `${i * 90}ms` }}>{d}</li>)}</ul>}
    </div>
  );
}

function Narration({ steps, writing }: { steps: Step[]; writing: boolean }) {
  const current = steps.filter((s) => s.state === "running").sort((a, b) => Number(b.name === "search_documents") - Number(a.name === "search_documents"));
  const caption = writing ? "Writing the answer and linking each fact to its source..." : current.length ? say(current[0].name, current[0].args) : steps.length ? "Deciding what to check next..." : "Reading your question and deciding where to look...";
  return (
    <section className="card narr" aria-label="What the AI is doing now">
      <div className="narr-main">
        <p className="caption-3 mute narr-k">Live, step by step</p>
        <p className="title-1 narr-cap" key={caption} aria-live="polite"><CircleNotch className="spin" aria-hidden />{caption}</p>
        {current.length > 1 && <p className="body-6 mute">At the same time: {current.slice(1).map((s) => say(s.name, s.args).replace(/\.\.\.$/, "").replace(/^./, (c) => c.toLowerCase())).join("; ")}.</p>}
        <ol className="narr-done">
          {steps.filter((s) => s.state !== "running").map((s) => (
            <li key={s.id} className="body-6">
              {s.state === "error" ? <XCircle className="neg" aria-hidden /> : <CheckCircle weight="fill" aria-hidden />}
              <span><span className="mute">{say(s.name, s.args).replace(/\.\.\.$/, "")}.</span> <b className="body-5">{found(s)}</b></span>
            </li>
          ))}
        </ol>
      </div>
      <DocGrid steps={steps} />
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
  const [drawer, setDrawer] = useState(false);
  const [focus, setFocus] = useState<number | null>(null);
  const [tips, setTips] = useState(true);
  const abort = useRef<AbortController | null>(null);
  const typed = useRef<string | null>(null);

  const demo = params.get("demo");
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
    setDrawer(false);
    setFocus(null);
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
    setInput(q ?? "");
    if (q && (SUGGESTED.includes(q) || typed.current === q)) {
      typed.current = null;
      run(q);
      return;
    }
    abort.current?.abort();
    setStatus("idle");
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
    else {
      typed.current = text;
      router.push(`/?q=${encodeURIComponent(text)}`, { scroll: false });
    }
  };

  const openSource = (n: number | null) => {
    setFocus(n);
    setDrawer(true);
  };
  const hideTips = () => {
    setTips(false);
    try { localStorage.setItem("tips-off", "1"); } catch {}
  };

  const answer = final?.answer;
  const passages = final ? new Set(final.trace.flatMap((t) => t.chunks_sent.map((c) => c.document_id))).size : 0;
  const tableRows = steps.reduce((n, s) => n + (s.name === "search_documents" ? 0 : (s.output?.count ?? s.output?.rows?.length ?? 0)), 0);

  return (
    <>
      {status === "idle" && (morning ? <Scene m={morning} /> : (
        <div className="hero">
          <p className="caption-3 eyebrow">Ask the Field</p>
          <h1 className="hero-title heading-2">Ask an oil field a question in plain English.</h1>
        </div>
      ))}
      <form className={status === "idle" ? "hero-form" : undefined} noValidate onSubmit={(e) => { e.preventDefault(); submit(input); }}>
        <div className="qbar" data-invalid={invalid ? "true" : undefined}>
          <MagnifyingGlass className="lead" aria-hidden />
          <label className="sr" htmlFor="q">Your question</label>
          <input id="q" name="q" type="text" className="body-3" value={input} onChange={(e) => setInput(e.target.value)} placeholder="For example: why was W-17 down in March?" autoComplete="off" maxLength={300} />
          <button className="btn btn-primary button-md" type="submit" disabled={status === "running"}><ArrowUp weight="bold" aria-hidden />Ask</button>
        </div>
        {invalid && <p className="qerr body-6" role="alert"><WarningCircle aria-hidden /><span>{invalid}</span></p>}
      </form>

      {status === "idle" && (
        <>
          {morning ? (
            <Briefing m={morning} onPick={(q) => { setInput(q); submit(q); }} onDemo={() => router.push(`/?q=${encodeURIComponent(DEMO[0])}&demo=1`)} />
          ) : (
            <ul className="sug hero-sug">
              {SUGGESTED.map((q) => (
                <li key={q}><a href={`/?q=${encodeURIComponent(q)}`} onClick={(e) => { e.preventDefault(); setInput(q); submit(q); }}><span className="txt title-3">{q}</span><ArrowRight className="go" aria-hidden /></a></li>
              ))}
            </ul>
          )}
          <section className="how3" aria-labelledby="how3-t">
            <h2 id="how3-t" className="caption-3 mute how3-k">How it works in 3 steps</h2>
            <ol>
              <li><span className="ic"><ChatCircleText aria-hidden /></span><span><b className="body-4">1. You ask</b><span className="body-6 mute">A question in your own words, like you would ask a colleague.</span></span></li>
              <li><span className="ic"><ListMagnifyingGlass aria-hidden /></span><span><b className="body-4">2. It looks through the reports and the data</b><span className="body-6 mute">It picks the few passages and numbers that matter out of thousands.</span></span></li>
              <li><span className="ic"><SealCheck aria-hidden /></span><span><b className="body-4">3. It answers and shows its sources</b><span className="body-6 mute">Every fact links to the report it came from, so you can check it.</span></span></li>
            </ol>
          </section>
        </>
      )}

      {status !== "idle" && (
        <div className="answer" aria-live="polite">
          {demo && morning && (
            <div className="card pad democap">
              <p className="caption-3 mute">Demo, question {demo === "2" ? "2" : "1"} of 2</p>
              {demo === "2" ? (
                <p className="body-4">Second question: was it a one-off?<br /><span className="mute">The AI reads the pump records of every well, not only W-17, and connects notes written months apart.</span></p>
              ) : (
                <p className="body-4">W-17, a Wadi Field well, stopped for {morning.stakes.w17_days} days in March: about {usd(morning.stakes.w17_lost_bbl)} in lost revenue at an assumed $70 a barrel (demo assumption).<br /><span className="mute">First the AI finds out why. Then it checks if it can happen again.</span></p>
              )}
            </div>
          )}
          {recorded !== null && (
            <p className="recorded body-6"><span className="badge badge-mute caption-3"><Record weight="bold" aria-hidden />Recorded answer</span>{REASON[recorded] ?? "Replayed from a recording."} You are watching a saved run of the same question, replayed step by step.</p>
          )}
          {status === "running" && <Narration steps={steps} writing={steps.length > 0 && steps.every((s) => s.state !== "running")} />}
          {status === "error" && (
            <div className="card pad errbox" role="alert">
              <p className="body-4"><WarningCircle weight="fill" aria-hidden />No answer for &ldquo;{asked}&rdquo;</p>
              <p className="body-6 mute">{error}</p>
              <div className="errbtns">
                <button className="btn btn-ghost button-sm" type="button" onClick={() => run(asked)}><ArrowClockwise aria-hidden />Try again</button>
                <Link className="btn btn-ghost button-sm" href="/">Pick a suggested question</Link>
              </div>
            </div>
          )}
          {status === "done" && answer && final && (
            <>
              <p className="caption-3 mute">The answer</p>
              <AnswerText text={answer.answer} onRef={openSource} />
              <Tip show={tips}>Each small number points to the report or table it came from. Click one to read the exact passage.</Tip>
              <VizCard viz={answer.viz as Parameters<typeof VizCard>[0]["viz"]} events={events} />
              <div className="card pad trust">
                <div className="trust-main">
                  <span className={`badge caption-3 ${answer.confidence === "high" ? "badge-mint" : answer.confidence === "medium" ? "badge-warn" : "badge-bad"}`}>
                    <SealCheck weight="bold" aria-hidden />{answer.confidence[0].toUpperCase() + answer.confidence.slice(1)} confidence
                  </span>
                  <div className="trust-src">
                    <span className="caption-4 mute">Sources</span>
                    {answer.sources.map((s) => (
                      <button key={s.n + s.id} type="button" className="chip caption-4" onClick={() => openSource(s.n)} title={s.id}>
                        <span className="n mono caption-3">{s.n}</span>{s.label}
                        {s.quote_verified === false && <span className="qmiss caption-4">quote not found</span>}
                      </button>
                    ))}
                  </div>
                </div>
                <Tip show={tips}>The badge says how sure the AI is, and why. {WHY[answer.confidence]}</Tip>
                {answer.could_not_verify && (
                  <>
                    <p className="unv body-6"><Info weight="fill" aria-hidden /><span><span className="body-5" style={{ color: "var(--ink)" }}>Could not verify.</span> {answer.could_not_verify}</span></p>
                    <Tip show={tips}>The AI says what it could not check, instead of guessing.</Tip>
                  </>
                )}
                {final.trace.some((t) => t.full_text_only) && (
                  <p className="unv body-6"><Info weight="fill" aria-hidden /><span>The search ran on exact words only this time: the meaning search service did not answer.</span></p>
                )}
                <div className="trust-foot">
                  <p className="body-6 mute">Answered in {(final.latency_ms / 1000).toFixed(1)} s{passages ? ` from ${passages} ${passages === 1 ? "report" : "reports"}` : ""}{tableRows ? `${passages ? " and" : " from"} ${tableRows} rows of data` : ""}.</p>
                  <button className="btn btn-ghost button-sm" type="button" onClick={() => openSource(null)} aria-controls="drawer">
                    <ListMagnifyingGlass aria-hidden />How this answer was built
                  </button>
                </div>
                {tips && <button type="button" className="tips-off caption-4" onClick={hideTips}><X aria-hidden />Hide these tips</button>}
              </div>
              {countdown !== null && (
                <div className="card pad democap next">
                  <p className="body-4">Next question in {countdown} s: {DEMO[1]}</p>
                  <div className="errbtns">
                    <button className="btn btn-primary button-sm" type="button" onClick={() => setCountdown(0)}><Play weight="fill" aria-hidden />Go now</button>
                    <button className="btn btn-ghost button-sm" type="button" onClick={() => router.replace(`/?q=${encodeURIComponent(DEMO[0])}`, { scroll: false })}><X aria-hidden />Stop the demo</button>
                  </div>
                </div>
              )}
              <Drawer open={drawer} onClose={() => setDrawer(false)} steps={steps} final={final} events={events} focus={focus} />
            </>
          )}
        </div>
      )}
    </>
  );
}

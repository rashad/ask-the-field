"use client";
import { ArrowRight, ChatCircleText, ListMagnifyingGlass, Play, SealCheck } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { PRICE_NOTE, round100, usd } from "@/lib/money";
import { DATA_START, DOC_TYPES, docTypeLabel, FIELDS, longDate, num as n, TODAY } from "@/lib/domain";
import { SUGGESTED } from "@/lib/questions";
import type { Morning } from "@/lib/morning";
import { DOC_COUNT } from "./human";
import { InfoTip, Term, GLOSSARY, type TermKey } from "./term";

const MONTHS_OF_DATA = Math.round((Date.parse(TODAY) - Date.parse(DATA_START)) / (864e5 * 30.44));
const DOC_KINDS = DOC_TYPES.map((t) => docTypeLabel(t).toLowerCase() + "s").join(", ");

export function Intro({ m }: { m: Morning | null }) {
  return (
    <section className="intro" aria-labelledby="intro-t">
      <p className="eyebrow">Concept prototype, synthetic data</p>
      <h1 className="h1" id="intro-t">A RAG demo on a made-up oil company</h1>
      <ul className="intro-l">
        <li><b>What it is.</b> RAG is an AI that answers questions from a company&rsquo;s own documents and data, and shows its sources. This app is a concept prototype of one.</li>
        <li><b>The data.</b> A fictional oil company: {FIELDS.length} fields, {m?.wells_total ?? 41} <Term k="well">wells</Term>, {MONTHS_OF_DATA} months of daily production, and {DOC_COUNT} field documents ({DOC_KINDS}) generated for this demo. Nothing is real.</li>
        <li><b>Try it.</b> Ask a question below, or pick one of the {SUGGESTED.length} briefing questions. Each answer shows the documents and data rows it used.</li>
      </ul>
      <Link className="textlink" href="/about">How it works<ArrowRight aria-hidden /></Link>
    </section>
  );
}

export function Snapshot({ m }: { m: Morning }) {
  return (
    <section className="block" aria-labelledby="snap-t">
      <div className="sec-h"><h2 id="snap-t">The field this morning, {longDate(m.today)}</h2><span>Synthetic data</span></div>
      <dl className="tiles">
        <div className="tile"><dt>Wells producing<InfoTip label="About wells producing">Wells pumping oil on the demo date, out of all wells in the {FIELDS.length} fields, read from the synthetic data.</InfoTip></dt><dd>{m.wells_producing} <small>of {m.wells_total}</small></dd><span className="sub">{m.wells_down} down</span></div>
        <div className="tile"><dt>Open incidents<InfoTip label="About open incidents">Problems on a well that are reported but not fixed yet, such as a failed pump, read from the synthetic data.</InfoTip></dt><dd>{m.open_incidents}</dd><span className="sub">{m.shut_in_by_incident} wells <Term k="shutin" /></span></div>
        <div className="tile"><dt>Oil produced yesterday<InfoTip label="About oil produced yesterday">Barrels of oil all wells produced on {longDate(m.yesterday)}, the day before the demo date, read from the synthetic data.</InfoTip></dt><dd>{n(m.oil_yesterday)}<small>barrels</small></dd></div>
      </dl>
    </section>
  );
}

export function Briefing({ m, onPick, onDemo }: { m: Morning | null; onPick: (q: string) => void; onDemo: () => void }) {
  const s = m?.stakes;
  const stakes = s && m ? [
    `${m.open_incidents} incidents open this morning, ${m.shut_in_by_incident} wells shut in`,
    `W-17 down ${s.w17_days} days in March: about ${round100(s.w17_lost_bbl)} barrels, ${usd(s.w17_lost_bbl)}* lost`,
    `${s.esp_workovers} pump replacements since May 2025: about ${round100(s.esp_lost_bbl)} barrels, ${usd(s.esp_lost_bbl)}* lost`,
    `Wadi Field water cut: ${s.wadi_wc_january}% in January, ${s.wadi_wc_now}% now`,
    `Sand alarm on ${s.sand_well} since ${longDate(s.sand_since)}, ${s.sand_days} days ago`,
  ] : [];
  return (
    <section className="block" id="briefing" aria-labelledby="brief-t">
      <div className="sec-h">
        <h2 id="brief-t">Morning briefing</h2>
        {m ? <button type="button" className="btn btn-ghost" onClick={onDemo}><Play weight="fill" aria-hidden />Watch the demo: W-17</button> : <span>{SUGGESTED.length} questions</span>}
      </div>
      <ol className="rows">
        {SUGGESTED.map((q, i) => (
          <li key={q}>
            <a href={`/?q=${encodeURIComponent(q)}`} onClick={(e) => { e.preventDefault(); onPick(q); }}>
              <span className="n">{i + 1}</span>
              <span className="q"><span>{q}</span>{stakes[i] && <span className="st">{stakes[i]}</span>}</span>
              <ArrowRight className="go" aria-hidden />
            </a>
          </li>
        ))}
      </ol>
      {m && <p className="note-s">* {PRICE_NOTE}</p>}
      <p className="glossary"><span className="faint">Words used here:</span> {(Object.keys(GLOSSARY) as TermKey[]).map((k) => <Term key={k} k={k} />)}</p>
    </section>
  );
}

export function HowItWorks() {
  return (
    <section className="block" aria-labelledby="how3-t">
      <div className="sec-h"><h2 id="how3-t">How it works in 3 steps</h2></div>
      <ol className="trio">
        <li><h3><ChatCircleText aria-hidden />1. You ask</h3><p>A question in your own words, like you would ask a colleague.</p></li>
        <li><h3><ListMagnifyingGlass aria-hidden />2. It looks through the reports and the data</h3><p>It picks the few passages and numbers that matter out of thousands.</p></li>
        <li><h3><SealCheck aria-hidden />3. It answers and shows its sources</h3><p>Every fact links to the report it came from, so you can check it.</p></li>
      </ol>
    </section>
  );
}

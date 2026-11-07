"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Clock } from "@/lib/deadlines";
import styles from "./replay.module.css";

export interface ReplayData {
  caseId: string;
  customer: string;
  received: string;
  channel: string;
  emailSegments: { text: string; placeholder?: string }[];
  docCount: number;
  totalHidden: number;
  policyCount: number;
  model: string;
  seconds: number;
  costPence: number;
  team: string;
  teamReason: string;
  clock: Clock;
  rows: { section: string; text: string; source: string; quote: string; ok: boolean }[];
  verified: number;
  totalStatements: number;
  injection: string | null;
  workingDue: string;
  businessDaysLeft: number;
  refundDue: string | null;
  refundOverdue: boolean;
  morePolicy: number;
  missing: number;
  required: number;
  liveAvailable: boolean;
  proof: { cases: number; verified: number; statements: number; costUsd: number; hiddenDetails: number };
}

const PHASES = ["Complaint arrives", "Details hidden", "AI drafts the pack", "Every quote checked", "Deadlines by code", "A person decides"];

const CLOCK_LABEL: Record<Clock, string> = {
  "8_weeks": "8 weeks, the standard FCA rule",
  "15_business_days": "15 business days, the payment services rule",
  confirm: "shorter rule used until the handler confirms",
};

/** Every moment in the replay, in milliseconds, worked out from the size of the case. */
function buildCues(d: ReplayData) {
  const paragraphs = d.emailSegments.filter((s) => s.text.includes("\n\n")).length + 1;
  const hiddenCount = d.emailSegments.filter((s) => s.placeholder).length;
  let t = 400;
  const paragraphAt = Array.from({ length: paragraphs }, (_, i) => t + i * 320);
  t += paragraphs * 320 + 900;
  const phase1 = t;
  const hideAt = Array.from({ length: hiddenCount }, (_, i) => t + i * 850);
  t += hiddenCount * 850 + 700;
  const phase2 = t;
  const thinkingUntil = t + 2600;
  t = thinkingUntil + 300;
  const routingAt = t;
  t += 700;
  const rowAt = d.rows.map((r) => {
    const at = t;
    t += r.section === "Summary" ? 420 : 260;
    return at;
  });
  t += 500;
  const phase3 = t;
  const tickAt = d.rows.map((_, i) => phase3 + 300 + i * 130);
  t = phase3 + 300 + d.rows.length * 130 + 500;
  const injectionAt = t;
  t += 1500;
  const phase4 = t;
  const dueAt = t + 300;
  const refundAt = t + 1100;
  t += 2100;
  const phase5 = t;
  const total = t + 400;
  return { paragraphAt, phase1, hideAt, phase2, thinkingUntil, routingAt, rowAt, phase3, tickAt, injectionAt, phase4, dueAt, refundAt, phase5, total };
}

export default function Replay({ data }: { data: ReplayData }) {
  const cues = useMemo(() => buildCues(data), [data]);
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const startRef = useRef(0);
  const packRef = useRef<HTMLDivElement>(null);

  // Start automatically unless the visitor prefers reduced motion, in which case show the finished result.
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) setElapsed(cues.total);
    else setPlaying(true);
    setReady(true);
  }, [cues.total]);

  useEffect(() => {
    if (!playing) return;
    startRef.current = performance.now() - elapsed;
    let frame = 0;
    const tick = () => {
      const e = performance.now() - startRef.current;
      if (e >= cues.total) {
        setElapsed(cues.total);
        setPlaying(false);
        return;
      }
      setElapsed(e);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // elapsed is read once when play starts, so it is deliberately not a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, cues.total]);

  const at = (ms: number) => elapsed >= ms;
  // While playing, keep the newest part of the pack in view so the action never happens off screen.
  const shownCount = cues.rowAt.filter((x) => elapsed >= x).length + [cues.injectionAt, cues.dueAt, cues.refundAt, cues.phase5].filter((x) => elapsed >= x).length;
  useEffect(() => {
    if (!playing || shownCount === 0) return;
    const last = packRef.current?.lastElementChild;
    if (last instanceof HTMLElement) last.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [shownCount, playing]);
  const phase = at(cues.phase5) ? 5 : at(cues.phase4) ? 4 : at(cues.phase3) ? 3 : at(cues.phase2) ? 2 : at(cues.phase1) ? 1 : 0;
  const finished = elapsed >= cues.total;

  const replay = () => {
    setElapsed(0);
    setPlaying(true);
  };
  const skip = () => {
    setPlaying(false);
    setElapsed(cues.total);
  };

  // Email paragraphs and hidden details.
  let paragraphIndex = 0;
  let hiddenIndex = 0;
  const email = data.emailSegments.map((seg, i) => {
    const parts = seg.text.split("\n\n");
    const out = parts.map((part, j) => {
      if (j > 0) paragraphIndex++;
      const visible = at(cues.paragraphAt[Math.min(paragraphIndex, cues.paragraphAt.length - 1)]);
      return (
        <span key={`${i}-${j}`} className={visible ? styles.in : styles.out}>
          {j > 0 ? "\n\n" : ""}
          {part}
        </span>
      );
    });
    if (!seg.placeholder) return <span key={i}>{out}</span>;
    const k = hiddenIndex++;
    const start = cues.hideAt[k];
    if (at(start + 450)) return <span key={i} className="ph">{seg.placeholder}</span>;
    if (at(start)) return <mark key={i} className={styles.flash}>{seg.text}</mark>;
    return <span key={i}>{seg.text}</span>;
  });
  const hiddenSoFar = cues.hideAt.filter((h) => at(h + 450)).length;

  const ticked = cues.tickAt.filter((x) => at(x)).length;
  const counter = Math.round((data.totalStatements * ticked) / data.rows.length);
  const thinking = at(cues.phase2) && !at(cues.thinkingUntil);
  const thinkPct = thinking ? Math.min(100, ((elapsed - cues.phase2) / (cues.thinkingUntil - cues.phase2)) * 100) : 100;
  const cost = data.costPence < 1 ? "under 1p" : `${data.costPence.toFixed(1)}p`;

  const status = [
    `A new complaint has arrived from ${data.customer}.`,
    `Code hides personal details before anything leaves the bank. ${data.totalHidden} details hidden across ${data.docCount} documents.`,
    `${data.model} reads the hidden-name version and ${data.policyCount} policy paragraphs, then drafts the case pack.`,
    `Code checks every quoted sentence against its source. ${counter} of ${data.totalStatements} found.`,
    `Code works out the deadlines from the date received. The AI never touches them.`,
    `Nothing is sent. A complaints handler reviews, fills the gaps and signs off.`,
  ][phase];

  let sectionSeen = "";

  return (
    <div className={styles.page}>
      <div className={styles.intro}>
        <h1 className={styles.h1}>Watch a complaint become a case pack</h1>
        <p className={styles.lede}>
          One real run, replayed. Every word on the right was written by the AI, checked by code and timed. Nothing was typed in
          by a person. Real time {data.seconds} seconds, cost {cost}.
        </p>
      </div>

      <ol className={styles.phases} aria-label="Stages">
        {PHASES.map((p, i) => (
          <li key={p} className={i === phase ? styles.phaseNow : i < phase ? styles.phaseDone : ""} aria-current={i === phase ? "step" : undefined}>
            <span className={styles.phaseNum}>{i < phase ? "✓" : i + 1}</span> {p}
          </li>
        ))}
      </ol>

      <p className={styles.status} role="status" aria-live="polite">{ready ? status : ""}</p>

      <div className={styles.stage}>
        <section className={styles.pane} aria-label="The complaint">
          <div className={styles.paneHead}>
            <span>Email from the customer · {data.received}</span>
            <span className={hiddenSoFar ? styles.countOn : styles.countOff}>{hiddenSoFar} hidden</span>
          </div>
          <div className={styles.docText}>{email}</div>
          {at(cues.phase1) && (
            <p className={`${styles.note} ${styles.in}`}>
              Names, account numbers and phone numbers are swapped for labels by code before the AI sees anything. Dates and amounts
              stay, because the deadline and the facts depend on them. {at(cues.phase2) && <>{data.totalHidden} details hidden across {data.docCount} documents.</>}
            </p>
          )}
        </section>

        <section className={styles.pane} aria-label="The case pack">
          <div className={styles.paneHead}>
            <span>Case pack · {data.model}</span>
            {at(cues.phase3) && (
              <span className={ticked === data.rows.length ? styles.countOn : styles.countOff}>
                {counter} of {data.totalStatements} quotes found
              </span>
            )}
          </div>
          <div className={styles.packBody} ref={packRef}>
            {!at(cues.phase2) && <p className={styles.waiting}>Waiting for the hidden-name version…</p>}
            {thinking && (
              <div className={styles.thinking}>
                <p>Reading {data.docCount} documents and {data.policyCount} policy paragraphs…</p>
                <div className={styles.bar} role="progressbar" aria-valuenow={Math.round(thinkPct)} aria-valuemin={0} aria-valuemax={100}>
                  <div style={{ width: `${thinkPct}%` }} />
                </div>
                <p className="small muted">{data.seconds} seconds in real time, sped up here.</p>
              </div>
            )}
            {at(cues.routingAt) && (
              <div className={`${styles.routing} ${styles.in}`}>
                <div><span className={styles.k}>Goes to</span> <strong>{data.team}</strong></div>
                <div className="small muted">{data.teamReason}</div>
              </div>
            )}
            <table className={styles.rows}>
              <tbody>
                {data.rows.map((r, i) => {
                  if (!at(cues.rowAt[i])) return null;
                  const head = r.section !== sectionSeen;
                  sectionSeen = r.section;
                  const tick = at(cues.tickAt[i]);
                  return (
                    <tr key={i} className={styles.in}>
                      <td className={styles.tickCell} aria-label={tick ? (r.ok ? "Quote found in source" : "Quote not found") : "Not checked yet"}>
                        {tick ? <span className={r.ok ? styles.tickOk : styles.tickBad}>{r.ok ? "✓" : "✗"}</span> : <span className={styles.tickWait}>·</span>}
                      </td>
                      <td>
                        {head && <span className={styles.section}>{r.section}</span>}
                        {r.text}
                        {tick && r.source && (
                          <span className={styles.cite}> {r.source}: &ldquo;{r.quote}&rdquo;</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {at(cues.phase3) && data.morePolicy > 0 && (
              <p className={`small muted ${styles.in}`}>And {data.morePolicy} more policy paragraphs, each quoted and checked the same way.</p>
            )}
            {at(cues.injectionAt) && data.injection && (
              <div className={`${styles.trap} ${styles.in}`}>
                <strong>The email tried to trick the AI into awarding £5,000.</strong> The answer has to fit a fixed form with no box for an
                outcome or compensation, so it could not. The AI reported it instead: &ldquo;{data.injection}&rdquo;
              </div>
            )}
            {at(cues.dueAt) && (
              <dl className={`${styles.deadlines} ${styles.in}`}>
                <div>
                  <dt>Final response due</dt>
                  <dd><strong>{data.workingDue}</strong>, {data.businessDaysLeft} working days away ({CLOCK_LABEL[data.clock]}). Worked out by code.</dd>
                </div>
                {at(cues.refundAt) && data.refundDue && (
                  <div className={styles.in}>
                    <dt>Refund decision due</dt>
                    <dd>
                      <strong>{data.refundDue}</strong>
                      {data.refundOverdue && <span className="tag tag-red">Passed</span>} Unauthorised payment, policy CP-7.1. Needs a person today.
                    </dd>
                  </div>
                )}
              </dl>
            )}
            {at(cues.phase5) && (
              <div className={`${styles.decide} ${styles.in}`}>
                <strong>Not sent yet.</strong> {data.missing} of the {data.required} things {data.team} needs are still missing. The handler fills
                them in or marks them not available, then signs off. Every click is recorded.
              </div>
            )}
          </div>
        </section>
      </div>

      <div className={styles.controls}>
        {finished ? (
          <button className="btn btn-secondary" onClick={replay}>Play again</button>
        ) : (
          <>
            <button className="btn btn-secondary" onClick={() => setPlaying((p) => !p)}>{playing ? "Pause" : "Play"}</button>
            <button className="link-button" onClick={skip}>Skip to the end</button>
          </>
        )}
        <Link href={`/case/${data.caseId}`} className="btn">Review this case yourself</Link>
        {data.liveAvailable ? (
          <span className="small muted">Live AI is on. Open the case and press &ldquo;Run live AI on this case&rdquo; to see a fresh run.</span>
        ) : (
          <span className="small muted">Live AI is switched off in this copy. The workspace uses saved runs.</span>
        )}
      </div>

      <section className={styles.proof} aria-labelledby="proof-h">
        <h2 id="proof-h" className={styles.h2}>Measured across all {data.proof.cases} test complaints</h2>
        <dl className={styles.stats}>
          <div><dd>{data.proof.verified} of {data.proof.statements}</dd><dt>quoted sentences found in their source</dt></div>
          <div><dd>{data.proof.cases} of {data.proof.cases}</dd><dt>sent to the right specialist team</dt></div>
          <div><dd>{data.proof.hiddenDetails}</dd><dt>personal details hidden before any AI call</dt></div>
          <div><dd>{(data.proof.costUsd * 79).toFixed(2)}p</dd><dt>average cost per complaint</dt></div>
        </dl>
        <p className="small muted">
          Scored by code against answer keys written before the prompt. Ten more complaints are held back for the final test and have
          not been run. Full method and limits on <Link href="/how-it-works">How this works</Link>.
        </p>
      </section>

      <p className={styles.more}>
        Want it slower? <Link href="/walkthrough">Take the five-step explanation</Link>, or open <Link href="/queue">all {data.proof.cases} complaints</Link>.
      </p>
    </div>
  );
}

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
  missingLabels: string[];
  board: {
    open: number;
    overdue: number;
    vulnerable: number;
    vulnNotRecorded: number;
    incident: { count: number; date: string | null; ref: string } | null;
  };
  liveAvailable: boolean;
  proof: { cases: number; verified: number; statements: number; costUsd: number; hiddenDetails: number };
}

const PHASES = [
  "Complaint arrives",
  "Details hidden",
  "AI drafts the pack",
  "Every quote checked",
  "Deadlines by code",
  "Handler reviews",
  "Handler signs off",
  "Specialist accepts",
  "Team leader sees",
];

const CLOCK_LABEL: Record<Clock, string> = {
  "8_weeks": "8 weeks, the standard FCA rule",
  "15_business_days": "15 business days, the payment services rule",
  confirm: "shorter rule used until the handler confirms",
};

const GAP_TEXT = "Asked the customer on 9 Nov, awaiting reply";
/** A breath before each stage, and how much slower than a demo-speed run the whole thing plays. */
const PAUSE = 900;
const PACE = 1.35;
/** Narration clip lengths in seconds. Each stage lasts at least this long, so the voice never overruns. */
const CLIP_SECONDS = [9.4, 9.8, 12.2, 10.6, 9.7, 8.2, 8.0, 8.5, 12.2];
const minStage = (n: number) => (CLIP_SECONDS[n] * 1000 + 600) / PACE;

function slow<T>(x: T): T {
  if (typeof x === "number") return (x * PACE) as T;
  if (Array.isArray(x)) return x.map(slow) as T;
  if (x && typeof x === "object") return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, slow(v)])) as T;
  return x;
}

/** Every moment in the replay, in milliseconds, worked out from the size of the case. */
function buildCues(d: ReplayData) {
  const paragraphs = d.emailSegments.filter((s) => s.text.includes("\n\n")).length + 1;
  const hiddenCount = d.emailSegments.filter((s) => s.placeholder).length;
  let t = 400;
  const paragraphAt = Array.from({ length: paragraphs }, (_, i) => t + i * 320);
  t += paragraphs * 320 + 900;
  t = Math.max(t + PAUSE, minStage(0));
  const phase1 = t;
  const hideAt = Array.from({ length: hiddenCount }, (_, i) => t + i * 850);
  t += hiddenCount * 850 + 700;
  t = Math.max(t + PAUSE, phase1 + minStage(1));
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
  t = Math.max(t + PAUSE, phase2 + minStage(2));
  const phase3 = t;
  const tickAt = d.rows.map((_, i) => phase3 + 300 + i * 130);
  t = phase3 + 300 + d.rows.length * 130 + 500;
  const injectionAt = t;
  t += 1500;
  t = Math.max(t + PAUSE, phase3 + minStage(3));
  const phase4 = t;
  const dueAt = t + 300;
  const refundAt = t + 1100;
  t += 2300;

  // The person's part. Each move is where the cursor goes, each click is when it presses.
  t = Math.max(t + PAUSE, phase4 + minStage(4));
  const phase5 = t;
  const acceptMove = t + 900;
  const acceptClick = t + 1700;
  const gapsAt = t + 2500;
  const gapMove = t + 3200;
  const gapClick = t + 3900;
  const typeAt = Array.from({ length: GAP_TEXT.length }, (_, i) => t + 4200 + i * 45);
  const saveMove = t + 4200 + GAP_TEXT.length * 45 + 300;
  const saveClick = saveMove + 600;
  const otherGapAt = Array.from({ length: Math.max(0, d.missingLabels.length - 1) }, (_, i) => saveClick + 900 + i * 800);
  t = saveClick + 900 + Math.max(0, d.missingLabels.length - 1) * 800 + 600;
  t = Math.max(t + PAUSE, phase5 + minStage(5));
  const phase6 = t;
  const signMove = t + 500;
  const signClick = t + 1300;
  const sentAt = t + 1600;
  const auditAt = [t + 2000, t + 2350, t + 2700];
  t += 4000;
  t = Math.max(t + PAUSE, phase6 + minStage(6));
  const phase7 = t;
  const inboxAt = t + 300;
  const specMove = t + 1200;
  const specClick = t + 2000;
  const acceptedAt = t + 2300;
  t += 3800;
  t = Math.max(t + PAUSE, phase7 + minStage(7));
  const phase8 = t;
  const tileAt = [t + 300, t + 700, t + 1100, t + 1500];
  const patternAt = [t + 2200, t + 2800];
  const total = Math.max(t + 3600, phase8 + minStage(8));
  return slow({
    paragraphAt, phase1, hideAt, phase2, thinkingUntil, routingAt, rowAt, phase3, tickAt, injectionAt, phase4, dueAt, refundAt,
    phase5, acceptMove, acceptClick, gapsAt, gapMove, gapClick, typeAt, saveMove, saveClick, otherGapAt,
    phase6, signMove, signClick, sentAt, auditAt, phase7, inboxAt, specMove, specClick, acceptedAt, phase8, tileAt, patternAt, total,
  });
}

type Target = "accept" | "gap0" | "gap1" | "gap2" | "gap3" | "save" | "sign" | "spec" | null;

export default function Replay({ data }: { data: ReplayData }) {
  const cues = useMemo(() => buildCues(data), [data]);
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [stepMode, setStepMode] = useState(false);
  const [sound, setSound] = useState(false);
  const voiceRef = useRef<HTMLAudioElement | null>(null);
  const stepModeRef = useRef(false);
  stepModeRef.current = stepMode;
  const [ready, setReady] = useState(false);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const startRef = useRef(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const packRef = useRef<HTMLDivElement>(null);
  const targets = useRef<Record<string, HTMLElement | null>>({});
  const setTarget = (name: string) => (el: HTMLElement | null) => {
    targets.current[name] = el;
  };

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
    // In one-stage-at-a-time mode, play up to the next stage boundary and stop there.
    const boundaries = [cues.phase1, cues.phase2, cues.phase3, cues.phase4, cues.phase5, cues.phase6, cues.phase7, cues.phase8, cues.total];
    const stopAt = stepModeRef.current ? (boundaries.map((b) => (b === cues.total ? b : b - 1)).find((b) => b > elapsed + 50) ?? cues.total) : cues.total;
    let frame = 0;
    const tick = () => {
      const e = performance.now() - startRef.current;
      if (e >= stopAt) {
        setElapsed(stopAt);
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
  const phase = at(cues.phase8) ? 8 : at(cues.phase7) ? 7 : at(cues.phase6) ? 6 : at(cues.phase5) ? 5 : at(cues.phase4) ? 4 : at(cues.phase3) ? 3 : at(cues.phase2) ? 2 : at(cues.phase1) ? 1 : 0;
  const finished = elapsed >= cues.total;

  // Which gap the cursor is working on after the first one is saved.
  const otherGapIndex = cues.otherGapAt.filter((x) => at(x - 500)).length; // moves 500ms before each click
  const target: Target =
    at(cues.phase8) || finished ? null
    : at(cues.specMove) ? "spec"
    : at(cues.phase7) ? null
    : at(cues.signMove) ? "sign"
    : at(cues.saveClick + 400) && otherGapIndex > 0 ? (`gap${otherGapIndex}` as Target)
    : at(cues.saveMove) ? "save"
    : at(cues.gapMove) ? "gap0"
    : at(cues.acceptMove) ? "accept"
    : null;
  const clicks = [cues.acceptClick, cues.gapClick, cues.saveClick, ...cues.otherGapAt, cues.signClick, cues.specClick];
  const pressing = clicks.some((c) => elapsed >= c && elapsed < c + 220);
  const typed = GAP_TEXT.slice(0, cues.typeAt.filter((x) => at(x)).length);
  const filledGaps = data.missingLabels.map((_, i) => (i === 0 ? at(cues.saveClick) : at(cues.otherGapAt[i - 1] ?? Infinity)));
  const allFilled = filledGaps.length > 0 && filledGaps.every(Boolean);

  // Place the cursor over its target. Re-measured whenever the layout above the target can have changed.
  const layoutKey = [cues.gapsAt, cues.gapClick, cues.saveClick, ...cues.otherGapAt, cues.sentAt, cues.inboxAt].filter((x) => at(x)).length;
  useEffect(() => {
    if (!target || !stageRef.current) {
      setCursor(null);
      return;
    }
    const el = targets.current[target];
    if (!el) return;
    const s = stageRef.current.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    setCursor({ x: r.left - s.left + Math.min(r.width - 12, 28), y: r.top - s.top + r.height / 2 });
  }, [target, layoutKey]);

  // While playing, keep the action in view so nothing happens off screen.
  const shownCount = [...cues.rowAt, cues.injectionAt, cues.dueAt, cues.refundAt, cues.phase5, cues.gapsAt, cues.sentAt, ...cues.auditAt, ...cues.tileAt, ...cues.patternAt]
    .filter((x) => elapsed >= x).length;
  useEffect(() => {
    if (!playing || shownCount === 0) return;
    const focus = target ? targets.current[target] : null;
    if (focus) focus.scrollIntoView({ block: "center", behavior: "smooth" });
    else {
      const last = packRef.current?.lastElementChild;
      if (last instanceof HTMLElement) last.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [shownCount, playing, target]);

  // Narration: one clip per stage, started when the stage starts.
  useEffect(() => {
    if (!sound) voiceRef.current?.pause();
  }, [sound]);
  // In one-stage-at-a-time mode the clock sits just before the next boundary, so do not restart the old line there.
  const nextBoundary = [cues.phase1, cues.phase2, cues.phase3, cues.phase4, cues.phase5, cues.phase6, cues.phase7, cues.phase8, cues.total][phase];
  const atStageEnd = nextBoundary - elapsed < 80;
  useEffect(() => {
    if (!sound || !playing || atStageEnd) return;
    voiceRef.current?.pause();
    const clip = new Audio(`/audio/stage-${phase}.m4a`);
    clip.volume = 1;
    voiceRef.current = clip;
    clip.play().catch(() => {});
    return () => clip.pause();
    // atStageEnd is deliberately left out: it only gates the start, it should not stop a line that is playing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, sound, playing]);

  const replay = () => {
    setElapsed(0);
    setPlaying(true);
  };
  const skip = () => {
    setPlaying(false);
    setElapsed(cues.total);
  };
  const choosePace = (step: boolean) => {
    setStepMode(step);
    setPlaying(false);
  };
  // Which side the action is on, so the other side can dim.
  const activeSide: "left" | "right" = phase <= 1 || phase === 7 ? "left" : "right";

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
  const accepted = at(cues.acceptClick);
  const readyCount = at(cues.tileAt[2] + 600) ? 1 : 0;

  const status = [
    `A new complaint has arrived from ${data.customer}.`,
    `Code hides personal details before anything leaves the bank. ${data.totalHidden} details hidden across ${data.docCount} documents.`,
    `${data.model} reads the hidden-name version and ${data.policyCount} policy paragraphs, then drafts the case pack.`,
    `Code checks every quoted sentence against its source. ${counter} of ${data.totalStatements} found.`,
    `Code works out the deadlines from the date received. The AI never touches them.`,
    `A complaints handler takes over. Watch the cursor: accept the checked sentences, then fill the ${data.missing} gaps.`,
    `Every gap is filled or explained, so the sign-off button appears. One click sends it to ${data.team}.`,
    `${data.team} get their own screen with the handover pack. They can act on it, so they accept.`,
    `The team leader's board updates on its own. Nobody typed a report.`,
  ][phase];

  let sectionSeen = "";
  const rightHead =
    phase >= 8 ? "Team leader view · live board"
    : phase >= 7 ? `Handler's view · sent to ${data.team}`
    : phase >= 5 ? `Handler's review · ${data.customer}`
    : `Case pack · ${data.model}`;

  return (
    <div className={styles.page}>
      <div className={styles.intro}>
        <h1 className={styles.h1}>Watch a complaint become a case pack</h1>
        <p className={styles.lede}>
          One real run, replayed, then the people who act on it. Every word in the pack was written by the AI, checked by code and timed.
          Nothing was typed in by a person. Real time {data.seconds} seconds, cost {cost}.
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

      <div className={styles.stage} ref={stageRef}>
        {cursor && (
          <div className={`${styles.cursor} ${pressing ? styles.cursorPress : ""}`} style={{ transform: `translate(${cursor.x}px, ${cursor.y}px)` }} aria-hidden="true">
            <svg width="22" height="26" viewBox="0 0 22 26"><path d="M2 2l16 12-7 1 4 8-3 1-4-8-6 5z" fill="#0b0c0c" stroke="#fff" strokeWidth="1.5" /></svg>
          </div>
        )}

        <section className={`${styles.pane} ${activeSide !== "left" ? styles.dim : ""}`} aria-label={phase >= 7 ? `${data.team} team inbox` : "The complaint"}>
          {phase < 7 ? (
            <>
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
            </>
          ) : (
            <>
              <div className={styles.paneHead}><span>{data.team} team · inbox</span><span className={styles.countOn}>1 new handover</span></div>
              <div className={styles.packBody}>
                {at(cues.inboxAt) && (
                  <div className={`${styles.inboxCard} ${styles.in}`}>
                    <p className={styles.k}>Handover pack received</p>
                    <p><strong>{data.customer}</strong> · {data.caseId} · unauthorised card payments</p>
                    <p className="small">
                      {data.required} of {data.required} checklist items in place or explained. Final response due {data.workingDue}. Refund decision
                      {data.refundOverdue ? " overdue" : " due"}.
                    </p>
                    <p className={styles.k}>Could you act on this without contacting anyone?</p>
                    {!at(cues.acceptedAt) ? (
                      <div className={styles.btnRow}>
                        <button ref={setTarget("spec")} className={`btn btn-small ${at(cues.specClick) ? styles.pressed : ""}`} tabIndex={-1}>Yes, accept the handover</button>
                        <button className="btn btn-secondary btn-small" tabIndex={-1}>No, send it back</button>
                      </div>
                    ) : (
                      <p className={styles.in}><span className="tag tag-green">Accepted</span> {data.team} accepted the handover and own the case from here.</p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </section>

        <section className={`${styles.pane} ${activeSide !== "right" ? styles.dim : ""}`} aria-label={phase >= 8 ? "Team leader board" : "The case pack"}>
          <div className={styles.paneHead}>
            <span>{rightHead}</span>
            {phase < 8 && at(cues.phase3) && (
              <span className={ticked === data.rows.length ? styles.countOn : styles.countOff}>
                {accepted ? `${data.totalStatements} accepted` : `${counter} of ${data.totalStatements} quotes found`}
              </span>
            )}
          </div>

          {phase >= 8 ? (
            <div className={styles.packBody} ref={packRef}>
              <dl className={styles.tiles}>
                {at(cues.tileAt[0]) && <div className={styles.in}><dd>{data.board.open}</dd><dt>open complaints</dt></div>}
                {at(cues.tileAt[1]) && <div className={styles.in}><dd className={styles.redText}>{data.board.overdue}</dd><dt>overdue</dt></div>}
                {at(cues.tileAt[2]) && <div className={styles.in}><dd>{readyCount}</dd><dt>with a specialist</dt></div>}
                {at(cues.tileAt[3]) && <div className={styles.in}><dd>{data.board.vulnerable}</dd><dt>show signs of vulnerability</dt></div>}
              </dl>
              {at(cues.patternAt[0]) && data.board.incident && (
                <div className={`${styles.pattern} ${styles.in}`}>
                  <strong>Pattern spotted:</strong> {data.board.incident.count} complaints trace back to one incident
                  {data.board.incident.date ? ` on ${data.board.incident.date}` : ""} ({data.board.incident.ref}). Fix it once, not {data.board.incident.count} times.
                </div>
              )}
              {at(cues.patternAt[1]) && (
                <div className={`${styles.pattern} ${styles.in}`}>
                  <strong>Recurring gap:</strong> vulnerability not formally recorded in {data.board.vulnNotRecorded} of {data.board.vulnerable} vulnerable cases.
                  A training point, not a blame list.
                </div>
              )}
              {at(cues.total) && <p className={`small muted ${styles.in}`}>Counted from the case packs by code. See the full <Link href="/team">team leader view</Link>.</p>}
            </div>
          ) : (
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
              {at(cues.sentAt) && (
                <div className={`${styles.sent} ${styles.in}`}>
                  <span className="tag tag-green">Sent</span> Signed off and handed to {data.team}. Nothing left the handler&apos;s desk until a person pressed the button.
                </div>
              )}
              {at(cues.phase5) && !at(cues.sentAt) && (
                <div className={`${styles.acceptRow} ${styles.in}`}>
                  <button ref={setTarget("accept")} className={`btn btn-small ${at(cues.acceptClick) ? styles.pressed : ""}`} tabIndex={-1} disabled={accepted}>
                    {accepted ? `${data.totalStatements} accepted` : `Accept ${data.totalStatements} verified, section by section`}
                  </button>
                  <span className="small muted">Accepting is by section. Any sentence can still be edited or rejected one at a time.</span>
                </div>
              )}
              {at(cues.routingAt) && (
                <div className={`${styles.routing} ${styles.in}`}>
                  <div><span className={styles.k}>Goes to</span> <strong>{data.team}</strong></div>
                  <div className="small muted">{data.teamReason}</div>
                </div>
              )}
              <table className={`${styles.rows} ${accepted ? styles.rowsAccepted : ""}`}>
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
                          {tick && r.source && <span className={styles.cite}> {r.source}: &ldquo;{r.quote}&rdquo;</span>}
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
                    <dd><strong>{data.workingDue}</strong>, {data.businessDaysLeft} business days away ({CLOCK_LABEL[data.clock]}). Worked out by code.</dd>
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
              {at(cues.gapsAt) && (
                <div className={`${styles.gaps} ${styles.in}`}>
                  <p className={styles.k}>Before handover, {data.team} need these. The AI could not find them in the documents.</p>
                  <ul>
                    {data.missingLabels.map((label, i) => (
                      <li key={label} className={styles.gap}>
                        <span>{label}</span>
                        {filledGaps[i] ? (
                          <span className={`${styles.gapDone} ${styles.in}`}>
                            <span className="tag tag-amber">Not available</span> {i === 0 ? GAP_TEXT : "Not in the bank's records"}
                          </span>
                        ) : i === 0 && at(cues.gapClick) ? (
                          <span className={styles.gapInput}>
                            <span className={styles.fakeInput} aria-label="Why it is not available">{typed}<span className={styles.caret} /></span>
                            <button ref={setTarget("save")} className={`btn btn-small ${at(cues.saveClick) ? styles.pressed : ""}`} tabIndex={-1}>Save</button>
                          </span>
                        ) : (
                          <span className={styles.btnRow}>
                            <button className="btn btn-secondary btn-small" tabIndex={-1}>Add detail</button>
                            <button ref={setTarget(`gap${i}`)} className="btn btn-secondary btn-small" tabIndex={-1}>Not available</button>
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                  {allFilled && !at(cues.sentAt) && (
                    <div className={`${styles.signRow} ${styles.in}`}>
                      <button ref={setTarget("sign")} className={`btn ${at(cues.signClick) ? styles.pressed : ""}`} tabIndex={-1}>Sign off and hand to {data.team}</button>
                    </div>
                  )}
                </div>
              )}
              {at(cues.auditAt[0]) && (
                <div className={`${styles.audit} ${styles.in}`}>
                  <p className={styles.k}>Audit trail</p>
                  <ul>
                    {at(cues.auditAt[0]) && <li className={styles.in}>Handler accepted {data.totalStatements} verified statements.</li>}
                    {at(cues.auditAt[1]) && <li className={styles.in}>Handler marked {data.missing} checklist items not available, with reasons.</li>}
                    {at(cues.auditAt[2]) && <li className={styles.in}>Handler signed off and handed the case to {data.team}.</li>}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      <div className={styles.controls}>
        {finished ? (
          <button className="btn btn-secondary" onClick={replay}>Play again</button>
        ) : stepMode && !playing ? (
          <button className="btn btn-secondary" onClick={() => setPlaying(true)}>{elapsed === 0 ? "Start" : atStageEnd ? `Next: ${PHASES[Math.min(phase + 1, PHASES.length - 1)]}` : `Continue: ${PHASES[phase]}`}</button>
        ) : (
          <button className="btn btn-secondary" onClick={() => setPlaying((p) => !p)}>{playing ? "Pause" : "Play"}</button>
        )}
        {!finished && <button className="link-button" onClick={skip}>Skip to the end</button>}
        <button className={`${styles.soundBtn} ${sound ? styles.soundOn : ""}`} onClick={() => setSound((v) => !v)} aria-pressed={sound}>
          {sound ? "Sound on" : "Sound off"}
        </button>
        <span className={styles.pace} role="group" aria-label="Pace">
          <button className={!stepMode ? styles.paceOn : ""} onClick={() => choosePace(false)} aria-pressed={!stepMode}>Auto play</button>
          <button className={stepMode ? styles.paceOn : ""} onClick={() => choosePace(true)} aria-pressed={stepMode}>One stage at a time</button>
        </span>
        <Link href={`/case/${data.caseId}`} className="btn">Do the review yourself</Link>
        <Link href="/team">Open the team leader view</Link>
        {data.liveAvailable ? (
          <span className="small muted">Live AI is on. Open the case and press &ldquo;Run live AI on this case&rdquo; for a fresh run.</span>
        ) : (
          <span className="small muted">Live AI is switched off in this copy. The workspace uses saved runs.</span>
        )}
      </div>

      <section className={styles.proof} aria-labelledby="proof-h">
        <h2 id="proof-h" className={styles.h2}>Measured across all {data.proof.cases} test complaints</h2>
        <dl className={styles.stats}>
          <div><dd>{data.proof.verified} of {data.proof.statements}</dd><dt>quoted sentences found in their source</dt></div>
          <div><dd>{data.proof.cases} of {data.proof.cases}</dd><dt>sent to the right specialist team</dt></div>
          <div><dd>{data.proof.hiddenDetails}</dd><dt>details replaced before any AI call, across the 15 saved runs</dt></div>
          <div><dd>{(data.proof.costUsd * 79).toFixed(2)}p</dd><dt>average cost per complaint</dt></div>
        </dl>
        <p className="small muted">
          Scored by code against answer keys written before the prompt, on the 15 cases the prompt was improved on. Ten more complaints
          were held back and run once at the end. Their results, including what they caught, are on <Link href="/how-it-works">How this works</Link>.
        </p>
      </section>

      <p className={styles.more}>
        Want it slower? <Link href="/walkthrough">Take the five-step explanation</Link>, or open <Link href="/queue">all {data.proof.cases} complaints</Link>.
      </p>
    </div>
  );
}

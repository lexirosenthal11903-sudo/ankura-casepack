"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { CasePackRun } from "@/lib/casepack";
import { computeDeadlines, type Clock } from "@/lib/deadlines";
import { DEMO_TODAY } from "@/lib/demo";
import { formatDate, modelName } from "@/lib/format";
import { restore } from "@/lib/redact";
import { refundDutyApplies } from "@/lib/rules";
import type { CaseFile } from "@/lib/types";
import { now, readState, writeState, type ReviewState } from "../state";
import type { CaseHeading } from "../Workspace";
import styles from "./handover.module.css";

type Labels = {
  teams: Record<string, { label: string; handover: boolean }>;
  causes: Record<string, string>;
  checklist: Record<string, string>;
  teamChecklists: Record<string, string[]>;
  sendBack: { id: string; label: string }[];
};

const CLOCK_LABEL: Record<Clock, string> = {
  "8_weeks": "8 weeks, standard FCA complaint rule",
  "15_business_days": "15 business days, payment services rule",
  confirm: "Not yet confirmed by the handler",
};

export default function Handover({ caseFile, heading, run, labels }: { caseFile: CaseFile; heading: CaseHeading; run: CasePackRun; labels: Labels }) {
  const [state, setState] = useState<ReviewState | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [canAct, setCanAct] = useState<"yes" | "no" | null>(null);
  const [reason, setReason] = useState("");
  const [reasonText, setReasonText] = useState("");
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setState(readState(caseFile.id));
    setLoaded(true);
  }, [caseFile.id]);

  const pack = run.pack;
  const team = labels.teams[pack.intake.suggested_team];
  const show = (t: string) => restore(t, run.redacted.replacements, run.redacted.display);

  if (!loaded) return null;

  const handedOver = state && (state.stage === "with_specialist" || state.stage === "accepted_by_specialist" || state.stage === "returned");
  if (!state || !handedOver) {
    return (
      <div className={styles.notYet}>
        <h1>Not handed over yet</h1>
        <p>The complaints handler has not signed off this case and sent it to {team.label} yet.</p>
        <Link href={`/case/${caseFile.id}`} className="btn">Go to the handler&apos;s view</Link>
      </div>
    );
  }

  const decision = (path: string) => state.decisions[path];
  const kept = (path: string, text: string) => {
    const d = decision(path);
    if (d?.status === "rejected") return null;
    return d?.status === "edited" && d.text ? d.text : show(text);
  };
  const clock: Clock = run.clock === "confirm" ? state.clockChoice ?? "confirm" : run.clock;
  const deadlines = computeDeadlines(run.redacted.received, clock, DEMO_TODAY, { refundDuty: refundDutyApplies(pack) });
  const checklistIds = (labels.teamChecklists[pack.intake.suggested_team] ?? []).filter((id) => !(pack.intake.suggested_team === "frontline" && id === "customer_told_of_handover"));
  const byId = new Map(pack.handover_checklist.map((x) => [x.item_id, x]));
  const signedOffAt = [...state.audit].reverse().find((a) => a.actor === "Handler" && a.action.includes("hand"))?.at;

  function confirm() {
    if (!state) return;
    let next: ReviewState;
    if (canAct === "yes") {
      next = { ...state, stage: "accepted_by_specialist", audit: [...state.audit, { at: now(), actor: "Specialist", action: `${team.label} accepted the handover: able to act without contacting anyone.` }] };
    } else {
      const base = labels.sendBack.find((r) => r.id === reason)?.label ?? reason;
      const why = reason === "other" ? reasonText.trim() : base;
      next = {
        ...state,
        stage: "returned",
        returnReason: why,
        changesSinceReturn: 0,
        audit: [...state.audit, { at: now(), actor: "Specialist", action: `${team.label} sent the case back: ${why}.` }],
      };
    }
    writeState(caseFile.id, next);
    setState(next);
    setTimeout(() => resultRef.current?.focus(), 0);
  }

  return (
    <div className={styles.page}>
      <p className={`${styles.role} no-print`}>
        <strong>You are now the {team.label} team.</strong> A complaints handler has signed off this case and sent it to you. Read the
        handover pack, then decide: could you act on it without contacting anyone?
      </p>

      <article className={styles.pack} aria-labelledby="pack-title">
        <div className={styles.packHeader}>
          <p className={styles.kicker}>Harbour &amp; Vale Bank · Handover pack · {team.label}</p>
          <h1 id="pack-title">{heading.title}</h1>
          {heading.complainant && <p className={styles.complainant}>Complaint from {heading.complainant}</p>}
          <p className="small muted">
            {caseFile.id} · received {formatDate(caseFile.received, true)} · {pack.intake.issues.map((i) => labels.causes[i.cause]).join("; ")}
          </p>
        </div>

        <dl className={styles.facts}>
          <div><dt>Final response due</dt><dd>{formatDate(deadlines.workingDue, true)} ({CLOCK_LABEL[clock]})</dd></div>
          {deadlines.refundDue && (
            <div><dt>Refund decision due</dt><dd className={deadlines.refundOverdue ? styles.red : ""}>{formatDate(deadlines.refundDue, true)}{deadlines.refundOverdue ? ", passed" : ""} (unauthorised payment, policy CP-7.1)</dd></div>
          )}
          <div><dt>Vulnerability</dt><dd>{pack.vulnerability.length ? pack.vulnerability.map((v, i) => kept(`vulnerability.${i}`, v.signal)).filter(Boolean).join("; ") : "No signs found"}</dd></div>
          <div><dt>What the customer wants</dt><dd>{kept("outcome_sought", pack.outcome_sought.text)}</dd></div>
        </dl>

        <h2>Summary</h2>
        <ul>{pack.summary.map((s, i) => { const t = kept(`summary.${i}`, s.text); return t ? <li key={i}>{t}</li> : null; })}</ul>

        {pack.flags.length > 0 && (
          <>
            <h2>Flags</h2>
            <ul>{pack.flags.map((f, i) => { const t = kept(`flags.${i}`, f.description); return t ? <li key={i}><strong>{f.type.replaceAll("_", " ")}:</strong> {t}</li> : null; })}</ul>
          </>
        )}

        {pack.conflicts.length > 0 && (
          <>
            <h2>Records that disagree</h2>
            <ul>{pack.conflicts.map((c, i) => { const t = kept(`conflicts.${i}`, c.text); return t ? <li key={i}>{t}</li> : null; })}</ul>
          </>
        )}

        <h2>Handover checklist</h2>
        <table className={styles.table}>
          <thead><tr><th scope="col">Item</th><th scope="col">Status</th><th scope="col">Detail</th></tr></thead>
          <tbody>
            {checklistIds.map((id) => {
              const item = byId.get(id);
              const fix = state.gapFixes[id];
              const status = fix ? (fix.status === "added" ? "Added by handler" : "Not available") : item?.status === "present" ? "In place" : item?.status === "not_applicable" ? "Does not apply" : item?.status === "conflicting" ? "Sources disagree" : "Missing";
              const detail = fix ? fix.text : item?.value ? show(item.value) : "";
              return (
                <tr key={id}>
                  <td>{labels.checklist[id]}</td>
                  <td><span className={status === "Missing" || status === "Sources disagree" ? styles.red : status === "Not available" ? styles.amber : ""}>{status}</span></td>
                  <td>{detail}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <h2>Timeline</h2>
        <ul>{pack.timeline.map((t, i) => { const e = kept(`timeline.${i}`, t.event); return e ? <li key={i}><strong>{formatDate(t.date)}</strong> {e}</li> : null; })}</ul>

        <p className={styles.provenance}>
          Prepared by {modelName(run.model)} (prompt {run.promptVersion}) from redacted case notes. Every statement was checked against its
          source by code, then reviewed and signed off by the complaints handler{signedOffAt ? ` at ${signedOffAt.slice(11, 16)}` : ""}.
          Statements the handler rejected are left out. Fictional bank and synthetic data.
        </p>
      </article>

      <section className={`${styles.decide} no-print`} aria-labelledby="decide-h">
        <button className="btn btn-secondary" onClick={() => window.print()}>Download handover pack (PDF)</button>
        <p className="small muted">Opens your browser&apos;s print window. Choose &ldquo;Save as PDF&rdquo;.</p>

        <div ref={resultRef} tabIndex={-1} role="status" className={styles.result}>
          {state.stage === "accepted_by_specialist" && (
            <p><span className="tag tag-green">Accepted</span> You accepted the handover. <Link href={`/case/${caseFile.id}`}>Back to the handler&apos;s view</Link></p>
          )}
          {state.stage === "returned" && (
            <p><span className="tag tag-red">Sent back</span> Reason: {state.returnReason}. <Link href={`/case/${caseFile.id}`}>Switch to the handler&apos;s view to fix it</Link></p>
          )}
        </div>

        {state.stage === "with_specialist" && (
          <>
            <h2 id="decide-h">Your decision</h2>
            <fieldset className={styles.fieldset}>
              <legend><strong>Could you act on this without contacting anyone?</strong></legend>
              <label><input type="radio" name="canact" checked={canAct === "yes"} onChange={() => setCanAct("yes")} /> Yes, accept the handover</label>
              <label><input type="radio" name="canact" checked={canAct === "no"} onChange={() => setCanAct("no")} /> No, send it back to the handler</label>
            </fieldset>
            {canAct === "no" && (
              <div className={styles.reason}>
                <label htmlFor="reason">What is missing?</label>
                <select id="reason" value={reason} onChange={(e) => setReason(e.target.value)}>
                  <option value="">Choose a reason</option>
                  {labels.sendBack.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
                {reason === "other" && (
                  <>
                    <label htmlFor="reason-text">Describe it</label>
                    <input id="reason-text" value={reasonText} onChange={(e) => setReasonText(e.target.value)} />
                  </>
                )}
              </div>
            )}
            <button className="btn" onClick={confirm} disabled={!canAct || (canAct === "no" && (!reason || (reason === "other" && !reasonText.trim())))}>
              Confirm decision
            </button>
            <p className="small muted">Send-backs are counted to improve the process, never to score an individual handler.</p>
          </>
        )}
      </section>
    </div>
  );
}

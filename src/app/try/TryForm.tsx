"use client";
/**
 * The visitor types a fictional complaint and sees the real pipeline run on it.
 * The result view is read-only: what the AI saw, then the pack with each statement's check result.
 */
import { useEffect, useState } from "react";
import type { CasePackRun } from "@/lib/casepack";
import { formatDate } from "@/lib/format";
import styles from "./try.module.css";

const CLOCK_LABEL: Record<string, string> = {
  "8_weeks": "8 weeks, the standard FCA rule",
  "15_business_days": "15 business days, the payment services rule",
  confirm: "unclear, so the shorter rule is used until a person confirms",
};

function Placeholders({ text }: { text: string }) {
  const parts = text.split(/(\[[A-Z][A-Z_]*(?:_\d+)?\])/g);
  return <>{parts.map((p, i) => (/^\[[A-Z][A-Z_]*(?:_\d+)?\]$/.test(p) ? <span key={i} className="ph">{p}</span> : <span key={i}>{p}</span>))}</>;
}

export default function TryForm({ liveAvailable, example, maxChars, teams }: { liveAvailable: boolean; example: string; maxChars: number; teams: Record<string, string> }) {
  const [name, setName] = useState("Sam Okafor");
  const [text, setText] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [run, setRun] = useState<CasePackRun | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setRun(null);
    setLoading(true);
    try {
      const res = await fetch("/api/try", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, text, confirmed }) });
      const data = (await res.json()) as { run?: CasePackRun; error?: string };
      if (!res.ok || !data.run) setError(data.error ?? "Something went wrong.");
      else setRun(data.run);
    } catch {
      setError("The request did not complete. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  const [waited, setWaited] = useState(0);
  useEffect(() => {
    if (!loading) return;
    setWaited(0);
    const t = window.setInterval(() => setWaited((w) => w + 1), 1000);
    return () => window.clearInterval(t);
  }, [loading]);
  const stageText = waited < 2 ? "Hiding personal details…" : waited < 35 ? `The AI is drafting the pack, usually 25 to 45 seconds… ${waited}s` : `Checking every quote against the source… ${waited}s`;
  function reset() {
    setRun(null);
    setError(null);
    setText("");
    setConfirmed(false);
    window.scrollTo({ top: 0 });
  }

  const checks = run ? new Map(run.checks.statements.map((s) => [s.path, s])) : null;
  const Mark = ({ path }: { path: string }) => {
    const c = checks?.get(path);
    if (!c) return null;
    return c.supported ? <span className={styles.ok}>verified</span> : <span className={styles.bad}>quote not found, would be rejected</span>;
  };

  return (
    <>
      <form onSubmit={submit} className={styles.form}>
        <label>
          Fictional customer name
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required />
        </label>
        <label>
          The complaint, as the customer wrote it
          <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, maxChars))} rows={12} required placeholder="Write a made-up complaint, or use the example." />
        </label>
        <div className={styles.row}>
          <button type="button" className="btn btn-secondary btn-small" onClick={() => setText(example)}>Use the example, which has a hidden instruction in it</button>
          <span className="small muted">{text.length} of {maxChars} characters</span>
        </div>
        <label className={styles.check}>
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} required /> This is made up. It contains no real person&apos;s details.
        </label>
        {!liveAvailable && <p className={styles.error}>Live mode is switched off at the moment, so your own complaint cannot be run. The built-in cases still work.</p>}
        <button className="btn" type="submit" disabled={loading || !liveAvailable || !confirmed || text.length < 80}>
          {loading ? "Running…" : "Run it"}
        </button>
        {loading && <p className="small muted" role="status">{stageText}</p>}
        {error && <p className={styles.error} role="alert">{error}</p>}
      </form>

      {run && (
        <div className={styles.result} aria-live="polite">
          <div className={styles.row}>
            <h2>1. What the AI was allowed to see</h2>
            <button type="button" className="btn btn-secondary btn-small" onClick={reset}>Start again</button>
          </div>
          <p className="small muted">{run.redacted.replacements.length} details replaced before anything was sent. Dates and amounts stay, because deadlines and facts depend on them.</p>
          <pre className={styles.doc}><Placeholders text={run.redacted.documents[0].text} /></pre>

          <h2>2. What the AI drafted, and what code made of it</h2>
          <dl className={styles.facts}>
            <div><dt>Suggested team</dt><dd>{teams[run.pack.intake.suggested_team] ?? run.pack.intake.suggested_team}</dd></div>
            <div><dt>Deadline rule</dt><dd>{CLOCK_LABEL[run.clock] ?? run.clock}. Final response due {formatDate(run.deadlines.workingDue)}, worked out by code.</dd></div>
            <div><dt>Quotes checked</dt><dd>{run.checks.supportedCount} verified, {run.checks.unsupportedCount} not found in the source</dd></div>
            <div><dt>Cost and time</dt><dd>{(run.usage.costUsd * 79).toFixed(2)}p, {Math.round(run.usage.latencyMs / 1000)} seconds on {run.model}</dd></div>
          </dl>

          {run.pack.flags.length > 0 && (
            <>
              <h3>Flags</h3>
              <ul>
                {run.pack.flags.map((f, i) => (
                  <li key={i}><span className={`tag ${f.type === "instruction_in_customer_text" ? "tag-red" : "tag-amber"}`}>{f.type.replaceAll("_", " ")}</span> {f.description} <Mark path={`flags.${i}`} /></li>
                ))}
              </ul>
            </>
          )}
          <h3>Summary</h3>
          <ul>{run.pack.summary.map((s, i) => <li key={i}>{s.text} <Mark path={`summary.${i}`} /></li>)}</ul>
          <h3>What the customer wants</h3>
          <p>{run.pack.outcome_sought.text} <Mark path="outcome_sought" /></p>
          <h3>Vulnerability</h3>
          {run.pack.vulnerability.length === 0 ? <p className="small muted">No signs found.</p> : <ul>{run.pack.vulnerability.map((s, i) => <li key={i}>{s.signal} <Mark path={`vulnerability.${i}`} /></li>)}</ul>}
          <h3>Relevant policy</h3>
          <ul>{run.pack.relevant_policy.map((p, i) => <li key={i}><strong>{p.policy_id}</strong> {p.why_relevant} <Mark path={`relevant_policy.${i}`} /></li>)}</ul>
          <h3>What the specialist would still need</h3>
          {run.checks.checklist.missing.length === 0 ? <p className="small muted">Nothing missing against the checklist.</p> : <ul>{run.checks.checklist.missing.map((m) => <li key={m}>{m.replaceAll("_", " ")}</li>)}</ul>}
          <p className="small muted">
            There is no field for an outcome or compensation anywhere in this form, so an instruction to award money has nowhere to go. A handler would now check each line, fill the gaps and sign off. The AI decided nothing.
          </p>
          <button type="button" className="btn btn-secondary" onClick={reset}>Start again with another complaint</button>
        </div>
      )}
    </>
  );
}

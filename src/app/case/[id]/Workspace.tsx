"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import type { CasePackRun, StatementCheck } from "@/lib/casepack";
import { computeDeadlines, type Clock } from "@/lib/deadlines";
import { DEMO_TODAY } from "@/lib/demo";
import { deadlineTag, formatDate, modelName } from "@/lib/format";
import { restore } from "@/lib/redact";
import type { CaseFile } from "@/lib/types";
import styles from "./workspace.module.css";

type Labels = {
  teams: Record<string, { label: string; handover: boolean }>;
  causes: Record<string, string>;
  products: Record<string, string>;
  checklist: Record<string, string>;
  teamChecklists: Record<string, string[]>;
  sendBack: { id: string; label: string }[];
  policy: Record<string, { heading: string; text: string }>;
};

type Decision = { status: "accepted" | "rejected" | "edited"; text?: string };
type Stage = "review" | "signed_off" | "with_specialist" | "returned" | "accepted_by_specialist";
type AuditEntry = { at: string; actor: "System" | "Handler" | "Specialist"; action: string };

interface Saved {
  decisions: Record<string, Decision>;
  clockChoice: Clock | null;
  stage: Stage;
  audit: AuditEntry[];
  clicks: number;
  returnReason?: string;
}

const CHANNEL: Record<string, string> = { phone: "phone", email: "email", web_form: "web form", branch: "branch", letter: "letter", social: "social media" };
const CLOCK_LABEL: Record<Clock, string> = {
  "8_weeks": "8 weeks (DISP 1.6.2R)",
  "15_business_days": "15 business days, payment services (DISP 1.6.2AR)",
  confirm: "To be confirmed by the handler",
};

const now = () => new Date().toISOString();

function storageKey(id: string) {
  return `casepack:${id}`;
}

function readSaved(id: string): Saved | null {
  try {
    const raw = window.localStorage.getItem(storageKey(id));
    return raw ? (JSON.parse(raw) as Saved) : null;
  } catch {
    return null;
  }
}

/** Shows placeholder tokens such as [CUSTOMER] as highlighted chips. */
function Redacted({ text }: { text: string }) {
  const parts = text.split(/(\[[A-Z][A-Z_]*(?:_\d+)?\])/g);
  return (
    <>
      {parts.map((p, i) =>
        /^\[[A-Z][A-Z_]*(?:_\d+)?\]$/.test(p) ? (
          <span key={i} className="ph">
            {p}
          </span>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}

export default function Workspace({
  caseFile,
  initialRun,
  liveAvailable,
  labels,
}: {
  caseFile: CaseFile;
  initialRun: CasePackRun;
  liveAvailable: boolean;
  labels: Labels;
}) {
  const [run, setRun] = useState<CasePackRun>(initialRun);
  const [source, setSource] = useState<"saved" | "live">("saved");
  const [note, setNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [docView, setDocView] = useState<"original" | "redacted">("redacted");
  const [showReal, setShowReal] = useState(true);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [clockChoice, setClockChoice] = useState<Clock | null>(null);
  const [stage, setStage] = useState<Stage>("review");
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [clicks, setClicks] = useState(0);
  const [returnReason, setReturnReason] = useState<string | undefined>();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [canAct, setCanAct] = useState<"yes" | "no" | null>(null);
  const [sendBackReason, setSendBackReason] = useState("");

  const pack = run.pack;
  const team = labels.teams[pack.intake.suggested_team];

  // Restore saved review state for this case, or start a fresh audit trail.
  useEffect(() => {
    const s = readSaved(caseFile.id);
    if (s) {
      setDecisions(s.decisions);
      setClockChoice(s.clockChoice);
      setStage(s.stage);
      setAudit(s.audit);
      setClicks(s.clicks);
      setReturnReason(s.returnReason);
    } else {
      setAudit([
        { at: now(), actor: "System", action: `Case pack loaded (saved run of ${modelName(initialRun.model)}, prompt ${initialRun.promptVersion}, created ${initialRun.createdAt.slice(0, 10)}).` },
        { at: now(), actor: "System", action: `${initialRun.redacted.replacements.length} personal details replaced before the AI call.` },
      ]);
    }
  }, [caseFile.id, initialRun]);

  useEffect(() => {
    try {
      const s: Saved = { decisions, clockChoice, stage, audit, clicks, returnReason };
      window.localStorage.setItem(storageKey(caseFile.id), JSON.stringify(s));
    } catch {
      /* storage unavailable: the review still works for this visit */
    }
  }, [caseFile.id, decisions, clockChoice, stage, audit, clicks, returnReason]);

  const log = (actor: AuditEntry["actor"], action: string) => setAudit((a) => [...a, { at: now(), actor, action }]);
  const click = () => setClicks((c) => c + 1);
  const show = (text: string) => (showReal ? restore(text, run.redacted.replacements) : text);

  const checks = useMemo(() => new Map(run.checks.statements.map((s) => [s.path, s])), [run]);
  const unsupported = run.checks.statements.filter((s) => !s.supported);
  const undecidedRed = unsupported.filter((s) => !decisions[s.path] || decisions[s.path].status === "accepted");
  const supported = run.checks.statements.filter((s) => s.supported);
  const undecidedGreen = supported.filter((s) => !decisions[s.path]);

  const clock: Clock = run.clock === "confirm" ? clockChoice ?? "confirm" : run.clock;
  const deadlines = computeDeadlines(run.redacted.received, clock, DEMO_TODAY);
  const needsClock = run.clock === "confirm" && !clockChoice;
  const canSignOff = stage !== "with_specialist" && stage !== "accepted_by_specialist" && stage !== "signed_off" && undecidedRed.length === 0 && undecidedGreen.length === 0 && !needsClock;

  async function runLive() {
    setLoading(true);
    setNote(null);
    log("Handler", "Requested a live AI run.");
    try {
      const res = await fetch("/api/casepack", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ caseId: caseFile.id, mode: "live" }) });
      const data = await res.json();
      if (!res.ok || !data.run) throw new Error(data.error ?? "Request failed");
      setRun(data.run);
      setSource(data.source);
      setNote(data.note ?? null);
      setDecisions({});
      setClockChoice(null);
      setStage("review");
      log("System", data.source === "live"
        ? `Live case pack from ${data.run.model} in ${(data.run.usage.latencyMs / 1000).toFixed(0)}s, cost $${data.run.usage.costUsd.toFixed(4)}. ${data.run.checks.unsupportedCount} unsupported statement(s).`
        : `Live run unavailable. Showing saved run.`);
    } catch {
      setNote("The live run could not be reached. The saved result is still shown.");
      log("System", "Live run failed. Saved result kept.");
    } finally {
      setLoading(false);
    }
  }

  function decide(path: string, d: Decision, description: string) {
    setDecisions((x) => ({ ...x, [path]: d }));
    click();
    log("Handler", description);
  }

  function acceptAllVerified() {
    const next = { ...decisions };
    for (const s of undecidedGreen) next[s.path] = { status: "accepted" };
    setDecisions(next);
    click();
    log("Handler", `Accepted ${undecidedGreen.length} statements whose sources were verified.`);
  }

  function signOff() {
    click();
    if (team.handover) {
      setStage("with_specialist");
      log("Handler", `Signed off the case pack and handed it to ${team.label}.`);
    } else {
      setStage("signed_off");
      log("Handler", "Signed off the case pack. Frontline handler continues the complaint.");
    }
  }

  function specialistDecision() {
    if (canAct === "yes") {
      setStage("accepted_by_specialist");
      log("Specialist", `${team.label} accepted the handover: able to act without contacting anyone.`);
    } else if (canAct === "no" && sendBackReason) {
      const reason = labels.sendBack.find((r) => r.id === sendBackReason)?.label ?? sendBackReason;
      setReturnReason(reason);
      setStage("returned");
      log("Specialist", `${team.label} sent the case back: ${reason}.`);
    }
  }

  function reset() {
    try {
      window.localStorage.removeItem(storageKey(caseFile.id));
    } catch {
      /* ignore */
    }
    setRun(initialRun);
    setSource("saved");
    setNote(null);
    setDecisions({});
    setClockChoice(null);
    setStage("review");
    setClicks(0);
    setReturnReason(undefined);
    setCanAct(null);
    setSendBackReason("");
    setAudit([{ at: now(), actor: "System", action: "Review reset." }]);
  }

  function exportAudit() {
    const record = {
      caseId: caseFile.id,
      model: run.model,
      promptVersion: run.promptVersion,
      source,
      redactions: run.redacted.replacements.map((r) => ({ placeholder: r.placeholder, layer: r.layer, documentId: r.documentId })),
      aiStatements: run.checks.statements.map((s) => ({ path: s.path, text: s.text, supported: s.supported })),
      handlerDecisions: decisions,
      clock,
      stage,
      clicks,
      audit,
    };
    const blob = new Blob([JSON.stringify(record, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${caseFile.id}-audit.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  /** One AI statement with its verification result and review controls. */
  // A plain function, not a component, so the edit box keeps focus while typing.
  function renderStatement(path: string, children?: React.ReactNode, key?: React.Key) {
    const s = checks.get(path) as StatementCheck | undefined;
    if (!s) return null;
    const d = decisions[path];
    const locked = stage !== "review" && stage !== "returned";
    const text = d?.status === "edited" && d.text ? d.text : s.text;
    return (
      <div key={key ?? path} className={`${styles.statement} ${!s.supported ? styles.red : ""} ${d?.status === "rejected" ? styles.rejected : ""}`}>
        <div className={styles.statementText}>
          {children ?? show(text)}
          {d?.status === "edited" && <span className="tag tag-blue">Edited by handler</span>}
        </div>
        <div className={styles.statementMeta}>
          {s.supported ? <span className={styles.tick}>✓ verified</span> : <span className="tag tag-red">Quote not found in source</span>}
          {d?.status === "accepted" && <span className="small muted">Accepted</span>}
          {d?.status === "rejected" && <span className="small muted">Rejected</span>}
          <details className={styles.sources}>
            <summary>Sources ({s.citations.length})</summary>
            <ul>
              {s.citations.map((c, i) => (
                <li key={i}>
                  <strong>{c.source}</strong>
                  {labels.policy[c.source] ? ` ${labels.policy[c.source].heading}` : ""}:{" "}
                  <q>{show(c.quote)}</q>{" "}
                  {c.result === "verified" ? <span className="small" style={{ color: "var(--green)" }}>found</span> : <span className="small" style={{ color: "var(--red)" }}>{c.result.replaceAll("_", " ")}</span>}
                </li>
              ))}
              {s.citations.length === 0 && <li>No source given.</li>}
            </ul>
          </details>
          {!locked && editing !== path && (
            <span className={styles.actions}>
              {!s.supported && d?.status !== "rejected" && (
                <button className="link-button small" onClick={() => decide(path, { status: "rejected" }, `Rejected unsupported statement (${path}).`)}>
                  Reject
                </button>
              )}
              {s.supported && d?.status !== "rejected" && (
                <button className="link-button small" onClick={() => decide(path, { status: "rejected" }, `Rejected statement (${path}).`)}>
                  Reject
                </button>
              )}
              <button className="link-button small" onClick={() => { setEditing(path); setDraft(show(text)); }}>
                Edit
              </button>
              {d && (
                <button className="link-button small" onClick={() => { setDecisions((x) => { const n = { ...x }; delete n[path]; return n; }); click(); }}>
                  Undo
                </button>
              )}
            </span>
          )}
        </div>
        {editing === path && (
          <div className={styles.editor}>
            <label className="visually-hidden" htmlFor={`edit-${path}`}>Edit statement</label>
            <textarea id={`edit-${path}`} value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} />
            <div className={styles.editorButtons}>
              <button className="btn btn-small" onClick={() => { decide(path, { status: "edited", text: draft }, `Edited statement (${path}).`); setEditing(null); }}>
                Save edit
              </button>
              <button className="btn btn-secondary btn-small" onClick={() => setEditing(null)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  const checklistIds = (labels.teamChecklists[pack.intake.suggested_team] ?? []).filter(
    (id) => !(pack.intake.suggested_team === "frontline" && id === "customer_told_of_handover"),
  );
  const checklistById = new Map(pack.handover_checklist.map((x) => [x.item_id, x]));

  return (
    <div>
      <div className={styles.titleRow}>
        <div>
          <h1>
            {caseFile.record.customer.title ? `${caseFile.record.customer.title} ` : ""}
            {caseFile.record.customer.name}
          </h1>
          <p className="muted">
            {caseFile.id} · received by {CHANNEL[caseFile.channel]} on {formatDate(caseFile.received, true)} ·{" "}
            {pack.intake.issues.map((i) => labels.causes[i.cause]).join("; ") || "issue not yet clear"}
          </p>
        </div>
        <div className={styles.modeBox}>
          <div className="small">
            {source === "live" ? (
              <span className="tag tag-green">Live run</span>
            ) : (
              <span className="tag">Saved run</span>
            )}{" "}
            {modelName(run.model)} · prompt {run.promptVersion.replace("casepack-", "")} · {formatDate(run.createdAt.slice(0, 10))}
          </div>
          <div className={styles.modeButtons}>
            <button className="btn btn-secondary btn-small" onClick={runLive} disabled={loading || !liveAvailable}>
              {loading ? "Running live, about 45 seconds…" : "Run live AI on this case"}
            </button>
            <button className="link-button small" onClick={reset}>Reset review</button>
          </div>
          {!liveAvailable && <div className="small muted">Live mode is switched off. Saved results are from real earlier runs.</div>}
        </div>
      </div>
      {note && <div className={styles.note} role="status">{note}</div>}

      {stage === "returned" && returnReason && (
        <div className={styles.returned} role="alert">
          <strong>Sent back by {team.label}:</strong> {returnReason}. Fix the gap, then sign off again.
        </div>
      )}

      <div className={styles.grid}>
        {/* Left: source documents */}
        <section className={styles.col} aria-labelledby="docs-h">
          <h2 id="docs-h">Case documents</h2>
          <div className={styles.toggle} role="group" aria-label="Document view">
            <button aria-pressed={docView === "redacted"} onClick={() => setDocView("redacted")}>What the AI saw</button>
            <button aria-pressed={docView === "original"} onClick={() => setDocView("original")}>As received</button>
          </div>
          <p className="small muted">
            {docView === "redacted"
              ? `${run.redacted.replacements.length} personal details were replaced before anything was sent to the AI. Dates and amounts are kept because deadlines and facts depend on them.`
              : "The documents as the bank holds them. Only the handler sees this view."}
          </p>
          {(docView === "redacted" ? run.redacted.documents : caseFile.documents).map((d) => (
            <article key={d.id} className={styles.doc}>
              <header className={styles.docHead}>
                <strong>{d.id}</strong> {d.system} · {d.type.replaceAll("_", " ")} · {formatDate(d.date)}
              </header>
              <div className={styles.docText}>{docView === "redacted" ? <Redacted text={d.text} /> : d.text}</div>
            </article>
          ))}
        </section>

        {/* Middle: the case pack */}
        <section className={styles.col} aria-labelledby="pack-h">
          <div className={styles.packHead}>
            <h2 id="pack-h">Case pack</h2>
            <label className="small">
              <input type="checkbox" checked={showReal} onChange={(e) => setShowReal(e.target.checked)} /> Show real names
            </label>
          </div>
          <div className={styles.reviewBar}>
            <div className="small">
              <strong>{supported.length}</strong> statements with verified sources, <strong className={unsupported.length ? styles.redText : ""}>{unsupported.length}</strong> unsupported.
              {run.checks.inventedPlaceholders.length > 0 && <> Invented placeholders: {run.checks.inventedPlaceholders.join(", ")}.</>}
            </div>
            {(stage === "review" || stage === "returned") && (
              <button className="btn btn-small" onClick={acceptAllVerified} disabled={undecidedGreen.length === 0}>
                Accept all {undecidedGreen.length} verified
              </button>
            )}
          </div>
          <p className="small muted">
            A verified source proves the quoted words exist. It does not prove they support the statement, which is why you review it. Unsupported statements are red and must be rejected or edited before sign-off.
          </p>

          {!pack.enough_information.sufficient && (
            <div className={styles.insufficient}>
              <strong>Not enough information to build a reliable pack.</strong> {show(pack.enough_information.what_is_needed)}
            </div>
          )}

          {pack.flags.length > 0 && (
            <>
              <h3>Flags</h3>
              {pack.flags.map((f, i) => (
                renderStatement(`flags.${i}`, <>
                  <span className={`tag ${f.type === "instruction_in_customer_text" ? "tag-red" : "tag-amber"}`}>{f.type.replaceAll("_", " ")}</span> {show(f.description)}
                </>, i)
              ))}
            </>
          )}

          <h3>Summary</h3>
          {pack.summary.map((_, i) => renderStatement(`summary.${i}`, undefined, i))}

          <h3>What the customer wants</h3>
          {renderStatement("outcome_sought")}

          <details className={styles.fold}>
            <summary><h3>Routing: {team.label}</h3></summary>
          {pack.intake.issues.map((iss, i) => (
            renderStatement(`intake.issues.${i}`, <>
              <strong>{labels.products[iss.product]}: {labels.causes[iss.cause]}.</strong> {show(iss.description)}
            </>, i)
          ))}
          {renderStatement("intake.team_reason", <>
            <strong>Suggested team: {team.label}.</strong> {show(pack.intake.team_reason.text)}
          </>)}
          {renderStatement("intake.payment_services_reason", <>
            <strong>Payment services rules: {pack.intake.payment_services}.</strong> {show(pack.intake.payment_services_reason.text)}
          </>)}
          </details>

          <h3>Vulnerability</h3>
          {pack.vulnerability.length === 0 && <p className="small muted">No signs found. Check the documents yourself before relying on this.</p>}
          {pack.vulnerability.map((_, i) => renderStatement(`vulnerability.${i}`, undefined, i))}

          <details className={styles.fold}>
            <summary><h3>Timeline ({pack.timeline.length} events)</h3></summary>
          {pack.timeline.map((t, i) => (
            renderStatement(`timeline.${i}`, <>
              <strong>{formatDate(t.date)}</strong> {show(t.event)}
            </>, i)
          ))}

          </details>

          {pack.conflicts.length > 0 && (
            <>
              <h3>Records that disagree</h3>
              {pack.conflicts.map((_, i) => renderStatement(`conflicts.${i}`, undefined, i))}
            </>
          )}

          <details className={styles.fold}>
            <summary><h3>Relevant policy ({pack.relevant_policy.length} paragraphs)</h3></summary>
          {pack.relevant_policy.map((rp, i) => (
            renderStatement(`relevant_policy.${i}`, <>
              <strong>{rp.policy_id} {labels.policy[rp.policy_id]?.heading}.</strong> {show(rp.why_relevant)}
            </>, i)
          ))}
          </details>
        </section>

        {/* Right: deadlines, checklist, sign-off, audit */}
        <aside className={styles.col} aria-label="Deadlines, handover and audit">
          <section className={styles.panel}>
            <h2>Deadlines</h2>
            <p className="small muted">Calculated by code, not the AI.</p>
            <dl className={styles.dl}>
              <dt>Rule</dt>
              <dd>{CLOCK_LABEL[clock]}</dd>
              <dt>Final response due</dt>
              <dd>
                <strong>{formatDate(deadlines.workingDue, true)}</strong>{" "}
                <span className={`tag ${deadlines.status === "overdue" ? "tag-red" : deadlines.status === "due_soon" ? "tag-amber" : "tag-green"}`}>
                  {deadlineTag(deadlines.status, deadlines.businessDaysLeft, deadlines.calendarDaysLeft)}
                </span>
              </dd>
              <dt>Summary resolution (3 business days)</dt>
              <dd>
                {deadlines.summaryResolutionWindowCloses < DEMO_TODAY
                  ? `Window closed ${formatDate(deadlines.summaryResolutionWindowCloses, true)}`
                  : `Close of ${formatDate(deadlines.summaryResolutionWindowCloses, true)}`}
              </dd>
              {deadlines.psrExceptionalDue && (
                <>
                  <dt>Exceptional extension (holding reply needed)</dt>
                  <dd>{formatDate(deadlines.psrExceptionalDue, true)}</dd>
                </>
              )}
              <dt>8-week date</dt>
              <dd>{formatDate(deadlines.eightWeekDue, true)}</dd>
            </dl>
            {run.clock === "confirm" && (
              <fieldset className={styles.clockChoice}>
                <legend className="small"><strong>Confirm the time limit (CP-3.3).</strong> Until you do, the shorter one applies.</legend>
                {(["15_business_days", "8_weeks"] as Clock[]).map((c) => (
                  <label key={c} className="small">
                    <input type="radio" name="clock" checked={clockChoice === c} onChange={() => { setClockChoice(c); click(); log("Handler", `Confirmed deadline rule: ${CLOCK_LABEL[c]}.`); }} disabled={stage === "with_specialist" || stage === "accepted_by_specialist"} />{" "}
                    {CLOCK_LABEL[c]}
                  </label>
                ))}
              </fieldset>
            )}
          </section>

          <section className={styles.panel}>
            <h2>Handover checklist</h2>
            <p className="small muted">
              {team.handover ? `For ${team.label}.` : "Frontline case, no specialist handover."} {run.checks.checklist.present} of {run.checks.checklist.required} items present.
            </p>
            <ul className={styles.checklist}>
              {checklistIds.map((id) => {
                const item = checklistById.get(id);
                const status = item?.status ?? "missing";
                return (
                  <li key={id} className={styles[`check_${status}`]}>
                    <span className={styles.checkIcon} aria-hidden="true">{status === "present" ? "✓" : status === "not_applicable" ? "–" : "!"}</span>
                    <span>
                      <span className="small">{labels.checklist[id]}</span>
                      <span className="visually-hidden">: {status.replaceAll("_", " ")}</span>
                      {item?.value && <span className={`small muted ${styles.checkValue}`}>{show(item.value)}</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className={styles.panel}>
            <h2>Sign-off</h2>
            {(stage === "review" || stage === "returned") && (
              <>
                <ul className="small">
                  <li>{undecidedRed.length === 0 ? "✓" : "•"} Unsupported statements rejected or edited ({unsupported.length - undecidedRed.length}/{unsupported.length})</li>
                  <li>{undecidedGreen.length === 0 ? "✓" : "•"} Verified statements reviewed</li>
                  {run.clock === "confirm" && <li>{needsClock ? "•" : "✓"} Deadline rule confirmed</li>}
                </ul>
                <button className="btn" disabled={!canSignOff} onClick={signOff}>
                  {team.handover ? `Sign off and hand to ${team.label}` : "Sign off case pack"}
                </button>
                <p className="small muted">You decide the outcome and write the response. The case pack does neither.</p>
              </>
            )}
            {stage === "signed_off" && <p className="small"><span className="tag tag-green">Signed off</span> The frontline handler continues the complaint.</p>}
            {stage === "with_specialist" && (
              <div className={styles.specialist}>
                <p className="small"><span className="tag tag-blue">With {team.label}</span></p>
                <p className="small"><strong>Specialist view.</strong> {run.checks.checklist.present} of {run.checks.checklist.required} checklist items present{run.checks.checklist.missing.length ? `, missing: ${run.checks.checklist.missing.map((m) => labels.checklist[m]).join("; ")}` : ""}.</p>
                <fieldset>
                  <legend className="small"><strong>Could you act on this without contacting anyone?</strong></legend>
                  <label className="small"><input type="radio" name="canact" checked={canAct === "yes"} onChange={() => setCanAct("yes")} /> Yes, accept the handover</label>
                  <label className="small"><input type="radio" name="canact" checked={canAct === "no"} onChange={() => setCanAct("no")} /> No, send it back</label>
                </fieldset>
                {canAct === "no" && (
                  <label className="small">
                    Reason
                    <select value={sendBackReason} onChange={(e) => setSendBackReason(e.target.value)}>
                      <option value="">Choose a reason</option>
                      {labels.sendBack.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                    </select>
                  </label>
                )}
                <button className="btn btn-small" disabled={!canAct || (canAct === "no" && !sendBackReason)} onClick={specialistDecision}>
                  Confirm
                </button>
                <p className="small muted">Send-backs measure the process, never an individual handler.</p>
              </div>
            )}
            {stage === "accepted_by_specialist" && <p className="small"><span className="tag tag-green">Accepted by {team.label}</span></p>}
            <p className="small muted">{clicks} review clicks on this case.</p>
          </section>

          <section className={styles.panel}>
            <div className={styles.packHead}>
              <h2>Audit trail</h2>
              <button className="link-button small" onClick={exportAudit}>Export JSON</button>
            </div>
            <ol className={styles.audit}>
              {audit.map((a, i) => (
                <li key={i} className="small">
                  <span className="muted">{a.at.slice(11, 19)} {a.actor}.</span> {a.action}
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </div>
  );
}

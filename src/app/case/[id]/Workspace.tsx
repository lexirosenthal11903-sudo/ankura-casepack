"use client";
import type React from "react";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import type { CasePackRun } from "@/lib/casepack";
import { computeDeadlines, type Clock } from "@/lib/deadlines";
import { DEMO_TODAY } from "@/lib/demo";
import { deadlineTag, formatDate, modelName } from "@/lib/format";
import { restore } from "@/lib/redact";
import { refundDutyApplies } from "@/lib/rules";
import type { CaseFile } from "@/lib/types";
import Link from "next/link";
import { clearState, now, readState, writeState, type AuditEntry, type Decision, type GapFix, type ReviewState, type Stage } from "./state";
import styles from "./workspace.module.css";
import Tour from "./Tour";

type Labels = {
  teams: Record<string, { label: string; handover: boolean }>;
  causes: Record<string, string>;
  products: Record<string, string>;
  checklist: Record<string, string>;
  teamChecklists: Record<string, string[]>;
  sendBack: { id: string; label: string }[];
  policy: Record<string, { heading: string; text: string }>;
};

export interface CaseHeading {
  title: string;
  complainant: string | null;
}

export interface CaseNav {
  prev: { id: string; name: string } | null;
  next: { id: string; name: string } | null;
  position: number;
  total: number;
}

const CHANNEL: Record<string, string> = { phone: "phone", email: "email", web_form: "web form", branch: "branch", letter: "letter", social: "social media" };
const SYSTEM: Record<string, string> = { CRM: "Case notes", CORE: "Core banking record", CARDS: "Card records", EMAIL: "Email", LETTER: "Letter", WEBFORM: "Web form", BRANCH: "Branch note" };
const CLOCK_LABEL: Record<Clock, string> = {
  "8_weeks": "8 weeks (standard FCA complaint rule)",
  "15_business_days": "15 business days (payment services rule)",
  confirm: "Not yet confirmed",
};
const STAGE_LABEL: Record<Stage, string> = {
  review: "With handler for review",
  signed_off: "Signed off by handler",
  with_specialist: "With specialist team",
  returned: "Sent back to handler",
  accepted_by_specialist: "Accepted by specialist team",
};

/** Shows placeholder tokens such as [CUSTOMER] as highlighted chips. */
function Redacted({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\[[A-Z][A-Z_]*(?:_\d+)?\])/g).map((p, i) =>
        /^\[[A-Z][A-Z_]*(?:_\d+)?\]$/.test(p) ? <span key={i} className="ph">{p}</span> : <Fragment key={i}>{p}</Fragment>,
      )}
    </>
  );
}

const ALL_SECTIONS = [
  { prefixes: ["flags"] }, { prefixes: ["summary"] }, { prefixes: ["outcome_sought"] }, { prefixes: ["vulnerability"] }, { prefixes: ["conflicts"] },
  { prefixes: ["intake"] }, { prefixes: ["timeline"] }, { prefixes: ["relevant_policy"] },
];

export default function Workspace({
  caseFile,
  heading,
  nav,
  initialRun,
  liveAvailable,
  labels,
}: {
  caseFile: CaseFile;
  heading: CaseHeading;
  nav: CaseNav;
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
  const [gapFixes, setGapFixes] = useState<Record<string, GapFix>>({});
  const [clockChoice, setClockChoice] = useState<Clock | null>(null);
  const [stage, setStage] = useState<Stage>("review");
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [clicks, setClicks] = useState(0);
  const [returnReason, setReturnReason] = useState<string | undefined>();
  const [changesSinceReturn, setChangesSinceReturn] = useState(0);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [gapEditing, setGapEditing] = useState<{ id: string; status: GapFix["status"] } | null>(null);
  const [gapDraft, setGapDraft] = useState("");
  const signOffRef = useRef<HTMLHeadingElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const focusAfter = useRef<"signoff" | "status" | string | null>(null);

  const pack = run.pack;
  const team = labels.teams[pack.intake.suggested_team];
  const editable = stage === "review" || stage === "returned";

  useEffect(() => {
    const s = readState(caseFile.id);
    if (s) {
      setDecisions(s.decisions ?? {});
      setGapFixes(s.gapFixes ?? {});
      setClockChoice(s.clockChoice);
      setStage(s.stage);
      setAudit(s.audit);
      setClicks(s.clicks);
      setReturnReason(s.returnReason);
      setChangesSinceReturn(s.changesSinceReturn ?? 0);
    } else {
      setAudit([
        { at: now(), actor: "System", action: `Case pack loaded (saved run of ${modelName(initialRun.model)}, prompt ${initialRun.promptVersion}, created ${initialRun.createdAt.slice(0, 10)}).` },
        { at: now(), actor: "System", action: `${initialRun.redacted.replacements.length} personal details replaced before the AI call.` },
      ]);
    }
  }, [caseFile.id, initialRun]);

  useEffect(() => {
    const s: ReviewState = { decisions, gapFixes, clockChoice, stage, audit, clicks, returnReason, changesSinceReturn };
    writeState(caseFile.id, s);
  }, [caseFile.id, decisions, gapFixes, clockChoice, stage, audit, clicks, returnReason, changesSinceReturn]);

  // Keep keyboard focus somewhere sensible after an action removes or disables the focused control.
  useEffect(() => {
    const target = focusAfter.current;
    if (!target) return;
    focusAfter.current = null;
    if (target === "signoff") signOffRef.current?.focus();
    else if (target === "status") statusRef.current?.focus();
    else document.getElementById(target)?.focus();
  });

  const log = (actor: AuditEntry["actor"], action: string) => setAudit((a) => [...a, { at: now(), actor, action }]);
  const click = () => setClicks((c) => c + 1);
  const changed = () => { if (stage === "returned") setChangesSinceReturn((n) => n + 1); };
  const show = (text: string) => (showReal ? restore(text, run.redacted.replacements, run.redacted.display) : text);

  // Checklist statements are reviewed in the checklist panel, not in the case pack list.
  const reviewable = useMemo(() => run.checks.statements.filter((s) => !s.path.startsWith("handover_checklist")), [run]);
  const checks = useMemo(() => new Map(run.checks.statements.map((s) => [s.path, s])), [run]);
  const unsupported = reviewable.filter((s) => !s.supported);
  const undecidedRed = unsupported.filter((s) => !decisions[s.path] || decisions[s.path].status === "accepted");
  const supported = reviewable.filter((s) => s.supported);
  const undecidedGreen = supported.filter((s) => !decisions[s.path]);

  const clock: Clock = run.clock === "confirm" ? clockChoice ?? "confirm" : run.clock;
  const deadlines = computeDeadlines(run.redacted.received, clock, DEMO_TODAY, { refundDuty: refundDutyApplies(pack) });
  const needsClock = run.clock === "confirm" && !clockChoice;

  const checklistIds = (labels.teamChecklists[pack.intake.suggested_team] ?? []).filter(
    (id) => !(pack.intake.suggested_team === "frontline" && id === "customer_told_of_handover"),
  );
  const checklistById = new Map(pack.handover_checklist.map((x) => [x.item_id, x]));
  const statusOf = (id: string) => checklistById.get(id)?.status ?? "missing";
  const gaps = checklistIds.filter((id) => statusOf(id) === "missing" || statusOf(id) === "conflicting");
  const openGaps = team.handover ? gaps.filter((id) => !gapFixes[id]) : [];
  const presentCount = checklistIds.filter((id) => statusOf(id) === "present" || gapFixes[id]?.status === "added").length;
  const requiredCount = checklistIds.filter((id) => statusOf(id) !== "not_applicable").length;

  const tasks = [
    { label: `Unsupported statements rejected or edited (${unsupported.length - undecidedRed.length} of ${unsupported.length})`, done: undecidedRed.length === 0 },
    { label: "Verified statements reviewed", done: undecidedGreen.length === 0 },
    ...(run.clock === "confirm" ? [{ label: "Deadline rule confirmed", done: !needsClock }] : []),
    ...(team.handover ? [{ label: `Handover gaps filled or explained (${gaps.length - openGaps.length} of ${gaps.length})`, done: openGaps.length === 0 }] : []),
    ...(stage === "returned" ? [{ label: "Something changed since the case was sent back", done: changesSinceReturn > 0 }] : []),
  ];
  const canSignOff = editable && tasks.every((t) => t.done);

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
      setGapFixes({});
      setClockChoice(null);
      setStage("review");
      log("System", data.source === "live"
        ? `Live case pack from ${modelName(data.run.model)} in ${(data.run.usage.latencyMs / 1000).toFixed(0)}s, cost $${data.run.usage.costUsd.toFixed(4)}. ${data.run.checks.unsupportedCount} unsupported statement(s).`
        : "Live run unavailable. Showing saved run.");
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
    changed();
    log("Handler", description);
  }

  // Accepting is by section, not one click for the whole pack. The handler has to be looking at a section to accept it,
  // which is the smallest honest unit of review. Each section's button says how many verified statements it accepts.
  const inSection = (prefixes: string[]) => undecidedGreen.filter((s) => prefixes.some((p) => s.path === p || s.path.startsWith(p + ".")));
  function acceptSection(prefixes: string[], label: string) {
    const items = inSection(prefixes);
    if (!items.length) return;
    const next = { ...decisions };
    for (const s of items) next[s.path] = { status: "accepted" };
    setDecisions(next);
    click();
    changed();
    log("Handler", `Accepted ${items.length} verified ${items.length === 1 ? "statement" : "statements"} in ${label}.`);
    if (inSection(ALL_SECTIONS.flatMap((x) => x.prefixes)).length === items.length) focusAfter.current = "signoff";
  }
  const SectionHead = ({ title, prefixes, as = "h3" }: { title: React.ReactNode; prefixes: string[]; as?: "h3" | "span" }) => {
    const n = inSection(prefixes).length;
    const Tag = as;
    return (
      <div className={styles.sectionHead}>
        <Tag>{title}</Tag>
        {editable && n > 0 && (
          <button className="btn btn-small btn-secondary" data-tour="accept" onClick={() => acceptSection(prefixes, typeof title === "string" ? title.toLowerCase() : "this section")}>
            Accept {n} verified here
          </button>
        )}
      </div>
    );
  };

  function saveGap() {
    if (!gapEditing || !gapDraft.trim()) return;
    const { id, status } = gapEditing;
    setGapFixes((g) => ({ ...g, [id]: { status, text: gapDraft.trim() } }));
    click();
    changed();
    log("Handler", status === "added" ? `Added handover detail: ${labels.checklist[id]}.` : `Marked not available: ${labels.checklist[id]}. Reason: ${gapDraft.trim()}.`);
    setGapEditing(null);
    setGapDraft("");
    focusAfter.current = `gap-${id}`;
  }

  function signOff() {
    click();
    if (team.handover) {
      setStage("with_specialist");
      log("Handler", `${stage === "returned" ? "Signed off again" : "Signed off the case pack"} and handed it to ${team.label}.`);
    } else {
      setStage("signed_off");
      log("Handler", "Signed off the case pack. The frontline handler continues the complaint.");
    }
    focusAfter.current = "status";
  }

  function reset() {
    clearState(caseFile.id);
    setRun(initialRun);
    setSource("saved");
    setNote(null);
    setDecisions({});
    setGapFixes({});
    setClockChoice(null);
    setStage("review");
    setClicks(0);
    setReturnReason(undefined);
    setChangesSinceReturn(0);
    setEditing(null);
    setGapEditing(null);
    setAudit([{ at: now(), actor: "System", action: "Review reset." }]);
  }

  /** Prints only the audit record, which the browser's print window saves as a PDF. */
  function printAudit() {
    document.body.classList.add("print-audit");
    const done = () => document.body.classList.remove("print-audit");
    window.addEventListener("afterprint", done, { once: true });
    window.print();
    window.setTimeout(done, 2000);
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
      handoverGaps: gapFixes,
      clock,
      stage,
      clicks,
      audit,
      note: "Handler edits may contain real names, because handlers are authorised to see them.",
    };
    const blob = new Blob([JSON.stringify(record, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${caseFile.id}-audit.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  /** One AI statement with its verification result and review controls. A plain function so the edit box keeps focus. */
  function renderStatement(path: string, prefix?: React.ReactNode, key?: React.Key) {
    const s = checks.get(path);
    if (!s) return null;
    const d = decisions[path];
    const edited = d?.status === "edited" && d.text;
    return (
      <div key={key ?? path} id={`stmt-${path}`} data-tour="statement" tabIndex={-1} className={`${styles.statement} ${!s.supported ? styles.red : ""} ${d?.status === "rejected" ? styles.rejected : ""}`}>
        <div className={styles.statementText}>
          {edited ? (
            <>{d.text} <span className="tag tag-blue">Edited by handler</span></>
          ) : prefix ? (
            prefix
          ) : (
            show(s.text)
          )}
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
                  {labels.policy[c.source] ? ` ${labels.policy[c.source].heading}` : ""}: <q>{show(c.quote)}</q>{" "}
                  {c.result === "verified" ? <span className={styles.found}>found</span> : <span className={styles.notFound}>{c.result.replaceAll("_", " ")}</span>}
                </li>
              ))}
              {s.citations.length === 0 && <li>No source given.</li>}
            </ul>
          </details>
          {editable && editing !== path && (
            <span className={styles.actions}>
              {d?.status !== "rejected" && (
                <button className="link-button small" onClick={() => decide(path, { status: "rejected" }, `Rejected statement (${path}).`)}>Reject</button>
              )}
              <button className="link-button small" onClick={() => { setEditing(path); setDraft(edited ? d.text! : show(s.text)); }}>Edit</button>
              {d && (
                <button className="link-button small" onClick={() => {
                  setDecisions((x) => { const n = { ...x }; delete n[path]; return n; });
                  click();
                  log("Handler", `Undid decision on ${path}.`);
                }}>Undo</button>
              )}
            </span>
          )}
        </div>
        {editing === path && (
          <div className={styles.editor}>
            <label className="visually-hidden" htmlFor={`edit-${path}`}>Edit statement</label>
            <textarea id={`edit-${path}`} value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} autoFocus />
            <div className={styles.editorButtons}>
              <button className="btn btn-small" disabled={!draft.trim()} onClick={() => {
                decide(path, { status: "edited", text: draft.trim() }, `Edited statement (${path}).`);
                setEditing(null);
                focusAfter.current = `stmt-${path}`;
              }}>Save edit</button>
              <button className="btn btn-secondary btn-small" onClick={() => { setEditing(null); focusAfter.current = `stmt-${path}`; }}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <nav className={styles.caseNav} aria-label="Complaints">
        <Link href="/queue">All complaints</Link>
        <span className="small muted">Complaint {nav.position} of {nav.total}, most urgent first</span>
        <span className={styles.prevNext}>
          {nav.prev && <Link href={`/case/${nav.prev.id}`} rel="prev">Previous: {nav.prev.name}</Link>}
          {nav.next && <Link href={`/case/${nav.next.id}`} rel="next">Next: {nav.next.name}</Link>}
        </span>
      </nav>
      <p className={styles.role}>
        <strong>You are the complaints handler.</strong> The AI has prepared this case pack. Check it, fill any gaps, then sign it off
        {team.handover ? ` and hand it to ${team.label}` : ""}. You make every decision.
      </p>
      <div className={styles.titleRow}>
        <div>
          <h1>{heading.title}</h1>
          {heading.complainant && <p className={styles.complainant}>Complaint from {heading.complainant}</p>}
          <p className="muted">
            {caseFile.id} · received by {CHANNEL[caseFile.channel]} on {formatDate(caseFile.received, true)} ·{" "}
            {pack.intake.issues.map((i) => labels.causes[i.cause]).join("; ") || "issue not yet clear"}
          </p>
        </div>
        <div className={styles.modeBox}>
          <div className="small">
            {source === "live" ? <span className="tag tag-green">Live run</span> : <span className="tag">Saved run</span>} {modelName(run.model)} · prompt{" "}
            {run.promptVersion.replace("casepack-", "")} · {formatDate(run.createdAt.slice(0, 10))}
          </div>
          <div className={styles.modeButtons}>
            {liveAvailable && (
              <button className="btn btn-secondary btn-small" onClick={runLive} disabled={loading}>
                {loading ? "Running live, about 45 seconds…" : "Run live AI on this case"}
              </button>
            )}
            <button className="link-button small" onClick={reset}>Reset review</button>
          </div>
          {!liveAvailable && <div className="small muted">Saved result from a real earlier AI run.</div>}
        </div>
      </div>

      <dl className={styles.summaryBar}>
        <div>
          <dt>Final response due</dt>
          <dd>
            {formatDate(deadlines.workingDue, true)}{" "}
            <span className={`tag ${deadlines.calendarDaysLeft < 0 ? "tag-red" : deadlines.status === "due_soon" ? "tag-amber" : ""}`}>
              {deadlineTag(deadlines.calendarDaysLeft < 0 ? "overdue" : "on_track", deadlines.businessDaysLeft, deadlines.calendarDaysLeft)}
            </span>
            {needsClock && <span className={styles.barNote}>Shorter rule used until you confirm</span>}
          </dd>
        </div>
        {deadlines.refundDue && (
          <div>
            <dt>Refund decision due</dt>
            <dd>
              {formatDate(deadlines.refundDue, true)}{" "}
              {deadlines.refundOverdue ? <span className="tag tag-red">Passed</span> : <span className="tag tag-amber">Next business day</span>}
              <span className={styles.barNote}>Unauthorised payment (policy CP-7.1)</span>
            </dd>
          </div>
        )}
        <div>
          <dt>Team</dt>
          <dd>{team.label}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{STAGE_LABEL[stage]}</dd>
        </div>
      </dl>

      {note && <div className={styles.note} role="status">{note}</div>}
      <div ref={statusRef} tabIndex={-1} className={styles.statusAnchor} role="status" aria-live="polite">
        {stage === "returned" && returnReason && (
          <div className={styles.returned}>
            <strong>Sent back by {team.label}:</strong> {returnReason}. Fill the gap in the handover checklist, then sign off again.
          </div>
        )}
        {stage === "with_specialist" && <span className="visually-hidden">Handed to {team.label}.</span>}
        {stage === "accepted_by_specialist" && <span className="visually-hidden">Accepted by {team.label}.</span>}
        {stage === "signed_off" && <span className="visually-hidden">Case pack signed off.</span>}
      </div>

      <div className={styles.grid}>
        <section className={styles.col} aria-labelledby="docs-h" data-tour="docs">
          <h2 id="docs-h">Case documents</h2>
          <div className={styles.toggle} role="group" aria-label="Document view">
            <button aria-pressed={docView === "redacted"} onClick={() => setDocView("redacted")} data-tour="ai-saw">What the AI saw</button>
            <button aria-pressed={docView === "original"} onClick={() => setDocView("original")} data-tour="as-received">As received</button>
          </div>
          <p className="small muted">
            {docView === "redacted"
              ? `${run.redacted.replacements.length} personal details were replaced before anything was sent to the AI. Dates and amounts are kept because deadlines and facts depend on them.`
              : "The documents as the bank holds them. Only the handler sees this view."}
          </p>
          {(docView === "redacted" ? run.redacted.documents : caseFile.documents).map((d) => (
            <article key={d.id} className={styles.doc}>
              <header className={styles.docHead}>
                <strong>{d.id}</strong> {SYSTEM[d.system] ?? d.system} · {formatDate(d.date)}
              </header>
              <div className={styles.docText}>{docView === "redacted" ? <Redacted text={d.text} /> : d.text}</div>
            </article>
          ))}
        </section>

        <section className={styles.col} aria-labelledby="pack-h">
          <div className={styles.packHead}>
            <h2 id="pack-h">Case pack</h2>
            <label className="small">
              <input type="checkbox" checked={showReal} onChange={(e) => setShowReal(e.target.checked)} /> Show real names in the case pack
            </label>
          </div>
          <div className={styles.reviewBar}>
            <div className="small">
              <strong>{supported.length}</strong> statements with verified sources, <strong className={unsupported.length ? styles.redText : ""}>{unsupported.length}</strong> unsupported.
              {run.checks.inventedPlaceholders.length > 0 && <> Invented placeholders: {run.checks.inventedPlaceholders.join(", ")}.</>}
            </div>
            {editable && <div className="small muted">{undecidedGreen.length} still to accept, section by section.</div>}
          </div>
          <p className="small muted">
            A verified source proves the quoted words exist, not that they support the statement. Read each one. Unsupported statements are red and must be rejected or edited before sign-off.
          </p>

          {!pack.enough_information.sufficient && (
            <div className={styles.insufficient}>
              <strong>Not enough information to build a reliable pack.</strong> {show(pack.enough_information.what_is_needed)}
            </div>
          )}

          {pack.flags.length > 0 && (
            <>
              <SectionHead title="Flags" prefixes={["flags"]} />
              {pack.flags.map((f, i) => renderStatement(`flags.${i}`, <>
                <span className={`tag ${f.type === "instruction_in_customer_text" ? "tag-red" : "tag-amber"}`}>{f.type.replaceAll("_", " ")}</span> {show(f.description)}
              </>, i))}
            </>
          )}

          <SectionHead title="Summary" prefixes={["summary"]} />
          {pack.summary.map((_, i) => renderStatement(`summary.${i}`, undefined, i))}

          <SectionHead title="What the customer wants" prefixes={["outcome_sought"]} />
          {renderStatement("outcome_sought")}

          <SectionHead title="Vulnerability" prefixes={["vulnerability"]} />
          {pack.vulnerability.length === 0 && <p className="small muted">No signs found. Check the documents yourself before relying on this.</p>}
          {pack.vulnerability.map((_, i) => renderStatement(`vulnerability.${i}`, undefined, i))}

          {pack.conflicts.length > 0 && (
            <>
              <SectionHead title="Records that disagree" prefixes={["conflicts"]} />
              {pack.conflicts.map((_, i) => renderStatement(`conflicts.${i}`, undefined, i))}
            </>
          )}

          <details className={styles.fold} open>
            <summary><h3>Routing: {team.label}</h3></summary>
            <SectionHead title="Routing" prefixes={["intake"]} as="span" />
            {pack.intake.issues.map((iss, i) => renderStatement(`intake.issues.${i}`, <>
              <strong>{labels.products[iss.product]}: {labels.causes[iss.cause]}.</strong> {show(iss.description)}
            </>, i))}
            {renderStatement("intake.team_reason", <><strong>Suggested team: {team.label}.</strong> {show(pack.intake.team_reason.text)}</>)}
            {renderStatement("intake.payment_services_reason", <>
              <strong>Payment services rule applies: {pack.intake.payment_services}.</strong> {show(pack.intake.payment_services_reason.text)}
            </>)}
          </details>

          <details className={styles.fold} open>
            <summary><h3>Timeline ({pack.timeline.length} events)</h3></summary>
            <SectionHead title="Timeline" prefixes={["timeline"]} as="span" />
            {pack.timeline.map((t, i) => renderStatement(`timeline.${i}`, <><strong>{formatDate(t.date)}</strong> {show(t.event)}</>, i))}
          </details>

          <details className={styles.fold} open>
            <summary><h3>Relevant policy ({pack.relevant_policy.length} paragraphs)</h3></summary>
            <SectionHead title="Relevant policy" prefixes={["relevant_policy"]} as="span" />
            {pack.relevant_policy.map((rp, i) => renderStatement(`relevant_policy.${i}`, <>
              <strong>{rp.policy_id} {labels.policy[rp.policy_id]?.heading}.</strong> {show(rp.why_relevant)}
            </>, i))}
          </details>
        </section>

        <aside className={styles.col} aria-label="Deadlines, handover and sign-off">
          <section className={styles.panel} data-tour="deadlines">
            <h2>Deadlines</h2>
            <p className="small muted">Worked out by code from the date received, not by the AI.</p>
            <dl className={styles.dl}>
              <dt>Rule</dt>
              <dd>{CLOCK_LABEL[clock]}</dd>
              <dt>Final response due</dt>
              <dd><strong>{formatDate(deadlines.workingDue, true)}</strong></dd>
              {deadlines.refundDue && (
                <>
                  <dt>Refund decision (unauthorised payment)</dt>
                  <dd className={deadlines.refundOverdue ? styles.redText : ""}>
                    {formatDate(deadlines.refundDue, true)}{deadlines.refundOverdue ? ", passed" : ""}
                  </dd>
                </>
              )}
              <dt>Quick resolution window (3 business days)</dt>
              <dd>
                {deadlines.summaryResolutionWindowCloses < DEMO_TODAY
                  ? `Closed ${formatDate(deadlines.summaryResolutionWindowCloses, true)}`
                  : `Open until close of ${formatDate(deadlines.summaryResolutionWindowCloses, true)}`}
              </dd>
              {deadlines.psrExceptionalDue && (
                <>
                  <dt>Latest date with a holding reply</dt>
                  <dd>{formatDate(deadlines.psrExceptionalDue, true)}</dd>
                </>
              )}
            </dl>
            {run.clock === "confirm" && (
              <div role="group" aria-labelledby="clock-q" className={styles.clockChoice}>
                <p id="clock-q" className="small"><strong>Which time limit applies?</strong> The AI was not sure. Until you choose, the shorter one is used (policy CP-3.3).</p>
                {(["15_business_days", "8_weeks"] as Clock[]).map((c) => (
                  <label key={c} className="small">
                    <input type="radio" name="clock" checked={clockChoice === c} disabled={!editable}
                      onChange={() => { setClockChoice(c); click(); changed(); log("Handler", `Confirmed deadline rule: ${CLOCK_LABEL[c]}.`); }} />{" "}
                    {CLOCK_LABEL[c]}
                  </label>
                ))}
              </div>
            )}
          </section>

          <section className={styles.panel} data-tour="checklist">
            <h2>Handover checklist</h2>
            <p className="small muted">
              {team.handover
                ? `What ${team.label} needs. ${presentCount} of ${requiredCount} in place. Every gap must be filled or marked not available with a reason (policy CP-6.2).`
                : "Frontline case, no specialist handover."}
            </p>
            <ul className={styles.checklist}>
              {checklistIds.map((id) => {
                const item = checklistById.get(id);
                const status = statusOf(id);
                const fix = gapFixes[id];
                const shownStatus = fix?.status === "added" ? "present" : fix ? "not_applicable" : status;
                return (
                  <li key={id} id={`gap-${id}`} tabIndex={-1} className={styles[`check_${shownStatus}`]}>
                    <span className={styles.checkIcon} aria-hidden="true">{shownStatus === "present" ? "✓" : shownStatus === "not_applicable" ? "–" : "!"}</span>
                    <span>
                      <span className="small">{labels.checklist[id]}</span>
                      <span className="visually-hidden">: {fix ? (fix.status === "added" ? "added by handler" : "not available") : status.replaceAll("_", " ")}</span>
                      {item?.value && status !== "missing" && <span className={`small muted ${styles.checkValue}`}>{show(item.value)}</span>}
                      {status === "conflicting" && !fix && <span className={`small ${styles.redText} ${styles.checkValue}`}>Sources disagree. Check before handing over.</span>}
                      {fix && <span className={`small ${styles.checkValue}`}>{fix.status === "added" ? "Added by handler: " : "Not available: "}{fix.text}</span>}
                      {team.handover && editable && (status === "missing" || status === "conflicting") && gapEditing?.id !== id && (
                        <span className={styles.gapActions}>
                          {fix ? (
                            <button className="link-button small" onClick={() => { setGapEditing({ id, status: fix.status }); setGapDraft(fix.text); }}>Change</button>
                          ) : (
                            <>
                              <button className="link-button small" onClick={() => { setGapEditing({ id, status: "added" }); setGapDraft(""); }}>Add detail</button>
                              <button className="link-button small" onClick={() => { setGapEditing({ id, status: "not_available" }); setGapDraft(""); }}>Not available</button>
                            </>
                          )}
                        </span>
                      )}
                      {gapEditing?.id === id && (
                        <span className={styles.gapEditor}>
                          <label className="small" htmlFor={`gap-input-${id}`}>{gapEditing.status === "added" ? "Detail to add" : "Why it is not available"}</label>
                          <input id={`gap-input-${id}`} value={gapDraft} onChange={(e) => setGapDraft(e.target.value)} autoFocus
                            onKeyDown={(e) => { if (e.key === "Enter") saveGap(); }} />
                          <span className={styles.editorButtons}>
                            <button className="btn btn-small" disabled={!gapDraft.trim()} onClick={saveGap}>Save</button>
                            <button className="btn btn-secondary btn-small" onClick={() => { setGapEditing(null); focusAfter.current = `gap-${id}`; }}>Cancel</button>
                          </span>
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className={styles.panel}>
            <h2 ref={signOffRef} tabIndex={-1}>Sign-off</h2>
            {editable && (
              <>
                <ul className={styles.tasks} data-tour="signoff">
                  {tasks.map((t) => (
                    <li key={t.label}>
                      <span className="small">{t.label}</span>
                      <span className={`tag ${t.done ? "tag-green" : ""}`}>{t.done ? "Done" : "To do"}</span>
                    </li>
                  ))}
                </ul>
                {canSignOff ? (
                  <button className="btn" onClick={signOff}>
                    {team.handover ? `${stage === "returned" ? "Sign off again and hand" : "Sign off and hand"} to ${team.label}` : "Sign off case pack"}
                  </button>
                ) : (
                  <p className="small"><strong>Finish the items marked To do to sign off.</strong></p>
                )}
                <p className="small muted">You decide the outcome and write the response. The case pack does neither.</p>
              </>
            )}
            {stage === "signed_off" && <p className="small"><span className="tag tag-green">Signed off</span> The frontline handler continues the complaint.</p>}
            {stage === "with_specialist" && (
              <div className={styles.handedOver}>
                <p><strong>Sent to {team.label}.</strong> Now see it from their side: they decide whether the handover is complete enough to act on.</p>
                <Link href={`/case/${caseFile.id}/handover`} className="btn">Switch to the {team.label} view</Link>
              </div>
            )}
            {stage === "accepted_by_specialist" && (
              <p className="small"><span className="tag tag-green">Accepted by {team.label}</span> <Link href={`/case/${caseFile.id}/handover`}>See their view</Link></p>
            )}
            <p className="small muted">{clicks} review {clicks === 1 ? "action" : "actions"} on this case.</p>
          </section>

          <section className={styles.panel}>
            <div className={styles.packHead}>
              <h2>Audit trail</h2>
              <span className={styles.btnRow}>
                <button className="link-button small" onClick={printAudit}>Download record (PDF)</button>
                <button className="link-button small" onClick={exportAudit}>Data (JSON)</button>
              </span>
            </div>
            <ol className={styles.audit} tabIndex={0} aria-label="Audit trail entries">
              {audit.map((a, i) => (
                <li key={i} className="small"><span className="muted">{a.at.slice(11, 19)} {a.actor}.</span> {a.action}</li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
      <section className="audit-print" aria-hidden="true">
        <h1>Audit record, complaint {caseFile.id}</h1>
        <p>{heading.title}{heading.complainant ? `, complaint by ${heading.complainant}` : ""}. Received {formatDate(caseFile.received)}. Suggested team {team.label}. Stage: {stage.replaceAll("_", " ")}.</p>
        <p>AI run: {modelName(run.model)}, prompt {run.promptVersion}, {run.createdAt.slice(0, 10)}, {source}. {run.redacted.replacements.length} personal details replaced before the AI call. Deadline rule: {clock.replaceAll("_", " ")}.</p>
        <h2>Handler decisions</h2>
        <p>{Object.values(decisions).filter((d) => d.status === "accepted").length} accepted, {Object.values(decisions).filter((d) => d.status === "edited").length} edited, {Object.values(decisions).filter((d) => d.status === "rejected").length} rejected, of {run.checks.statements.length} AI statements.</p>
        {Object.entries(decisions).filter(([, d]) => d.status !== "accepted").map(([path, d]) => (
          <p key={path}><strong>{path}</strong>: {d.status}{d.text ? `, now reads: ${d.text}` : ""}</p>
        ))}
        <h2>Handover gaps</h2>
        {Object.keys(gapFixes).length === 0 ? <p>None filled yet.</p> : Object.entries(gapFixes).map(([id, g]) => (
          <p key={id}><strong>{labels.checklist[id] ?? id}</strong>: {g.status === "added" ? "detail added" : "not available"}. {g.text}</p>
        ))}
        <h2>Every action, in order</h2>
        <ol>
          {audit.map((a, i) => (
            <li key={i}>{a.at.replace("T", " ").slice(0, 19)} {a.actor}. {a.action}</li>
          ))}
        </ol>
        <p>Handler edits may contain real names, because handlers are authorised to see them. Generated from the prototype at {new Date().toISOString().slice(0, 16).replace("T", " ")} UTC.</p>
      </section>
      <Tour />
    </div>
  );
}

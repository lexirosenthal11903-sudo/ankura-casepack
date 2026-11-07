import { bank, checklists, listCaseIds, loadCase, policy } from "@/lib/data";
import { sharedIncidents } from "@/lib/insights";
import { liveModeAvailable } from "@/lib/demo";
import { formatDate, modelName } from "@/lib/format";
import { restore } from "@/lib/redact";
import { loadSavedRun } from "@/lib/saved-runs";
import Replay, { type ReplayData } from "./Replay";

export const dynamic = "force-static";

// The replay shows one real saved run, HV-007, so every word and number on screen was produced by the system.
const CASE_ID = "HV-007";

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export default function Home() {
  const c = loadCase(CASE_ID);
  const run = loadSavedRun(CASE_ID)!;
  const r = run.redacted.replacements;
  const shown = (t: string) => restore(t, r, run.redacted.display);
  const email = c.documents[0];

  // Split the email into plain text and the pieces that get hidden, in reading order.
  const hidden = new Map(r.filter((x) => x.documentId === email.id).map((x) => [x.original, x.placeholder]));
  const originals = [...hidden.keys()].sort((a, b) => b.length - a.length);
  const splitter = new RegExp(`(${originals.map(escapeRe).join("|")})`, "g");
  const emailSegments = email.text
    .split(splitter)
    .filter((s) => s.length > 0)
    .map((s) => (hidden.has(s) ? { text: s, placeholder: hidden.get(s)! } : { text: s }));

  const byPath = new Map(run.checks.statements.map((s) => [s.path, s]));
  const row = (section: string, path: string, text: string) => {
    const s = byPath.get(path);
    const cite = s?.citations[0];
    return { section, text: shown(text), source: cite?.source ?? "", quote: cite ? shown(cite.quote) : "", ok: s?.supported ?? true };
  };
  const policyTitle = (id: string) => policy.paragraphs.find((p) => p.id === id)?.heading ?? id;
  const rows = [
    ...run.pack.summary.map((s, i) => row("Summary", `summary.${i}`, s.text)),
    ...run.pack.timeline.map((t, i) => row("Timeline", `timeline.${i}`, `${formatDate(t.date)}: ${t.event}`)),
    // Three policy rows are enough to make the point. The counter still covers every statement.
    ...run.pack.relevant_policy.slice(0, 3).map((p, i) => row("Policy", `relevant_policy.${i}`, `${p.policy_id} ${policyTitle(p.policy_id)}. ${p.why_relevant}`)),
    ...run.pack.flags.map((f, i) => row("Flag", `flags.${i}`, f.description)),
  ];

  const team = bank.teams.find((t) => t.id === run.pack.intake.suggested_team)!;
  const injection = run.pack.flags.find((f) => f.type === "instruction_in_customer_text");

  // Proof numbers across all 15 development cases, read from the saved runs.
  const devRuns = listCaseIds("dev").map((id) => loadSavedRun(id)!);
  const proof = {
    cases: devRuns.length,
    verified: devRuns.reduce((n, x) => n + x.checks.supportedCount, 0),
    statements: devRuns.reduce((n, x) => n + x.checks.supportedCount + x.checks.unsupportedCount, 0),
    costUsd: devRuns.reduce((n, x) => n + x.usage.costUsd, 0) / devRuns.length,
    hiddenDetails: devRuns.reduce((n, x) => n + x.redacted.replacements.length, 0),
  };

  // What the handler still has to fill in, in plain words.
  const allItems = [...checklists.common, ...Object.values(checklists.teams).flat()];
  const missingLabels = run.checks.checklist.missing.map((id) => {
    const item = allItems.find((x) => x.id === id);
    return item?.short ? item.short.charAt(0).toUpperCase() + item.short.slice(1) : (item?.label ?? id);
  });

  // The team leader's headline numbers, worked out the same way as the team page.
  const devCases = listCaseIds("dev").map((id) => ({ c: loadCase(id), run: loadSavedRun(id)! }));
  const incident = sharedIncidents(devCases.map(({ c }) => ({ id: c.id, text: c.documents.map((d) => d.text).join("\n") })))[0];
  const vulnerable = devCases.filter(({ run: x }) => x.pack.vulnerability.length > 0);
  const board = {
    open: devCases.length,
    overdue: devCases.filter(({ run: x }) => x.deadlines.status === "overdue").length,
    vulnerable: vulnerable.length,
    vulnNotRecorded: vulnerable.filter(({ run: x }) => x.checks.checklist.missing.includes("vulnerability_recorded")).length,
    incident: incident ? { count: incident.caseIds.length, date: incident.date ? formatDate(incident.date) : null, ref: incident.key } : null,
  };

  const data: ReplayData = {
    caseId: CASE_ID,
    customer: `${c.record.customer.title ? c.record.customer.title + " " : ""}${c.record.customer.name}`,
    received: formatDate(c.received, true),
    channel: c.channel,
    emailSegments,
    docCount: c.documents.length,
    totalHidden: r.length,
    policyCount: policy.paragraphs.length,
    model: modelName(run.model),
    seconds: Math.round(run.usage.latencyMs / 1000),
    costPence: run.usage.costUsd * 79,
    team: team.label,
    teamReason: shown(run.pack.intake.team_reason.text),
    clock: run.clock,
    rows,
    verified: run.checks.supportedCount,
    totalStatements: run.checks.supportedCount + run.checks.unsupportedCount,
    injection: injection ? shown(injection.description) : null,
    workingDue: formatDate(run.deadlines.workingDue, true),
    businessDaysLeft: run.deadlines.businessDaysLeft,
    refundDue: run.deadlines.refundDue ? formatDate(run.deadlines.refundDue, true) : null,
    refundOverdue: Boolean(run.deadlines.refundOverdue),
    morePolicy: Math.max(0, run.pack.relevant_policy.length - 3),
    missing: run.checks.checklist.required - run.checks.checklist.present,
    missingLabels,
    board,
    required: run.checks.checklist.required,
    liveAvailable: liveModeAvailable(),
    proof,
  };

  return <Replay data={data} />;
}

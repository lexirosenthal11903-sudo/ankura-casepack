import { bank, checklists, loadCase } from "@/lib/data";
import { formatDate, modelName } from "@/lib/format";
import { restore } from "@/lib/redact";
import { loadSavedRun } from "@/lib/saved-runs";
import Walkthrough, { type WalkthroughData } from "./Walkthrough";

export const dynamic = "force-static";

// The walkthrough follows one real case from the saved runs, so every number on screen is genuine.
const CASE_ID = "HV-007";

export default function Home() {
  const c = loadCase(CASE_ID);
  const run = loadSavedRun(CASE_ID)!;
  const r = run.redacted.replacements;
  const shown = (t: string) => restore(t, r, run.redacted.display);
  const email = c.documents[0];
  const emailRedacted = run.redacted.documents[0];

  const hidden = [...new Map(r.filter((x) => x.documentId === email.id).map((x) => [x.original, x.placeholder])).entries()].map(
    ([original, placeholder]) => ({ original, placeholder }),
  );

  // An example of the checking: the first summary sentence that quotes a case document.
  const statement = run.checks.statements.find((s) => s.path.startsWith("summary.") && s.citations.some((x) => /^D\d+$/.test(x.source)))!;
  const cite = statement.citations.find((x) => /^D\d+$/.test(x.source))!;
  const sourceDoc = c.documents.find((d) => d.id === cite.source)!;

  const injection = run.pack.flags.find((f) => f.type === "instruction_in_customer_text");
  const checklistLabels = Object.fromEntries([...checklists.common, ...Object.values(checklists.teams).flat()].map((i) => [i.id, i.short ?? i.label]));
  const team = bank.teams.find((t) => t.id === run.pack.intake.suggested_team)!;

  const data: WalkthroughData = {
    caseId: CASE_ID,
    customer: `${c.record.customer.title ? c.record.customer.title + " " : ""}${c.record.customer.name}`,
    firstName: c.record.customer.name.split(" ")[0],
    received: formatDate(c.received, true),
    email: email.text,
    emailRedacted: emailRedacted.text,
    hidden,
    totalHidden: r.length,
    summary: run.pack.summary.map((s) => shown(s.text)),
    wants: shown(run.pack.outcome_sought.text),
    model: modelName(run.model),
    seconds: Math.round(run.usage.latencyMs / 1000),
    // Rough conversion at 79p to the dollar, only for a plain-English "under 1p" label.
    costPence: run.usage.costUsd * 79,
    check: {
      statement: shown(statement.text),
      sourceLabel: `${sourceDoc.id}, ${sourceDoc.system === "CARDS" ? "the bank's card records" : sourceDoc.system === "EMAIL" ? "the customer's email" : sourceDoc.system === "CRM" ? "the bank's case notes" : sourceDoc.system}`,
      quote: shown(cite.quote),
      sourceText: sourceDoc.text,
    },
    verified: run.checks.supportedCount,
    totalStatements: run.checks.supportedCount + run.checks.unsupportedCount,
    injectionFlag: injection ? shown(injection.description) : null,
    team: team.label,
    workingDue: formatDate(run.deadlines.workingDue, true),
    businessDaysLeft: run.deadlines.businessDaysLeft,
    needsClock: run.deadlines.needsHandlerConfirmation,
    eightWeekDue: formatDate(run.deadlines.eightWeekDue, true),
    missing: run.checks.checklist.missing.map((m) => checklistLabels[m] ?? m),
    present: run.checks.checklist.present,
    required: run.checks.checklist.required,
  };

  return <Walkthrough data={data} />;
}

/** Server-side data for a case page, shared by the handler workspace and the specialist handover page. */
import { bank, checklistFor, checklists, listCaseIds, loadCase, policy } from "@/lib/data";
import type { CaseFile } from "@/lib/types";
import { loadSavedRun } from "@/lib/saved-runs";
import type { CaseHeading, CaseNav } from "./Workspace";

function headingFor(c: CaseFile): CaseHeading {
  // Bereavement cases: the customer has died, so the complaint comes from someone else.
  const deceased = c.record.other_parties.some((p) => p.role === "DECEASED" && p.name === c.record.customer.name);
  const rep = c.record.other_parties.find((p) => p.role === "EXECUTOR" || p.role === "POWER_OF_ATTORNEY");
  const ROLE: Record<string, string> = { EXECUTOR: "executor", POWER_OF_ATTORNEY: "attorney" };
  const customer = `${c.record.customer.title ? c.record.customer.title + " " : ""}${c.record.customer.name}`;
  return {
    title: deceased ? `Estate of ${c.record.customer.name}` : customer,
    complainant: rep?.name ? `${rep.name} (${ROLE[rep.role]})` : null,
  };
}

/** Same order as the queue: most urgent deadline first. */
function navFor(id: string): CaseNav {
  const ordered = listCaseIds("dev")
    .map((cid) => ({ id: cid, due: loadSavedRun(cid)?.deadlines.workingDue ?? "9999", name: headingFor(loadCase(cid)).title }))
    .sort((a, b) => a.due.localeCompare(b.due));
  const i = ordered.findIndex((x) => x.id === id);
  const pick = (j: number) => (j >= 0 && j < ordered.length ? { id: ordered[j].id, name: ordered[j].name } : null);
  return { prev: pick(i - 1), next: pick(i + 1), position: i + 1, total: ordered.length };
}

export function caseProps(id: string) {
  const caseFile = loadCase(id);
  const run = loadSavedRun(id);
  if (!run) return null;
  const allChecklistItems = Object.fromEntries([...checklists.common, ...Object.values(checklists.teams).flat()].map((i) => [i.id, i.label]));
  return {
    caseFile,
    run,
    heading: headingFor(caseFile),
    nav: navFor(id),
    labels: {
      teams: Object.fromEntries(bank.teams.map((t) => [t.id, { label: t.label, handover: t.handover }])),
      causes: Object.fromEntries(bank.causes.map((x) => [x.id, x.label])),
      products: Object.fromEntries(bank.products.map((x) => [x.id, x.label])),
      checklist: allChecklistItems,
      teamChecklists: Object.fromEntries(bank.teams.map((t) => [t.id, checklistFor(t.id).map((i) => i.id)])),
      sendBack: checklists.send_back_reasons,
      policy: Object.fromEntries(policy.paragraphs.map((p) => [p.id, { heading: p.heading, text: p.text }])),
    },
  };
}

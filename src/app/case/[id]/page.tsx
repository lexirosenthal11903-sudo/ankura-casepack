import { notFound } from "next/navigation";
import Link from "next/link";
import { bank, checklistFor, checklists, listCaseIds, loadCase, policy } from "@/lib/data";
import { liveModeAvailable } from "@/lib/demo";
import { loadSavedRun } from "@/lib/saved-runs";
import Workspace, { type CaseHeading } from "./Workspace";

export function generateStaticParams() {
  return listCaseIds("dev").map((id) => ({ id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: `${id} case pack | Harbour & Vale (fictional bank)` };
}

export default async function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!listCaseIds("dev").includes(id)) notFound();
  const c = loadCase(id);
  const run = loadSavedRun(id);
  if (!run) notFound();

  // Bereavement cases: the customer has died, so the complaint comes from someone else.
  const deceased = c.record.other_parties.some((p) => p.role === "DECEASED" && p.name === c.record.customer.name);
  const rep = c.record.other_parties.find((p) => p.role === "EXECUTOR" || p.role === "POWER_OF_ATTORNEY");
  const ROLE: Record<string, string> = { EXECUTOR: "executor", POWER_OF_ATTORNEY: "attorney" };
  const customer = `${c.record.customer.title ? c.record.customer.title + " " : ""}${c.record.customer.name}`;
  const heading: CaseHeading = {
    title: deceased ? `Estate of ${c.record.customer.name}` : customer,
    complainant: rep?.name ? `${rep.name} (${ROLE[rep.role]})` : null,
  };

  const allChecklistItems = Object.fromEntries(
    [...checklists.common, ...Object.values(checklists.teams).flat()].map((i) => [i.id, i.label]),
  );
  const teamChecklists = Object.fromEntries(bank.teams.map((t) => [t.id, checklistFor(t.id).map((i) => i.id)]));

  return (
    <>
      <p className="small">
        <Link href="/queue">Back to all complaints</Link>
      </p>
      <Workspace
        caseFile={c}
        heading={heading}
        initialRun={run}
        liveAvailable={liveModeAvailable()}
        labels={{
          teams: Object.fromEntries(bank.teams.map((t) => [t.id, { label: t.label, handover: t.handover }])),
          causes: Object.fromEntries(bank.causes.map((x) => [x.id, x.label])),
          products: Object.fromEntries(bank.products.map((x) => [x.id, x.label])),
          checklist: allChecklistItems,
          teamChecklists,
          sendBack: checklists.send_back_reasons,
          policy: Object.fromEntries(policy.paragraphs.map((p) => [p.id, { heading: p.heading, text: p.text }])),
        }}
      />
    </>
  );
}

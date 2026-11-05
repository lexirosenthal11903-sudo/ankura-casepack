import { notFound } from "next/navigation";
import Link from "next/link";
import { bank, checklistFor, checklists, listCaseIds, loadCase, policy } from "@/lib/data";
import { liveModeAvailable } from "@/lib/demo";
import { loadSavedRun } from "@/lib/saved-runs";
import Workspace from "./Workspace";

export function generateStaticParams() {
  return listCaseIds("dev").map((id) => ({ id }));
}

export default async function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!listCaseIds("dev").includes(id)) notFound();
  const c = loadCase(id);
  const run = loadSavedRun(id);
  if (!run) notFound();

  const allChecklistItems = Object.fromEntries(
    [...checklists.common, ...Object.values(checklists.teams).flat()].map((i) => [i.id, i.label]),
  );
  const teamChecklists = Object.fromEntries(bank.teams.map((t) => [t.id, checklistFor(t.id).map((i) => i.id)]));

  return (
    <>
      <p className="small">
        <Link href="/">Back to queue</Link>
      </p>
      <Workspace
        caseFile={c}
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

import Link from "next/link";
import { notFound } from "next/navigation";
import { listCaseIds } from "@/lib/data";
import { liveModeAvailable } from "@/lib/demo";
import { caseProps } from "./case-props";
import Workspace from "./Workspace";

export function generateStaticParams() {
  return [...listCaseIds("dev"), ...listCaseIds("heldout")].map((id) => ({ id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: `${id} case pack | Harbour & Vale (fictional bank)` };
}

export default async function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (listCaseIds("heldout").includes(id)) {
    return (
      <div style={{ maxWidth: 760 }}>
        <h1>{id} is a held-back test case</h1>
        <p>
          Ten of the 25 complaints were kept out of the app and never looked at while the prompt was being improved, so the final test could not be
          tuned to them. They were run once at the end. Their results are on <Link href="/how-it-works">How this works</Link>, and the 15 working cases
          are in <Link href="/queue">All complaints</Link>.
        </p>
      </div>
    );
  }
  if (!listCaseIds("dev").includes(id)) notFound();
  const props = caseProps(id);
  if (!props) notFound();
  return (
    <Workspace
      caseFile={props.caseFile}
      heading={props.heading}
      nav={props.nav}
      initialRun={props.run}
      liveAvailable={liveModeAvailable()}
      labels={props.labels}
    />
  );
}

import { notFound } from "next/navigation";
import { listCaseIds } from "@/lib/data";
import { liveModeAvailable } from "@/lib/demo";
import { caseProps } from "./case-props";
import Workspace from "./Workspace";

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

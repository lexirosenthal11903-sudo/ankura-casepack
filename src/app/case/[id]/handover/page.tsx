import { notFound } from "next/navigation";
import { listCaseIds } from "@/lib/data";
import { caseProps } from "../case-props";
import Handover from "./Handover";

export function generateStaticParams() {
  return listCaseIds("dev").map((id) => ({ id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: `${id} handover pack | Harbour & Vale (fictional bank)` };
}

export default async function HandoverPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!listCaseIds("dev").includes(id)) notFound();
  const props = caseProps(id);
  if (!props) notFound();
  return <Handover caseFile={props.caseFile} heading={props.heading} run={props.run} labels={props.labels} />;
}

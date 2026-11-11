import Link from "next/link";
import { listCaseIds } from "@/lib/data";
import { liveModeAvailable } from "@/lib/demo";
import { loadSavedRun } from "@/lib/saved-runs";
import styles from "./start.module.css";

export const dynamic = "force-dynamic";

const CASE_ID = "HV-007";

/** The front page: where a first-time visitor should go, in order, with how long each step takes. */
export default function StartPage() {
  const runs = listCaseIds("dev").map((id) => loadSavedRun(id)).filter((r) => r !== null);
  const statements = runs.reduce((n, r) => n + r.checks.supportedCount + r.checks.unsupportedCount, 0);
  const verified = runs.reduce((n, r) => n + r.checks.supportedCount, 0);
  const live = liveModeAvailable();
  return (
    <div className={styles.page}>
      <h1>Start here</h1>
      <p className={styles.lede}>
        A complaints case pack tool for a fictional UK bank. The AI drafts the pack, code checks every quote and every deadline, and a person decides.
        About ten minutes covers it, in this order.
      </p>
      <ol className={styles.route}>
        <li>
          <Link href={`/case/${CASE_ID}?tour=1`} className="btn">Take the guided tour</Link>
          <span>Two minutes. Eight stops over the real handler&apos;s screen, with Next and Skip.</span>
        </li>
        <li>
          <Link href="/queue"><strong>Review a complaint</strong></Link>
          <span>Three minutes. Pick one from the list, accept the checked sentences, fill the gaps, sign off, then accept it as the specialist.</span>
        </li>
        <li>
          <Link href="/team"><strong>Team leader view</strong></Link>
          <span>One minute. The whole queue, deadlines at risk, repeat problems, and the case you just handed over.</span>
        </li>
        <li>
          <Link href="/try"><strong>Try your own complaint</strong></Link>
          <span>One minute. Type one, or use the example with a hidden instruction, and watch the real process run on it.{live ? "" : " Live mode is off in this copy."}</span>
        </li>
        <li>
          <Link href="/how-it-works"><strong>How this works</strong></Link>
          <span>Controls, results on the held-back cases, limitations.</span>
        </li>
      </ol>
      <p className="small muted">
        Harbour &amp; Vale Bank does not exist. Every customer, policy and complaint is synthetic. The {runs.length} complaints in the queue come from real AI runs:
        {" "}{verified} of {statements} statements had their quote found in the source by code. Full results and the held-back test on How this works.
      </p>
    </div>
  );
}

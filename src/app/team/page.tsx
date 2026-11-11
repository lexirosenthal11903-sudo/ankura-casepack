import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import Link from "next/link";
import { bank, checklists, listCaseIds, loadCase } from "@/lib/data";
import YourReviews from "./YourReviews";
import { DEMO_TODAY } from "@/lib/demo";
import { deadlineTag, formatDate, modelName } from "@/lib/format";
import { byUrgency, groupCases, median, percent, sharedIncidents } from "@/lib/insights";
import { loadSavedRun } from "@/lib/saved-runs";
import type { CaseFile } from "@/lib/types";
import styles from "./team.module.css";

export const dynamic = "force-static";
export const metadata = { title: "Team leader view | Harbour & Vale (fictional bank)" };

interface EvalSummary {
  model: string;
  promptVersion: string;
  repeats: { cases: number; team: number; clock: number; vulnerability: number; missingRecall: number }[];
}

function readEvalSummary(): EvalSummary | null {
  const file = path.join(process.cwd(), "evals/results/summary-dev-haiku.json");
  return existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as EvalSummary) : null;
}

function customerName(c: CaseFile): string {
  const { customer } = c.record;
  if (c.record.other_parties.some((x) => x.role === "DECEASED" && x.name === customer.name)) return `Estate of ${customer.name}`;
  return `${customer.title ? customer.title + " " : ""}${customer.name}`;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function CaseLinks({ ids, names }: { ids: string[]; names: Map<string, string> }) {
  return (
    <ul className={styles.caseList}>
      {ids.map((id) => (
        <li key={id}>
          <Link href={`/case/${id}`}>
            {names.get(id)}
            <span className="visually-hidden">, complaint</span> ({id})
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Bars({
  rows, total, names, showIds = true,
}: { rows: { label: string; caseIds: string[] }[]; total: number; names: Map<string, string>; showIds?: boolean }) {
  const max = Math.max(1, ...rows.map((r) => r.caseIds.length));
  return (
    <table className={styles.bars}>
      <thead>
        <tr>
          <th scope="col">Category</th>
          <th scope="col" className={styles.num}>Complaints</th>
          <th scope="col" className={styles.barCol}>
            <span className="visually-hidden">Share of {total} complaints</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.label}>
            <th scope="row">
              {r.label}
              {showIds && <div className={styles.barIds}>
                {r.caseIds.map((id, i) => (
                  <span key={id}>
                    {i > 0 && ", "}
                    <Link href={`/case/${id}`} aria-label={`${names.get(id)} (${id})`}>{id}</Link>
                  </span>
                ))}
              </div>}
            </th>
            <td className={styles.num}>{r.caseIds.length}</td>
            <td className={styles.barCol} aria-hidden="true">
              <span className={styles.bar} style={{ width: `${(100 * r.caseIds.length) / max}%` }} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function TeamPage() {
  const cases = listCaseIds("dev")
    .map((id) => ({ c: loadCase(id), run: loadSavedRun(id) }))
    .filter((x): x is { c: CaseFile; run: NonNullable<ReturnType<typeof loadSavedRun>> } => x.run !== null);
  const total = cases.length;
  const yourCases = cases.map(({ c, run }) => ({ id: c.id, name: customerName(c), team: bank.teams.find((t) => t.id === run.pack.intake.suggested_team)?.label ?? run.pack.intake.suggested_team }));
  const names = new Map(cases.map(({ c }) => [c.id, customerName(c)]));
  const label = (list: { id: string; label: string }[], id: string) => list.find((x) => x.id === id)?.label ?? id;
  const allItems = [...checklists.common, ...Object.values(checklists.teams).flat()];
  const itemLabel = (id: string) => {
    const item = allItems.find((x) => x.id === id);
    return item?.short ? item.short.charAt(0).toUpperCase() + item.short.slice(1) : (item?.label ?? id);
  };

  // Headline numbers
  const overdue = cases.filter(({ run }) => run.deadlines.status === "overdue");
  const refundOverdue = cases.filter(({ run }) => run.deadlines.refundOverdue);
  const dueSoon = cases.filter(({ run }) => run.deadlines.status === "due_soon");
  const vulnerable = cases.filter(({ run }) => run.pack.vulnerability.length > 0);
  const withGaps = cases.filter(({ run }) => run.checks.checklist.missing.length > 0);
  const gapTotal = cases.reduce((n, { run }) => n + run.checks.checklist.missing.length, 0);

  // Deadlines at risk: everything overdue or due soon, topped up with the next due so a leader sees what is coming
  const byDue = [...cases].sort((a, b) => byUrgency(a.run.deadlines, b.run.deadlines));
  const urgent = byDue.filter(({ run }) => run.deadlines.status !== "on_track");
  const atRisk = byDue.slice(0, Math.max(urgent.length, Math.min(5, total)));

  // Patterns
  const incidents = sharedIncidents(cases.map(({ c }) => ({ id: c.id, text: c.documents.map((d) => d.text).join("\n") })));
  const causes = groupCases(cases.map(({ c, run }) => ({ id: c.id, keys: run.pack.intake.issues.map((i) => i.cause) })));
  const topCauses = causes.filter((g) => g.caseIds.length >= 2);
  const singleCauses = causes.filter((g) => g.caseIds.length < 2);
  const gaps = groupCases(cases.map(({ c, run }) => ({ id: c.id, keys: run.checks.checklist.missing }))).slice(0, 3);
  const vulnNotRecorded = vulnerable.filter(({ run }) => run.checks.checklist.missing.includes("vulnerability_recorded"));
  const lead = incidents[0];
  const leadCause = lead ? causes.find((g) => lead.caseIds.every((id) => g.caseIds.includes(id))) : undefined;

  // Teams
  const teams = groupCases(cases.map(({ c, run }) => ({ id: c.id, keys: [run.pack.intake.suggested_team] })));

  // AI monitoring
  const supported = cases.reduce((n, { run }) => n + run.checks.supportedCount, 0);
  const unsupported = cases.reduce((n, { run }) => n + run.checks.unsupportedCount, 0);
  const invented = cases.reduce((n, { run }) => n + run.checks.inventedPlaceholders.length, 0);
  const toConfirm = cases.filter(({ run }) => run.deadlines.needsHandlerConfirmation);
  const totalCost = cases.reduce((n, { run }) => n + run.usage.costUsd, 0);
  const medianSeconds = median(cases.map(({ run }) => run.usage.latencyMs)) / 1000;
  const models = [...new Set(cases.map(({ run }) => modelName(run.model)))].join(", ");
  const prompts = [...new Set(cases.map(({ run }) => run.promptVersion))].join(", ");
  const evalSummary = readEvalSummary();
  const ev = evalSummary?.repeats[0];

  return (
    <div className={styles.page}>
      <div className={styles.intro}>
        <h1>Team leader&apos;s view</h1>
        <p className={styles.lede}>
          This is the manager&apos;s screen. Handlers see one complaint at a time. The team leader sees all of them: which are about to miss a legal deadline,
          which customers need extra care, which cases are stuck waiting for information, and which bank problems keep causing complaints. Every number
          comes from the checked case packs, so nobody has to build a report by hand.
        </p>
        <p className="small muted">As at {formatDate(DEMO_TODAY, true)}. All figures are worked out by code from the saved case packs.</p>
      </div>

      <h2 className="visually-hidden">Headline numbers</h2>
      <dl className={styles.stats}>
        <div>
          <dt>Open complaints</dt>
          <dd className={styles.statNum}>{total}</dd>
          <dd className={styles.statNote}>In the queue now</dd>
        </div>
        <div className={overdue.length ? styles.statRed : undefined}>
          <dt>Overdue</dt>
          <dd className={styles.statNum}>{overdue.length}</dd>
          <dd className={styles.statNote}>
            {refundOverdue.length ? `Including ${plural(refundOverdue.length, "refund decision")} past the next-day limit` : "None past a deadline"}
          </dd>
        </div>
        <div className={dueSoon.length ? styles.statAmber : undefined}>
          <dt>Due within 5 business days</dt>
          <dd className={styles.statNum}>{dueSoon.length}</dd>
          <dd className={styles.statNote}>Not yet overdue</dd>
        </div>
        <div>
          <dt>Signs of vulnerability</dt>
          <dd className={styles.statNum}>{vulnerable.length}</dd>
          <dd className={styles.statNote}>Need extra care under Consumer Duty</dd>
        </div>
        <div>
          <dt>Ready to hand over</dt>
          <dd className={styles.statNum}>
            {total - withGaps.length}
            <span className={styles.statOf}> of {total}</span>
          </dd>
          <dd className={styles.statNote}>
            {withGaps.length} with gaps, {plural(gapTotal, "item")} in all
          </dd>
          <YourReviews mode="tile" cases={yourCases} />
        </div>
      </dl>

      <YourReviews mode="section" cases={yourCases} />

      <section aria-labelledby="risk">
        <h2 id="risk">Deadlines at risk</h2>
        <p className="small muted">
          {urgent.length
            ? `${plural(urgent.length, "complaint")} overdue or due within five business days, then the next due.`
            : "Nothing is overdue or due within five business days. These are the next due."}{" "}
          Deadlines follow the FCA complaint rules and are calculated by code, not by the AI.
        </p>
        <div className={styles.tableWrap}>
          <table className={styles.riskTable}>
            <caption className="visually-hidden">Complaints closest to their deadline, most urgent first</caption>
            <thead>
              <tr>
                <th scope="col">Deadline</th>
                <th scope="col">Complaint</th>
                <th scope="col">Why it matters</th>
              </tr>
            </thead>
            <tbody>
              {atRisk.map(({ c, run }) => {
                const d = run.deadlines;
                const why: string[] = [];
                if (d.refundOverdue && d.refundDue) why.push(`Refund decision for an unauthorised payment was due ${formatDate(d.refundDue)} (next business day rule)`);
                if (d.needsHandlerConfirmation) why.push("A person must confirm which deadline rule applies. The shorter one is used until then");
                else if (d.clock === "15_business_days") why.push("Payment services rule, 15 business days");
                if (run.pack.vulnerability.length) why.push("Signs of vulnerability");
                if (!why.length) why.push("Standard 8-week rule");
                return (
                  <tr key={c.id}>
                    <td className={styles.deadline}>
                      {d.refundOverdue ? (
                        <span className="tag tag-red">Refund decision overdue</span>
                      ) : d.status === "overdue" ? (
                        <span className="tag tag-red">{deadlineTag(d.status, d.businessDaysLeft, d.calendarDaysLeft)}</span>
                      ) : d.status === "due_soon" ? (
                        <span className="tag tag-amber">{deadlineTag(d.status, d.businessDaysLeft, d.calendarDaysLeft)}</span>
                      ) : (
                        <span className={styles.plainDays}>{deadlineTag(d.status, d.businessDaysLeft, d.calendarDaysLeft)}</span>
                      )}
                      <div className="small muted">Final response due {formatDate(d.workingDue)}</div>
                    </td>
                    <td>
                      <Link href={`/case/${c.id}`} className={styles.caseLink}>{names.get(c.id)}</Link>
                      <div className="small muted">
                        {c.id} · {label(bank.teams, run.pack.intake.suggested_team)}
                      </div>
                    </td>
                    <td className="small">{why.join(". ")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="small">
          <Link href="/queue">See all {total} complaints in deadline order</Link>
        </p>
      </section>

      <section aria-labelledby="patterns">
        <h2 id="patterns">Patterns across complaints</h2>
        {lead ? (
          <div className={styles.insight}>
            <p className={styles.insightHead}>
              {lead.caseIds.length} complaints trace back to one incident{lead.date ? ` on ${formatDate(lead.date)}` : ""} (<span className={styles.nowrap}>{lead.key}</span>).
            </p>
            <p>
              Found by code reading the case notes for incident references.
              {leadCause ? ` The AI separately tagged all ${lead.caseIds.length} with the cause "${label(bank.causes, leadCause.key)}", so the two signals agree.` : ""}{" "}
              One fix and one proactive message to affected customers could stop the next wave of these.
            </p>
            <CaseLinks ids={lead.caseIds} names={names} />
            {incidents.slice(1).map((g) => (
              <p key={g.key} className="small">
                Also {g.key}: {plural(g.caseIds.length, "complaint")} ({g.caseIds.join(", ")}).
              </p>
            ))}
          </div>
        ) : (
          <p>No incident reference appears in more than one complaint.</p>
        )}

        <p className={styles.why}>
          <strong>Why this matters.</strong> Handling complaints one at a time treats the symptom. Fixing the cause stops new ones arriving.
          Consumer Duty expects firms to learn from complaints, and the bank&apos;s own policy (CP-10.2) requires every complaint to be tagged
          with a root cause so recurring problems are found and fixed. The case pack does the tagging, so this view costs nothing extra.
        </p>

        <div className={styles.twoCol}>
          <div>
            <h3>Most common causes</h3>
            <p className="small muted">A complaint with several issues counts once under each.</p>
            <Bars rows={topCauses.map((g) => ({ label: label(bank.causes, g.key), caseIds: g.caseIds }))} total={total} names={names} />
            {singleCauses.length > 0 && (
              <p className="small muted">
                One complaint each: {singleCauses.map((g) => `${label(bank.causes, g.key).replace(/ \(.*\)$/, "")} (${g.caseIds[0]})`).join(", ")}.
              </p>
            )}
          </div>
          <div>
            <h3>Gaps that keep coming up</h3>
            <p className="small muted">Information missing before handover. A gap in most cases points to a process fix, not a handler problem.</p>
            <Bars rows={gaps.map((g) => ({ label: itemLabel(g.key), caseIds: g.caseIds }))} total={total} names={names} showIds={false} />
            {vulnerable.length > 0 && (
              <p className="small">
                <strong>
                  {vulnNotRecorded.length} of {vulnerable.length}
                </strong>{" "}
                complaints showing signs of vulnerability do not have it formally recorded on the case (policy CP-5.2). Recording it at the
                first contact would close most of these gaps.
              </p>
            )}
          </div>
        </div>
      </section>

      <section aria-labelledby="teams">
        <h2 id="teams">Where cases are going</h2>
        <p className="small muted">The team the AI suggests. A handler confirms routing before any handover.</p>
        <div className={styles.narrow}>
          <Bars rows={teams.map((g) => ({ label: label(bank.teams, g.key), caseIds: g.caseIds }))} total={total} names={names} showIds={false} />
        </div>
      </section>

      <section aria-labelledby="ai">
        <h2 id="ai">Is the AI working?</h2>
        <p className="small muted">The checks a governance or model risk team would watch. Taken from the saved runs shown in this prototype.</p>
        <table className={styles.monitor}>
          <caption className="visually-hidden">AI monitoring figures</caption>
          <tbody>
            <tr>
              <th scope="row">AI statements whose quotes verified</th>
              <td>
                {percent(supported, supported + unsupported)} <span className="muted small">({supported} of {supported + unsupported})</span>
              </td>
            </tr>
            <tr>
              <th scope="row">Statements with no verified source</th>
              <td>
                {unsupported === 0 ? "None" : <span className="tag tag-red">{unsupported}</span>}{" "}
                <span className="muted small">Any would show in red to the handler and block sign-off</span>
              </td>
            </tr>
            <tr>
              <th scope="row">Invented placeholders</th>
              <td>
                {invented === 0 ? "None" : <span className="tag tag-red">{invented}</span>}{" "}
                <span className="muted small">Labels such as [CUSTOMER] the AI made up rather than copied</span>
              </td>
            </tr>
            <tr>
              <th scope="row">Deadline rule a person must confirm</th>
              <td>
                {toConfirm.length}{" "}
                <span className="muted small">
                  ({toConfirm.map(({ c }) => c.id).join(", ") || "none"}). The AI said it was unsure, so the shorter deadline applies until a person decides
                </span>
              </td>
            </tr>
            {ev && (
              <tr>
                <th scope="row">Matches the answer key</th>
                <td>
                  Team {percent(ev.team, 1)}, deadline rule {percent(ev.clock, 1)}, vulnerability {percent(ev.vulnerability, 1)}, missing
                  information {percent(ev.missingRecall, 1)}{" "}
                  <span className="muted small">(the {ev.cases} development cases the prompt was improved on, so flattering)</span>
                </td>
              </tr>
            )}
            <tr>
              <th scope="row">AI cost</th>
              <td>
                ${(totalCost / total).toFixed(4)} per case, ${totalCost.toFixed(2)} for all {total}{" "}
                <span className="muted small">(median {Math.round(medianSeconds)} seconds per case)</span>
              </td>
            </tr>
            <tr>
              <th scope="row">Model and prompt</th>
              <td>
                {models}, prompt {prompts}
              </td>
            </tr>
          </tbody>
        </table>
        <p className="small">
          A live system would also track how often handlers override the AI, how much they edit its drafts and how often specialists send
          cases back. Send-backs measure the process, never an individual handler. Sudden changes in any of these trigger a review, and
          the tests re-run on every model or prompt change. <Link href="/how-it-works">How the checks and tests work</Link>
        </p>
      </section>

      <p className={styles.note}>
        <strong>About these figures.</strong> They come from {total} fictional complaints and the saved AI runs for them, not from a real
        bank. The ten held-back test cases are not included. At real volumes the same view would show trends week by week.
      </p>
    </div>
  );
}

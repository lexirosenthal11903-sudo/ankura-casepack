import Link from "next/link";
import { bank, listCaseIds, loadCase } from "@/lib/data";
import { loadSavedRun } from "@/lib/saved-runs";
import { deadlineTag, formatDate } from "@/lib/format";
import styles from "./queue.module.css";

export const dynamic = "force-static";
export const metadata = { title: "All complaints | Harbour & Vale (fictional bank)" };

const CHANNEL: Record<string, string> = { phone: "Phone", email: "Email", web_form: "Web form", branch: "Branch", letter: "Letter", social: "Social media" };

export default function QueuePage() {
  const rows = listCaseIds("dev")
    .map((id) => {
      const c = loadCase(id);
      const run = loadSavedRun(id);
      return { c, run };
    })
    .filter((r) => r.run)
    .sort((a, b) => a.run!.deadlines.workingDue.localeCompare(b.run!.deadlines.workingDue));

  const teamLabel = (id: string) => bank.teams.find((t) => t.id === id)?.label ?? id;
  const causeLabel = (id: string) => bank.causes.find((t) => t.id === id)?.label ?? id;
  const overdue = rows.filter((r) => r.run!.deadlines.status === "overdue").length;
  const dueSoon = rows.filter((r) => r.run!.deadlines.status === "due_soon").length;

  return (
    <>
      <div className={styles.intro}>
        <h1>Complaints queue</h1>
        <p className={styles.lede}>
          Each complaint has a case pack prepared from its notes and the bank&apos;s policy. A handler reviews it, signs it off and, if
          needed, hands it to a specialist team. The AI never decides the outcome.
        </p>
        <p>
          New here? Start with <Link href="/case/HV-007">Mr Kieran Doyle</Link>: a disputed card payment with a hidden instruction in the email, a refund deadline already passed and four gaps to fill. Or <Link href="/case/HV-007?tour=1">take the guided tour</Link> first.
        </p>
        <p className="small muted">
          {rows.length} open complaints. {overdue} overdue, {dueSoon} due within five business days. Only urgent cases are coloured.
          Deadlines are worked out by code under the FCA complaint rules, not by the AI.
        </p>
      </div>

      <div className={styles.tableWrap}>
        <table>
          <caption className="visually-hidden">Open complaints, most urgent first</caption>
          <thead>
            <tr>
              <th scope="col">Deadline</th>
              <th scope="col">Complaint</th>
              <th scope="col">Issue</th>
              <th scope="col">Suggested team</th>
              <th scope="col">Flags</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ c, run }) => {
              const d = run!.deadlines;
              const p = run!.pack;
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
                    <div className="small muted">Due {formatDate(d.workingDue)}</div>
                  </td>
                  <td>
                    <Link href={`/case/${c.id}`} className={styles.caseLink}>
                      {c.record.other_parties.some((x) => x.role === "DECEASED" && x.name === c.record.customer.name)
                        ? `Estate of ${c.record.customer.name}`
                        : `${c.record.customer.title ? c.record.customer.title + " " : ""}${c.record.customer.name}`}
                    </Link>
                    <div className="small muted">
                      {c.id} · {CHANNEL[c.channel]} · received {formatDate(c.received)}
                    </div>
                  </td>
                  <td className="small">
                    {p.intake.issues.length ? p.intake.issues.map((i) => causeLabel(i.cause)).join("; ") : <em>Not enough information</em>}
                  </td>
                  <td className="small">{teamLabel(p.intake.suggested_team)}</td>
                  <td>
                    <div className={styles.flags}>
                    {p.vulnerability.length > 0 && <span className="tag tag-blue">Vulnerability</span>}
                    {d.needsHandlerConfirmation && <span className="tag tag-amber">Deadline rule to confirm</span>}
                    {d.clock === "15_business_days" && <span className="tag">15-day payment rule</span>}
                    {p.intake.already_with_ombudsman && <span className="tag">With Ombudsman</span>}
                    {p.intake.linked_to_earlier_complaint && <span className="tag">Repeat complaint</span>}
                    {p.flags.some((f) => f.type === "instruction_in_customer_text") && <span className="tag tag-red">Instruction in text</span>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

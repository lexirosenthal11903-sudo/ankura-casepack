import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import Link from "next/link";
import { listCaseIds, loadCase } from "@/lib/data";
import { formatDate, modelName } from "@/lib/format";
import { redactCase } from "@/lib/redact";
import styles from "./how.module.css";

export const dynamic = "force-static";
export const metadata = { title: "How this works | Harbour & Vale case pack prototype" };

interface Summary {
  model: string;
  promptVersion: string;
  generated: string;
  repeats: {
    cases: number; team: number; clock: number; causeRecall: number; vulnerability: number; policyRecall: number;
    missingRecall: number; missingPrecision: number; supportedRate: number; unsupportedTotal: number; inventedPlaceholders: number;
    injection: string; costPerCase: number; latencyMedianS: number;
  }[];
}

function readSummary(name: string): Summary | null {
  const file = path.join(process.cwd(), "evals/results", `summary-${name}.json`);
  return existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as Summary) : null;
}

/** The held-back redaction score from the blind run on 11 Nov 2026, before the fourth redaction layer existed. See docs/decisions.md. */
const HELDOUT_REDACTION_BLIND = { caught: 78, planted: 101 };

/** Lowest to highest across the repeats, because the AI's answers vary a little each run. */
function range(s: Summary, key: "team" | "clock" | "vulnerability" | "missingRecall" | "policyRecall" | "supportedRate"): string {
  const vals = s.repeats.map((r) => r[key]);
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  return lo === hi ? pct(lo) : `${pct(lo)} to ${pct(hi)}`;
}

/** Redaction measured the same way as evals/redaction.ts: a planted identifier is caught if it no longer appears. */
function redactionScore(split: "dev" | "heldout") {
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  let planted = 0;
  let caught = 0;
  for (const id of listCaseIds(split)) {
    const key = JSON.parse(readFileSync(path.join(process.cwd(), "evals/answer-key", `${id}.json`), "utf8"));
    const text = redactCase(loadCase(id)).documents.map((d) => d.text).join("\n");
    for (const s of key.planted_pii as string[]) {
      planted++;
      if (!new RegExp(`(?<![\\p{L}\\p{N}])${esc(s)}(?![\\p{L}\\p{N}])`, "u").test(text)) caught++;
    }
  }
  return { planted, caught };
}

const pct = (x: number) => `${Math.round(100 * x)}%`;

export default function HowItWorks() {
  const dev = readSummary("dev-haiku");
  const held = readSummary("heldout-haiku-blind");
  const heldNow = readSummary("heldout-haiku");
  const devRedaction = redactionScore("dev");
  const heldRedactionNow = held ? redactionScore("heldout") : null;
  const d = dev?.repeats[0];
  const h = held?.repeats[0];

  return (
    <div className={styles.page}>
      <h1>How this works</h1>
      <p className={styles.lede}>
        A prototype for a fictional UK bank whose complaints backlog is growing. It prepares a checked case pack for each complaint so
        handlers stop hunting for information and specialist teams receive handovers they can act on. People make every decision.
      </p>

      <h2>The journey of one complaint</h2>
      <ol className={styles.flow}>
        <li className={styles.bank}>
          <span className={styles.who}>Bank</span>
          <strong>Complaint logged</strong>
          <span>Phone, email, letter or branch. The bank&apos;s own case system holds it, as FCA rules require.</span>
        </li>
        <li className={styles.code}>
          <span className={styles.who}>Code</span>
          <strong>Personal details hidden</strong>
          <span>Names, account numbers, phones, emails and addresses become labels such as [CUSTOMER]. Dates and amounts stay.</span>
        </li>
        <li className={styles.ai}>
          <span className={styles.who}>AI</span>
          <strong>Case pack drafted</strong>
          <span>{d ? modelName(dev!.model) : "Claude"} fills in a fixed form: summary, timeline, policy, missing information, flags. Every line must quote its source.</span>
        </li>
        <li className={styles.code}>
          <span className={styles.who}>Code</span>
          <strong>AI&apos;s work checked</strong>
          <span>Every quote is checked against its source. Deadlines are calculated. Anything unsupported is shown in red.</span>
        </li>
        <li className={styles.person}>
          <span className={styles.who}>Person</span>
          <strong>Handler reviews and signs off</strong>
          <span>Accepts what is verified, fixes or rejects what is red, confirms the deadline rule, then hands over.</span>
        </li>
        <li className={styles.person}>
          <span className={styles.who}>Person</span>
          <strong>Specialist accepts or sends back</strong>
          <span>With a coded reason if something is missing. Every step is in the audit trail.</span>
        </li>
      </ol>

      <div className={styles.twoCol}>
        <section>
          <h2>What the AI does</h2>
          <ul>
            <li>Reads the redacted notes and the bank&apos;s complaint policy</li>
            <li>Summarises, builds a timeline and lists what the customer wants</li>
            <li>Suggests the issue type and which team should take it</li>
            <li>Points out missing information, conflicting records and signs of vulnerability</li>
            <li>Flags instructions hidden in customer text</li>
          </ul>
        </section>
        <section>
          <h2>What the AI never does</h2>
          <ul>
            <li>Decide whether a complaint is upheld</li>
            <li>Set compensation or redress</li>
            <li>Write to the customer</li>
            <li>Calculate deadlines (code does this)</li>
            <li>Get sent the names, account numbers or contact details that redaction catches (measured below)</li>
          </ul>
          <p className="small muted">The AI&apos;s answer must fit a fixed form with no field for an outcome or compensation, so it cannot supply one even if a complaint tells it to. Hidden instructions could still try to nudge fields the form does have, such as routing, which is why a person confirms routing and the deadline rule.</p>
        </section>
      </div>

      <h2>Controls</h2>
      <table className={styles.table}>
        <thead><tr><th scope="col">Risk</th><th scope="col">Control</th><th scope="col">How we know it works</th></tr></thead>
        <tbody>
          <tr><td>Customer data reaches the AI</td><td>Four-layer redaction before every call: the bank&apos;s own record, patterns, near-matches for misspelt names, and people the text introduces who are not in the record</td><td>Measured on planted names and numbers (below). Never claimed to be perfect</td></tr>
          <tr><td>AI makes things up</td><td>Every statement must quote its source. Code checks each quote</td><td>Unit tests. Unsupported lines are red and block sign-off</td></tr>
          <tr><td>Incomplete handovers</td><td>Every gap in the specialist team&apos;s checklist must be filled or marked not available with a reason before sign-off (policy CP-6.2). Specialists can send a case back with a coded reason</td><td>End-to-end test of the handover and send-back</td></tr>
          <tr><td>AI decides the outcome</td><td>No outcome or compensation field exists in the form the AI fills in. Routing and the deadline rule, which injected text could still influence, are confirmed by a person</td><td>Injection test case. Schema review</td></tr>
          <tr><td>Wrong deadline</td><td>Deadlines are plain code (8 weeks, or 15 and 35 business days for payment services). Unclear cases default to the shorter one and ask the handler</td><td>Unit tests with hand-counted dates, including bank holidays</td></tr>
          <tr><td>Over-trusting the AI</td><td>A verified quote proves the words exist, not that they support the statement. The handler judges relevance</td><td>Stated on screen and in training</td></tr>
          <tr><td>Results tuned to look good</td><td>Answer key written before the prompt. Ten test cases held back until the end</td><td>Held-back results reported separately</td></tr>
          <tr><td>Public demo misused</td><td>Saved results by default. Live mode runs built-in cases only, with a spending cap and an off switch</td><td>No free-text input exists</td></tr>
        </tbody>
      </table>

      <h2>Test results</h2>
      <p>
        25 fictional complaints with an answer key written before the AI prompt. 15 were used to improve the prompt. 10 are held back and
        run once at the end, so the prompt cannot be tuned to them. Scoring is done by code, not by AI.
      </p>
      <table className={styles.table}>
        <thead>
          <tr><th scope="col">Measure</th>{h && <th scope="col">Held-back set, blind run, prompt v3, 3 repeats</th>}{heldNow && <th scope="col">Held-back set after the two corrections, prompt v4, 3 repeats</th>}<th scope="col">Development set (tuned on, v4)</th></tr>
        </thead>
        <tbody>
          {[
            ["Routed to the right team", held && range(held, "team"), heldNow && range(heldNow, "team"), d && pct(d.team)],
            ["Right deadline rule", held && `${range(held, "clock")} on the keys as they were, 60% to 80% once the scam clock was corrected`, heldNow && range(heldNow, "clock"), d && pct(d.clock)],
            ["Signs of vulnerability flagged correctly", held && range(held, "vulnerability"), heldNow && range(heldNow, "vulnerability"), d && pct(d.vulnerability)],
            ["Missing information found", held && range(held, "missingRecall"), heldNow && range(heldNow, "missingRecall"), d && pct(d.missingRecall)],
            ["Expected policy paragraphs cited", held && range(held, "policyRecall"), heldNow && range(heldNow, "policyRecall"), d && pct(d.policyRecall)],
            ["AI statements whose quotes verified", held && range(held, "supportedRate"), heldNow && range(heldNow, "supportedRate"), d && pct(d.supportedRate)],
            ["Injection attempts flagged", h?.injection, heldNow?.repeats[0]?.injection, d?.injection],
            ["Planted personal details hidden", heldRedactionNow && `${HELDOUT_REDACTION_BLIND.caught} of ${HELDOUT_REDACTION_BLIND.planted}`, heldRedactionNow && `${heldRedactionNow.caught} of ${heldRedactionNow.planted}`, `${devRedaction.caught} of ${devRedaction.planted}`],
            ["Cost per case", h && `$${h.costPerCase.toFixed(4)}`, heldNow && `$${heldNow.repeats[0].costPerCase.toFixed(4)}`, d && `$${d.costPerCase.toFixed(4)}`],
          ].map(([label, hv, nv, dv]) => (
            <tr key={label as string}>
              <td>{label}</td>
              {h && <td>{hv ?? "n/a"}</td>}
              {heldNow && <td>{nv ?? "n/a"}</td>}
              <td>{dv ?? "n/a"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="small muted">
        {dev && <>Development results: {modelName(dev.model)}, prompt {dev.promptVersion}, scored {formatDate(dev.generated.slice(0, 10))}. </>}
        The development set flatters the tool because the prompt and redaction rules were improved on it.{" "}
        {h ? "The blind column is the one to judge it by. The second held-back column is after two corrections made on the same morning, so it is not blind." : "The 10 held-back cases are run once, at the end of the build, and their results will be added here as the figures to judge it by."}
      </p>
      {heldRedactionNow && (
        <p>
          <strong>What the held-back set found.</strong> The AI side held up, but hiding personal details caught only {HELDOUT_REDACTION_BLIND.caught} of {HELDOUT_REDACTION_BLIND.planted} planted
          identifiers. Every miss was a person the bank&apos;s record does not know: a boyfriend, a scammer&apos;s name, children named in an email, a carer, a nickname.
          The first three layers work from the record, so they could not see them. A fourth layer that finds people from how the text introduces them was added the same day,
          and the held-back set now scores {heldRedactionNow.caught} of {heldRedactionNow.planted}. That second figure is not blind, and this page says so rather than showing only the clean number.
        </p>
      )}
      {heldRedactionNow && (
        <p>
          <strong>The second thing it caught.</strong> Checking two facts at the regulator&apos;s own pages showed that the prompt, the fictional policy and three
          answer keys had scam complaints on the 8-week clock. The Financial Ombudsman&apos;s guidance to firms says a complaint about how a fraud or scam was
          handled must be answered within 15 business days under DISP 1.6.2A. The deadline engine is deliberately code so that a rule is never guessed, and it
          still carried a wrong rule, because the rule came from a person. Prompt v4, the policy and the keys were corrected, and the second held-back column is
          the re-run. The full account, with every number, is in the decision log in the repository.
        </p>
      )}

      <h2>Known limitations</h2>
      <ul className={styles.limits}>
        <li><strong>A verified quote is not proof.</strong> The check confirms the words exist in the source, not that they support the AI&apos;s point. That is the handler&apos;s job.</li>
        <li><strong>Redaction can change meaning.</strong> In one case a scammer named the payee after the customer, so the AI saw &ldquo;J [CUSTOMER] SAFE&rdquo;. It flagged this correctly, but hiding details can hide evidence too.</li>
        <li><strong>The AI is sometimes unsure which deadline rule applies.</strong> It then says so, the shorter deadline is used, and the handler confirms.</li>
        <li><strong>Small, synthetic test set.</strong> 25 cases written for this prototype. Real performance must be measured in a pilot with real (properly protected) data.</li>
        <li><strong>Not connected to a real bank.</strong> In production the tool would receive cases from the bank&apos;s case system and run inside the bank&apos;s own cloud account in the UK, with no data kept by the AI provider. This prototype does not claim to meet those standards.</li>
      </ul>

      <p className={styles.next}>
        <Link href="/walkthrough">Take the five-step walkthrough</Link>
        <Link href="/queue">See all complaints</Link>
      </p>
    </div>
  );
}

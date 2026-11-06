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

function readSummary(split: string): Summary | null {
  const file = path.join(process.cwd(), "evals/results", `summary-${split}-haiku.json`);
  return existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as Summary) : null;
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
  const dev = readSummary("dev");
  const held = readSummary("heldout");
  const devRedaction = redactionScore("dev");
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
            <li>See names, account numbers or contact details</li>
          </ul>
          <p className="small muted">The AI&apos;s answer must fit a fixed form with no field for an outcome or compensation, so it cannot supply one even if a complaint tells it to.</p>
        </section>
      </div>

      <h2>Controls</h2>
      <table className={styles.table}>
        <thead><tr><th scope="col">Risk</th><th scope="col">Control</th><th scope="col">How we know it works</th></tr></thead>
        <tbody>
          <tr><td>Customer data reaches the AI</td><td>Three-layer redaction before every call: the bank&apos;s own record, patterns, near-matches for misspelt names</td><td>Measured on planted names and numbers (below). Never claimed to be perfect</td></tr>
          <tr><td>AI makes things up</td><td>Every statement must quote its source. Code checks each quote</td><td>Unit tests. Unsupported lines are red and block sign-off</td></tr>
          <tr><td>AI decides the outcome</td><td>No outcome or compensation field exists in the form the AI fills in</td><td>Injection test case. Schema review</td></tr>
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
          <tr><th scope="col">Measure</th><th scope="col">Held-back set (reported)</th><th scope="col">Development set (tuned on)</th></tr>
        </thead>
        <tbody>
          {[
            ["Routed to the right team", h && pct(h.team), d && pct(d.team)],
            ["Right deadline rule", h && pct(h.clock), d && pct(d.clock)],
            ["Signs of vulnerability flagged correctly", h && pct(h.vulnerability), d && pct(d.vulnerability)],
            ["Missing information found", h && pct(h.missingRecall), d && pct(d.missingRecall)],
            ["Expected policy paragraphs cited", h && pct(h.policyRecall), d && pct(d.policyRecall)],
            ["AI statements whose quotes verified", h && pct(h.supportedRate), d && pct(d.supportedRate)],
            ["Injection attempts flagged", h?.injection, d?.injection],
            ["Planted personal details hidden", null, `${devRedaction.caught} of ${devRedaction.planted}`],
            ["Cost per case", h && `$${h.costPerCase.toFixed(4)}`, d && `$${d.costPerCase.toFixed(4)}`],
          ].map(([label, hv, dv]) => (
            <tr key={label as string}>
              <td>{label}</td>
              <td>{hv ?? <span className="muted">Run at the end</span>}</td>
              <td>{dv ?? "n/a"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="small muted">
        {dev && <>Development results: {modelName(dev.model)}, prompt {dev.promptVersion}, scored {formatDate(dev.generated.slice(0, 10))}. </>}
        The development set flatters the tool because the prompt and redaction rules were improved on it. The held-back column is the one
        to judge it by.
      </p>

      <h2>Known limitations</h2>
      <ul className={styles.limits}>
        <li><strong>A verified quote is not proof.</strong> The check confirms the words exist in the source, not that they support the AI&apos;s point. That is the handler&apos;s job.</li>
        <li><strong>Redaction can change meaning.</strong> In one case a scammer named the payee after the customer, so the AI saw &ldquo;J [CUSTOMER] SAFE&rdquo;. It flagged this correctly, but hiding details can hide evidence too.</li>
        <li><strong>The AI is sometimes unsure which deadline rule applies.</strong> It then says so, the shorter deadline is used, and the handler confirms.</li>
        <li><strong>Small, synthetic test set.</strong> 25 cases written for this prototype. Real performance must be measured in a pilot with real (properly protected) data.</li>
        <li><strong>Not connected to a real bank.</strong> In production the tool would receive cases from the bank&apos;s case system and run inside the bank&apos;s own cloud account in the UK, with no data kept by the AI provider. This prototype does not claim to meet those standards.</li>
      </ul>

      <p className={styles.next}>
        <Link href="/">Take the five-step walkthrough</Link>
        <Link href="/queue">See all complaints</Link>
      </p>
    </div>
  );
}

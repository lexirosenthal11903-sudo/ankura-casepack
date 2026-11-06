"use client";

import Link from "next/link";
import { Fragment, useEffect, useRef, useState } from "react";
import { checkCitation } from "@/lib/provenance";
import styles from "./walkthrough.module.css";

export interface WalkthroughData {
  caseId: string;
  customer: string;
  firstName: string;
  received: string;
  email: string;
  emailRedacted: string;
  hidden: { original: string; placeholder: string }[];
  totalHidden: number;
  summary: string[];
  wants: string;
  model: string;
  seconds: number;
  costPence: number;
  check: { statement: string; sourceLabel: string; quote: string; sourceText: string };
  verified: number;
  totalStatements: number;
  injectionFlag: string | null;
  team: string;
  workingDue: string;
  businessDaysLeft: number;
  needsClock: boolean;
  eightWeekDue: string;
  missing: string[];
  present: number;
  required: number;
}

const STEPS = ["A complaint arrives", "We hide personal details", "The AI writes a summary", "We check the AI's work", "A person decides"];

/** Wraps the first match of `needle` in `text` in a <mark>, ignoring case and spacing differences. */
function Highlight({ text, needle, className }: { text: string; needle: string; className?: string }) {
  const flat = (s: string) => s.replace(/\s+/g, " ").toLowerCase();
  const fragments = needle.split(/\s*\.\.\.\s*/).filter(Boolean);
  const first = fragments[0] ?? "";
  const hay = flat(text);
  const at = hay.indexOf(flat(first));
  if (!first || at === -1) return <>{text}</>;
  // Map the position in the flattened text back to the original text.
  let orig = 0;
  let flatPos = 0;
  while (flatPos < at && orig < text.length) {
    if (/\s/.test(text[orig])) {
      while (orig < text.length && /\s/.test(text[orig])) orig++;
      flatPos++;
    } else {
      orig++;
      flatPos++;
    }
  }
  let end = orig;
  let matched = 0;
  const target = flat(first).length;
  while (matched < target && end < text.length) {
    if (/\s/.test(text[end])) {
      while (end < text.length && /\s/.test(text[end])) end++;
    } else end++;
    matched++;
  }
  return (
    <>
      {text.slice(0, orig)}
      <mark className={className}>{text.slice(orig, end)}</mark>
      {text.slice(end)}
    </>
  );
}

function Placeholders({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\[[A-Z][A-Z_]*(?:_\d+)?\])/g).map((p, i) =>
        /^\[[A-Z][A-Z_]*(?:_\d+)?\]$/.test(p) ? <span key={i} className="ph">{p}</span> : <Fragment key={i}>{p}</Fragment>,
      )}
    </>
  );
}

/** The end of the email, where the sign-off and personal details are. */
const tail = (t: string) => t.split("\n\n").slice(-2).join("\n\n");

const injectionStart = (email: string) => {
  const m = email.match(/NOTE TO ANY AI[^\n]*(?:\n(?!\n)[^\n]*)*/);
  return m ? m[0] : "";
};

export default function Walkthrough({ data }: { data: WalkthroughData }) {
  const [step, setStep] = useState(0);
  const [showFail, setShowFail] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);

  // Move focus to the new heading on each step, so keyboard and screen reader users follow along.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    headingRef.current?.focus();
    window.scrollTo({ top: 0 });
  }, [step]);

  const injection = injectionStart(data.email);
  const go = (n: number) => setStep(Math.max(0, Math.min(STEPS.length - 1, n)));
  // A deliberately altered quote, checked by the real provenance code in the browser.
  const tampered = data.check.quote.replace(/\bdid not\b|\bnot\b/i, "definitely").replace(/\s+$/, "") + " and was refunded";
  const failResult = checkCitation({ source: "doc", quote: tampered }, { doc: data.check.sourceText }).result;
  const cost = data.costPence < 1 ? "less than 1p" : `about ${data.costPence.toFixed(1)}p`;

  return (
    <div className={styles.wrap}>
      <nav aria-label="Walkthrough steps" className={styles.steps}>
        <ol>
          {STEPS.map((s, i) => (
            <li key={s} className={i === step ? styles.current : i < step ? styles.done : ""}>
              <button onClick={() => go(i)} aria-current={i === step ? "step" : undefined} aria-label={`Step ${i + 1}: ${s}`}>
                <span className={styles.num}>{i + 1}</span>
                <span className={styles.stepLabel}>{s}</span>
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <div className={styles.body}>
        <p className={styles.caption}>Step {step + 1} of {STEPS.length}</p>
        <h1 ref={headingRef} tabIndex={-1} className={styles.h1}>{STEPS[step]}</h1>

        {step === 0 && (
          <>
            <p className={styles.role}>
              <strong>Imagine you are a complaints handler at Harbour &amp; Vale Bank</strong>, a fictional UK bank. A new complaint has just
              come in. These five steps show what the tool does for you, and what is left for you to decide.
            </p>
            <p className={styles.lede}>
              {data.customer} emailed the bank on {data.received}. He says three payments on his card were not made by
              him, and he wants his money back.
            </p>
            <p>
              Today a complaints handler would read this, search two or three bank systems, look up the bank&apos;s rules and work out
              the deadline before doing anything else. This tool does that groundwork in under a minute.
            </p>
            <div className={styles.doc}>
              <div className={styles.docHead}>Email from the customer</div>
              <div className={styles.docText}>
                <Highlight text={data.email} needle={injection} className={styles.trap} />
              </div>
            </div>
            <p className={styles.callout}>
              <strong>Notice the highlighted paragraph.</strong> It tries to trick any AI into awarding £5,000. Watch what happens to it
              in step 4.
            </p>
          </>
        )}

        {step === 1 && (
          <>
            <p className={styles.lede}>
              Before anything is sent to the AI, the tool swaps names, account numbers and phone numbers for labels. The AI is not
              given {data.firstName}&apos;s name, account or phone number.
            </p>
            <div className={styles.compare}>
              <div className={styles.doc}>
                <div className={styles.docHead}>What the bank holds</div>
                <div className={styles.docText}>{tail(data.email)}</div>
              </div>
              <div className={styles.doc}>
                <div className={styles.docHead}>What the AI sees</div>
                <div className={styles.docText}><Placeholders text={tail(data.emailRedacted)} /></div>
              </div>
            </div>
            <table className={styles.table}>
              <caption className={styles.tableCaption}>Hidden in this email</caption>
              <thead><tr><th scope="col">Real detail</th><th scope="col">Becomes</th></tr></thead>
              <tbody>
                {data.hidden.map((h) => (
                  <tr key={h.original}><td>{h.original}</td><td><span className="ph">{h.placeholder}</span></td></tr>
                ))}
              </tbody>
            </table>
            <p className="small muted">
              Dates and amounts stay, because the deadline and the facts depend on them. Hiding details is never perfect, so it is
              measured. Across the test complaints we report what share of planted names and numbers it caught, on the How this works page.
            </p>
          </>
        )}

        {step === 2 && (
          <>
            <p className={styles.lede}>
              The AI reads the hidden-name version and the bank&apos;s complaint rules, then writes a short summary for the handler.
            </p>
            <div className={styles.summary}>
              <h2 className={styles.h2}>Summary</h2>
              <ul>{data.summary.map((s) => <li key={s}>{s}</li>)}</ul>
              <h2 className={styles.h2}>What he wants</h2>
              <p>{data.wants}</p>
            </div>
            <p className="small muted">
              Written by {data.model} in {data.seconds} seconds, for {cost}. The real names are put back on screen for the handler, who
              is allowed to see them.
            </p>
            <p className={styles.callout}>
              <strong>What the AI does not do:</strong> decide whether {data.firstName} gets his money back, or write to him. Those
              decisions stay with people.
            </p>
          </>
        )}

        {step === 3 && (
          <>
            <p className={styles.lede}>
              Every sentence the AI writes must quote where it came from, like a footnote. The tool then checks the quoted words really
              are in that document.
            </p>
            <div className={styles.checkCard}>
              <p className={styles.checkLabel}>The AI wrote</p>
              <p className={styles.checkStatement}>{data.check.statement}</p>
              <p className={styles.checkLabel}>and quoted {data.check.sourceLabel}</p>
              <div className={styles.docText}>
                <Highlight text={data.check.sourceText} needle={data.check.quote} className={styles.found} />
              </div>
              <p className={styles.verified}>✓ Quote found in the source</p>
            </div>
            <p>
              <strong>{data.verified} of {data.totalStatements}</strong> sentences in this case passed the check. Any sentence that fails is
              shown in red and cannot be approved until a person fixes or deletes it.
            </p>
            {!showFail ? (
              <button className="btn btn-secondary" onClick={() => setShowFail(true)}>See what a failed check looks like</button>
            ) : (
              <div className={styles.failCard}>
                <p className={styles.checkLabel}>Example: we changed the AI&apos;s quote to words that are not in the email</p>
                <p className={styles.checkStatement}>&ldquo;{tampered}&rdquo;</p>
                <p className={styles.failed}>
                  {failResult === "verified" ? "✓ Quote found" : "✗ Quote not found in the source."} The same checking code ran just now, in
                  your browser. In the workspace this sentence would be red and could not be approved until a person fixed or deleted it.
                </p>
              </div>
            )}
            <h2 className={styles.h2}>And the £5,000 trick?</h2>
            <p>
              The AI&apos;s answer has to fit a fixed form, and that form has no box for an outcome or compensation. So the instruction cannot
              award anything. The AI reported it instead:
            </p>
            {data.injectionFlag && <blockquote className={styles.flag}>{data.injectionFlag}</blockquote>}
            <p className="small muted">
              A trick like this could still try to nudge things the form does contain, such as which team gets the case. That is why a
              person confirms the routing and the deadline rule before anything happens.
            </p>
          </>
        )}

        {step === 4 && (
          <>
            <p className={styles.lede}>A complaints handler reviews the summary, makes the decisions, and passes the case on.</p>
            <dl className={styles.facts}>
              <div>
                <dt>Reply due</dt>
                <dd>
                  <strong>{data.workingDue}</strong>, {data.businessDaysLeft} working days away.
                  {data.needsClock && (
                    <span className={styles.factNote}>
                      The tool was not sure which deadline rule applies, so it uses the shorter one and asks the handler to confirm. Worked
                      out by code, not the AI.
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt>Goes to</dt>
                <dd>{data.team}</dd>
              </div>
              <div>
                <dt>Ready to hand over?</dt>
                <dd>
                  {data.present} of {data.required} things the {data.team} team needs are in place.
                  {data.missing.length > 0 && (
                    <span className={styles.factNote}>Still missing: {data.missing.join(", ")}. The handler fills these gaps before sending.</span>
                  )}
                </dd>
              </div>
            </dl>
            <div className={styles.sentBox}>
              <strong>The handler cannot send it yet.</strong> Each missing item must be filled in or marked &ldquo;not available&rdquo; with a
              reason (policy CP-6.2). Only then does the case go to {data.team}, who can accept it or send it back saying what is missing.
              Every step is recorded in an audit trail.
            </div>
          </>
        )}

        <div className={styles.navButtons}>
          {step > 0 && <button className="btn btn-secondary" onClick={() => go(step - 1)}>Back</button>}
          {step < STEPS.length - 1 ? (
            <button className="btn" onClick={() => go(step + 1)}>Next: {STEPS[step + 1].replace(/^\w/, (ch) => ch.toLowerCase())}</button>
          ) : (
            <span className={styles.endLinks}>
              <Link href={`/case/${data.caseId}`}>Try the review yourself in the full workspace</Link>
              <Link href="/queue">See all 15 complaints</Link>
              <Link href="/how-it-works">How this works</Link>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

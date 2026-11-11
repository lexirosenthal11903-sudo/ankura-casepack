"use client";
/**
 * A guided tour over the real handler's screen, like the walkthroughs on online assessments: a box points at one part of
 * the page, says what it is, and the visitor presses Next or Skip. Starts when the address has ?tour=1.
 * The rest of the page stays usable, so a visitor can try the thing the box is pointing at before moving on.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./tour.module.css";

type Stop = { target?: string; title: string; text: string };

const STOPS: Stop[] = [
  { target: '[data-tour="docs"]', title: "1 of 8. The documents the bank holds", text: "You are the complaints handler. This column is everything the bank has on this complaint: the customer's email, the card system's records and the notes from the in-app chat. Today a handler reads all of this from scratch." },
  { target: '[data-tour="as-received"]', title: "2 of 8. The AI never saw the names", text: "What you are reading is the version that went to the AI. The name, the account number and the phone number were replaced with labels before anything left the bank. Press \"As received\" to see the original, then \"What the AI saw\" to come back." },
  { target: '[data-tour="statement"]', title: "3 of 8. Every sentence shows its source", text: "The AI wrote this sentence. Press \"Sources\" underneath it and you see the exact words it quoted from the documents or the bank's policy. Code checked that each quote really exists. If a quote cannot be found, the sentence turns red and cannot be accepted." },
  { target: '[data-tour="accept"]', title: "4 of 8. Accept a section once you have read it", text: "This button accepts the verified sentences in one section. There is no button to accept everything at once. Any single sentence can still be edited or rejected with the links under it, and every decision goes in the audit trail at the bottom." },
  { target: '[data-tour="deadlines"]', title: "5 of 8. Deadlines are worked out by code", text: "The FCA time limit is a rule, so code calculates these dates from the day the complaint arrived. The AI only suggests which rule applies. Here the refund decision for an unauthorised payment is already overdue, which is why it is in red." },
  { target: '[data-tour="checklist"]', title: "6 of 8. What the specialist team needs", text: "This complaint goes to the Fraud and Scams team. This is their checklist. Ticks are things the AI found in the documents. Each red item is a gap, and you fill it with \"Add detail\" or explain it with \"Not available\" before the case can move." },
  { target: '[data-tour="signoff"]', title: "7 of 8. Nothing moves until a person signs off", text: "These three items must all say Done. Then a sign-off button appears here and the case goes to the specialist. There is no field anywhere for an outcome or compensation, so the AI cannot decide, and cannot be tricked into deciding." },
  { title: "8 of 8. That is the tool. Where next?", text: "See all complaints and pick one to review from start to finish. Or stay on this one and try the buttons the tour pointed at. Or type a complaint of your own and watch the pipeline run on it." },
];

export default function Tour() {
  const [step, setStep] = useState<number | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("tour") === "1") setStep(0);
  }, []);

  const measure = useCallback(() => {
    if (step === null) return;
    const sel = STOPS[step].target;
    const el = sel ? (document.querySelector(sel) as HTMLElement | null) : null;
    if (!el) return setRect(null);
    // A tall target (a whole column) is highlighted only at its top, so the box has room underneath and the page still makes sense.
    const r = el.getBoundingClientRect();
    const maxH = Math.min(r.height, window.innerHeight * 0.45);
    setRect(new DOMRect(r.left, r.top, r.width, maxH));
  }, [step]);

  useEffect(() => {
    if (step === null) return;
    const sel = STOPS[step].target;
    const el = sel ? (document.querySelector(sel) as HTMLElement | null) : null;
    if (el) el.scrollIntoView({ block: el.getBoundingClientRect().height > window.innerHeight * 0.45 ? "start" : "center", behavior: "smooth" });
    const t = window.setTimeout(() => {
      measure();
      boxRef.current?.focus();
    }, el ? 450 : 0);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [step, measure]);

  const end = useCallback(() => {
    setStep(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("tour");
    window.history.replaceState(null, "", url.pathname + url.search);
  }, []);

  useEffect(() => {
    if (step === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") end();
      if (e.key === "ArrowRight" && step < STOPS.length - 1) setStep(step + 1);
      if (e.key === "ArrowLeft" && step > 0) setStep(step - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, end]);

  if (step === null) return null;
  const stop = STOPS[step];
  const last = step === STOPS.length - 1;
  const pad = 8;
  const below = rect ? rect.bottom + pad + 12 : null;
  const boxTop = rect ? (below !== null && below + 220 < window.innerHeight ? below : Math.max(12, rect.top - pad - 232)) : null;
  const boxLeft = rect ? Math.min(Math.max(12, rect.left), window.innerWidth - 392) : null;

  return (
    <>
      {rect && <div className={styles.spot} style={{ top: rect.top - pad, left: rect.left - pad, width: rect.width + 2 * pad, height: rect.height + 2 * pad }} aria-hidden="true" />}
      {!rect && <div className={styles.veil} aria-hidden="true" />}
      <div
        ref={boxRef}
        tabIndex={-1}
        role="dialog"
        aria-labelledby="tour-title"
        className={`${styles.box} ${rect ? "" : styles.centre}`}
        style={rect ? { top: boxTop ?? undefined, left: boxLeft ?? undefined } : undefined}
      >
        <p id="tour-title" className={styles.title}>{stop.title}</p>
        <p className={styles.text}>{stop.text}</p>
        <div className={styles.row}>
          {!last && <button className="btn btn-secondary btn-small" onClick={end}>Skip tour</button>}
          <span className={styles.nav}>
            {step > 0 && <button className="btn btn-secondary btn-small" onClick={() => setStep(step - 1)}>Back</button>}
            {!last && <button className="btn btn-small" onClick={() => setStep(step + 1)}>Next</button>}
            {last && <a className="btn btn-small" href="/queue">See all complaints</a>}
            {last && <button className="btn btn-secondary btn-small" onClick={end}>Review this case</button>}
            {last && <a className="btn btn-secondary btn-small" href="/try">Try your own</a>}
          </span>
        </div>
      </div>
    </>
  );
}

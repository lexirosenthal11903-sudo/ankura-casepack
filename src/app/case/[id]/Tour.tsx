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
  { target: '[data-tour="docs"]', title: "1 of 8. The complaint as the bank received it", text: "An email, a system note, a transaction record. Nothing has been typed in by a person. This is the raw material a handler normally reads from scratch." },
  { target: '[data-tour="ai-saw"]', title: "2 of 8. What the AI was allowed to see", text: "Press this to see the version that went to the AI. Names, account numbers, phone numbers and emails became labels before anything left the bank. The AI was never given them." },
  { target: '[data-tour="statement"]', title: "3 of 8. Every sentence shows its source", text: "The AI wrote this. Open Sources and you see the exact words it quoted from the documents or the policy. Code checked that each quote really exists. If it did not, the line turns red and cannot be accepted." },
  { target: '[data-tour="accept"]', title: "4 of 8. Accept a section once you have read it", text: "There is no accept-all button. You accept one section at a time, and any single line can still be edited or rejected. The audit trail records each decision." },
  { target: '[data-tour="deadlines"]', title: "5 of 8. Deadlines are worked out by code", text: "The FCA time limit is a rule, so code calculates it from the date received. The AI only says which rule it thinks applies, and a person confirms when it is unsure." },
  { target: '[data-tour="checklist"]', title: "6 of 8. What the specialist team needs", text: "The specialist's own checklist. Each gap has to be filled in or marked not available with a reason before the case can be handed over. That is the fix for incomplete handovers." },
  { target: '[data-tour="signoff"]', title: "7 of 8. Nothing moves until a person signs off", text: "When every item is done, the sign-off button appears. There is no field anywhere for an outcome or compensation, so the AI cannot decide and cannot be tricked into deciding." },
  { title: "8 of 8. That is the tool. Where next?", text: "See all complaints and pick one to review from start to finish. Or stay on this one. Or type a complaint of your own and watch the pipeline run on it." },
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

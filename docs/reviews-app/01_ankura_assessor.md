# Assessor review of the app, 6 Nov 2026
Reviewed cold at localhost:3123 in about 20 minutes, in saved-run mode. README and deck not written yet, so this judges the build and the in-app explanation only.

## 1. First impression (first 2 minutes)
I understood the pitch within 30 seconds. The walkthrough is the right landing page. One real-looking email, one planted £5,000 injection and a promise to show what happens to it. That is a hook most candidates will not have. The visual style is sober and bank-like, which helps credibility.

What confused me was the queue. HV-011 is "5 days overdue" while every other row counts business days, and it is overdue only on a deadline rule nobody has confirmed yet. On the 8-week clock it is not overdue at all. I also typed /case/HV-020 and got a bare 404 with no explanation. Then I signed off HV-007 in three clicks and under two seconds, with 6 of 13 handover items missing. That is the moment my trust dropped, because incomplete handovers are the problem the brief names.

## 2. Scores against the brief's five points
- **Business value, 5/10.** "Groundwork in under a minute" and "less than 1p" are shown, but there is no baseline, no hours saved and no link to backlog or Ombudsman cost anywhere I could find.
- **Risks, controls and human oversight, 8/10.** This is the strongest graduate work I would expect to see on controls, held back by two overclaims and a handover gate that does not actually gate.
- **How roles and workflows change, 5/10.** Coded send-backs and "measures the process, never an individual" are excellent, but the before and after for handler and specialist is implied, never shown.
- **Assumptions, limitations, trade-offs, 7/10.** The limitations list on /how-it-works is honest and specific (the "J [CUSTOMER] SAFE" example is great), but business assumptions such as volume, cost per case and pilot scope are absent.
- **AI tools used and assessed, 3/10.** Haiku 5.5 is named with cost and prompt version, but there is no model comparison, no reason Haiku was chosen and nothing on how Claude Code was used. The good material in docs/decisions.md is invisible to an assessor.

## 3. Must fix
1. **Handover gate does not gate** (/case/HV-007, sign-off). Each missing checklist item should be filled, or marked "not available" with a reason, before handover. Otherwise the tool reproduces the incomplete handover it claims to fix.
2. **Absolute privacy claims** (/how-it-works "What the AI never does: see names, account numbers or contact details", and walkthrough step 2 "The AI never learns who Kieran is"). Your own controls table says redaction is "never claimed to be perfect". An assessor will spot the contradiction, and it is the exact inflated claim that makes them distrust the rest.
3. **The red state is never visible.** All 15 saved runs show 0 unsupported statements. The key control is described but never seen. Show one real or clearly labelled planted failure being blocked.
4. **Fill the held-back column** (/how-it-works). Nine rows reading "Run at the end" look unfinished. If held-back figures come in lower, show them anyway.
5. **Submission basics.** Public repo, deployed link, and a README with "try these 3 cases". Without these, point 1 of the submission fails.

## 4. Should fix
1. **One-click "Accept all 33 verified"** (/case/HV-007). The audit log shows 33 items accepted in one second. Log review time, or require opening sources on vulnerability, routing and conflict items, so over-reliance is measurable.
2. **Queue units and unconfirmed overdue** (/queue, HV-011). Use business days everywhere and label overdue as "on the shorter clock, confirm rule".
3. **Held-back 404** (/case/HV-020). Say "held back for final evaluation". That turns an error into evidence of a control.
4. **Step 4 example** (walkthrough). The quote covers "payments I did not make" but not the merchant or the date the sentence asserts. Use this on purpose to show what the check cannot prove.
5. **Intake API and mock bank screen** (docs/PLAN.md item 2b). They serve none of the five points. Cut them if they threaten the deck, which carries most of the marks.

## 5. Already distinctive
- An injection defence that is structural (no outcome field), not "the AI ignored it".
- A provenance check that states its own limit on screen.
- A DISP 1.6.2A clock that knows it covers only PSR Parts 6 and 7, and defaults to the shorter clock.
- "Records that disagree" catching the 3DS-approved payment against "I did not make it".
- A decisions log that records Claude Code's mistakes, and a case where the AI was right and the answer key was wrong.

## 6. Hardest questions a reviewer would ask
1. A handler accepted 33 statements in one second. In a pilot, how would you tell careful review from rubber-stamping, and what would you do about it?
2. You corrected the HV-009 answer key after seeing the AI's output. Why should I trust 93%, and what will you say if the held-back set comes in at 70%?
3. Salesforce and Pega already sell complaint summarisation. Give me one value number with its baseline, and tell me why the bank should build or pilot this rather than buy.

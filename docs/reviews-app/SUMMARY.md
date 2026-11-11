# What the app review panel found (6 Nov 2026)

Eight independent reviewers tested the working app. Their full notes are in this folder. Every major finding was checked against the code before being accepted, and all of them held up.

**Overall.** The walkthrough works. A newcomer could explain the tool and why it is safe after reading it. The controls are the strongest part (assessor score 8 out of 10). Nothing critical was found on security, no banned design patterns were found, and a keyboard user can complete the whole review. The weak points are a rubber-stamping gap, two errors on unauthorised card payments, and the business and people side, which the deck has not covered yet.

## Fix now (several reviewers found the same thing)
1. **Handovers can be rubber-stamped (raised by 4 reviewers).** Three clicks sent HV-007 to Fraud and Scams with 6 of 13 checklist items missing. That is the exact problem the brief asks us to fix. Policy CP-6.2 says every item must be filled in or marked "not available, with a reason". So the handler will do exactly that for each gap before handing over. The same controls let the handler fix a case the specialist sends back, which today is a dead end.
2. **Unauthorised card payments are handled wrongly (raised by 3 reviewers).** The AI called the deadline rule "unclear" when it is the 15-day payment services rule. The next-business-day refund duty (CP-7.1) had already passed, but the screen showed "10 days left". And the fraud checklist asks for scam-only details (who was paid, warnings shown), so a correct handover looks incomplete. Fixes: a refund deadline worked out by code and shown in red when it has passed, checklist items marked "scams only", and a clearer instruction to the AI.
3. **Two claims overstated (assessor, security).** "The AI never learns who Kieran is" and "the AI never sees names" become "is not sent the details redaction catches, measured below". "Injection impossible" becomes "cannot award an outcome. It could still try to influence routing, which a person confirms."
4. **Bugs that change what the handler sees (bug hunter).** "Show real names" sometimes showed the wrong form of a name ("J Mrs Ellison SAFE"). Edits to some sections were saved but not shown. "Accept all" counted checklist statements that were never displayed.
5. **Nobody can see what a failed check looks like.** No saved run has a red statement. The walkthrough will show one deliberately altered quote failing, checked live by the same code and clearly labelled as an altered example.

## Fix next
- **Case page:** a summary bar under the name (deadline, days left, team, status) so the urgent facts come first, especially on a phone. Only urgent rows get colour in the queue. Plain-English labels for codes such as DISP, CP-3.3 and 3DS. The sign-off button says why it is locked. Bereavement cases show the executor as the complainant.
- **"How this works":** hide the empty held-back column until the final run fills it.
- **Accessibility:** a visible skip link, keyboard focus kept in place after actions, rejected items readable, a separate page title for each page.
- **Security:** a per-visitor limit on live runs, a cached result for repeat clicks, a shorter AI timeout, and rejection of empty or huge requests.
- **Before the repo goes public:** remove the Ankura staff email from BRIEF.md and decide which internal notes stay private.

## Not changed, and why
- **Pausing collections and adviser-conduct referrals (handler, HV-014).** These are good ideas, but they are outcome decisions. The tool flags what it sees and leaves the decision to people.
- **Moving to real GOV.UK components and type sizes (design).** This is partly adopted (summary bar, inset text, task list). A full move to GOV.UK Frontend is too much for the time left.

## Bigger picture (assessor and brief challenger)
- Business value (5 out of 10), roles and workflows (5) and AI tools assessment (3) are the weakest scores. The deck, the value case, the Sonnet vs Haiku comparison and the held-back results are what lift them. **Start the deck on Saturday, not Tuesday.**
- **The author's own judgement must be visible.** The deck argument, the opportunity scores and the decisions log are written in the first person for that reason.
- Both reviewers suggest cutting the intake connection (plan item 2b) if it threatens the deck. That is the author's call.

## Questions a reviewer would ask
1. "Three clicks sent an incomplete case to Fraud. How did you stop rubber-stamping?"
2. "You changed an answer key after seeing the AI's output. Why should I trust your results?"
3. "Why would a bank build this rather than buy Salesforce or Pega?"

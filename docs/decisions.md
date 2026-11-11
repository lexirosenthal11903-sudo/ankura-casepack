# Decisions log

Each significant choice, why it was made, and where Claude Code got something wrong. Newest last.

## 5 Nov 2026

**Answer key before prompt.** The 25 test cases and their expected answers were written before any AI prompt exists, like writing the mark scheme before the exam. The prompt cannot be tuned to make the results look good.

**15 development cases, 10 held back.** The held-back cases are not run, or even redacted, until the final evaluation. The development score on redaction is 100%, but it was tuned on those cases, so it is not the number we report. The held-back score is.

**Deadlines are plain code, not AI.** DISP dates are rules, so code gets them right every time and can be unit-tested. 10 tests, each date counted by hand, including the Christmas bank holidays.

**Redaction in three layers.** (1) the bank's own record of names and numbers, (2) patterns for emails, phones and postcodes not in the record, (3) near matches for misspelt names. The claim will be "X% of planted identifiers caught", never "no personal data", because redaction is never perfect and pseudonymised data is still personal data under UK GDPR.

**Role-typed placeholders.** [CUSTOMER], [EXECUTOR], [STAFF_1] rather than [NAME_1], so the AI can still follow who did what in a bereavement or attorney case.

**Added an Ombudsman Liaison team and a card dispute category.** The test-case writers found the policy sent Ombudsman cases to a team that did not exist, and that card disputes had no category of their own. Both gaps were fixed in the bank setup.

### Where Claude Code got it wrong (and how it was caught)
- **Shared surnames.** The first redaction version labelled "Mrs Ellison" as her son, because the son shares her surname. Caught by listing every replacement made. Fixed so the customer always gets a shared surname.
- **Reference numbers read as account numbers.** The outage ticket "INC-2026-1030-01" was redacted as an account number, which would have broken the link between complaints about the same outage. Caught the same way. Fixed by ignoring numbers joined by hyphens.
- **13-month scam window.** The brief to the case writer said some romance-scam payments should fall outside the reimbursement window. The writer pointed out that the policy (and, as far as we know, the real rule) counts 13 months from the last payment, so all payments are in scope. The answer key follows the policy. Still to verify at source.

**Structured output instead of forced tool calls.** The plan said "forced tool calls". The current API documentation says the newest models reject forced tool calls and recommends structured outputs (`output_config.format`) for extracting JSON, which guarantee the answer matches the schema. We followed the documentation.

**The form has no outcome field.** The case pack schema has nowhere to put "upheld", compensation or a customer reply. The injection test (HV-007) was flagged, and "£5,000" cannot reach an outcome because no outcome exists.

**Haiku 5.5 first.** The first full run on 15 development cases cost about 8 cents in total ($0.0055 per case), 41 seconds median per case. Sonnet is compared later.

### Prompt v1 to v2 (5 Nov, development set only)
v1 baseline on the 15 development cases: team 93%, clock 80%, vulnerability 87%, policy 62%, missing information 81%, quotes verified 100%.

Each disagreement was checked before anything changed, to decide whether the AI or the answer key was wrong.
- **The AI was right, the key was wrong (HV-009).** The claims company letter says the customer was persistently in debt and core banking shows 341 days overdrawn in a year. That is a financial difficulty sign under CP-5.1, which the key had missed. The key was corrected and the change is noted in its rationale. Changing a key after seeing AI output is a risk, so the rule is to change it only when the key contradicts the bank's own policy, and to log every change here.
- **The definition was vague, not the AI.** "Vulnerability recorded" was read as "signs mentioned". The checklist now says it means formally recorded with support needs (CP-5.2). "Customer contact attempted" now says a call from the customer counts.
- **The AI was too cautious on the clock.** It called outages and fees "unclear" for payment services. v2 says outages, fees, declines and lending decisions are not Parts 6-7 issues on their own, and that costs caused by a wrongly executed payment do not make it a mixed complaint.
- **Policy citations were too narrow.** v2 asks for the paragraphs that govern the next step (handover, recording what the customer wants, recording vulnerability).

v2 on the same cases: team 93%, clock 93%, vulnerability 100%, policy 71%, missing information 93%, quotes verified 100%. These are the cases the prompt was improved on, so they overstate real performance. The held-back set gives the reported figures.

**Not changed, deliberately.** HV-013 (an outage that blocked a card purchase) was routed to Payments and Disputes rather than frontline. Both are defensible, and tuning the prompt for one case would be overfitting.

## 6 Nov 2026

**Guided walkthrough as the landing page.** Lexi found the full workspace overwhelming ("a lot of information and not very clear"). If it overwhelmed her, it would overwhelm an assessor with 15 minutes. So the first screen is now a five-step walkthrough of one real case, one idea per screen (the GOV.UK "one thing per page" rule), with the full workspace one click away.

**Eight-reviewer app review.** Full notes and the summary are in docs/reviews-app/. Every major finding was checked against the code first, and all held up. What changed:
- **Handover gate.** Three clicks could send an incomplete case to Fraud (found by four reviewers). The handler must now fill each checklist gap or mark it not available with a reason before sign-off, which is what policy CP-6.2 already said. A case sent back can only be signed off again after something changes.
- **Unauthorised card payments.** The deadline rule was wrong ("unclear" instead of the 15-day payment services rule), the next-business-day refund duty was not shown, and the fraud checklist asked for scam-only fields. Fixed with prompt v3, a refund deadline calculated by code, and checklist items marked "scams the customer authorised only".
- **Claims made precise.** "The AI never learns who Kieran is" became "is not given his name, account or phone number". "Injection impossible" became "cannot award an outcome. It could still try to nudge routing, which a person confirms."
- **Display bugs.** Restored names now come from the bank's record, not the first spelling found in the notes ("J Mrs Ellison SAFE" was a real bug). Edits now show on screen. "Accept all" no longer counts checklist items it does not display.
- **A failed check you can see.** No saved run had a red statement at the time (the v4 saved run for HV-009 now has one), so the walkthrough shows a deliberately altered quote failing, checked live in the browser by the same code, and labelled as an altered example.
- **Security.** Live mode is limited per visitor and per day, a recent live result is reused, AI calls time out inside the hosting limit, and empty or oversized requests are rejected.
- **Accessibility.** Visible skip link, keyboard focus kept in place after actions, readable rejected items, a separate page title for each page, current-page marker in the navigation.

**Not adopted, and why.** Suggestions to pause collections or refer adviser conduct (HV-014) are outcome decisions, so the tool leaves them to people. A full move to GOV.UK Frontend components is too big for the time left. The most visible patterns were adopted instead (summary bar, task list).

**Prompt v3 (development set only).** Team 100%, deadline rule 100%, missing information found 95% (precision 92%), quotes verified 100%, $0.0056 per case. These are tuned figures. The held-back set gives the reported ones.

**Intake connection deferred (Lexi's decision).** Both the assessor and the brief challenger said the deck matters more. The deck starts first, and the connection is built on Monday only if the deck is on track.

## 11 Nov 2026, the held-back run

**Run once, blind, three repeats, on Claude Haiku 5.5 with prompt v3.** The ten held-back cases (HV-016 to HV-025) had never been redacted, run or looked at until this morning. Results are in `evals/results/eval-heldout-haiku-2026-11-11-0844-blind.md`. Team 90 to 100%, deadline rule 80 to 100%, vulnerability 90%, policy citations 67 to 74%, missing information found 85 to 91%, quotes verified 99 to 100% (4 red sentences out of about 750 across three runs, each a slight paraphrase the handler would see in red), about $0.006 and 45 seconds a case. The AI side held up. The two "wrong" deadline answers were the AI saying "confirm" rather than guessing, which routes to a person, and one case (HV-025) went to Payments and Disputes instead of frontline.

**Redaction did not hold up: 78 of 101 planted identifiers, against 112 of 112 on the development set.** Every one of the 23 misses was a person the bank's record does not know. A boyfriend called Josh, a scammer called Ryan with a payee name of R HOLLIS, four children named in one email, a carer called Joyce, a partner called Sami, a nickname (Bev, Mo, Kof), a date of birth read out on a call, an address abbreviated by the payments system (27 BRAMLEY CL). The first three layers work from the bank's record and from number patterns, so a person who exists only in the free text was invisible to them. The development cases happened not to name anyone outside the record, so the development score hid the gap. This is exactly what a held-back set is for.

**Fixed the same morning, with the fix stated as not blind.** A fourth layer finds people from how the text introduces them ("my partner Ewa", "a lady called Bev", "his name was Ryan", "payee R CALLOWAY", a sign-off, children listed with ages, someone who "deals with the money") and then hides every later mention of that name across the case. Nicknames for Beverley, Maureen and Mohammed were added, a truncated first name in a rushed note ("Kof") now matches, the address pattern accepts upper-case abbreviations, a spoken date of birth is hidden, and a title now resolves to the customer rather than a relative who shares the surname ("Mrs Mensha" was being read as the late husband). Company payees are deliberately kept, because a care home or a firm of solicitors is evidence: a two-word upper-case payee is treated as a person, three words or a company word (LTD, SERVICES, SOLICITORS, CARE) is not. Eight new unit tests cover the positives and the things that must not be hidden ("It is 6 weeks", "HELD for review", "a month ago" when Mo is a person).

After the fix: 101 of 101 on the held-back set and still 112 of 112 on the development set. The held-back figure is no longer blind for redaction, and the deck says so. The AI-quality figures above were produced before the fix and stand as the blind result. A second run after the fix is reported alongside them.

**What this means for a real pilot.** Record-based hiding is necessary but not enough. A production system would add a trained named-entity model as a further layer, and the measure (planted identifiers caught) would be run on every release.

**A second finding the same morning: the scam complaint clock was wrong.** Two facts in docs/VERIFIED_FACTS.md were still marked "to verify at source". Checking them against the regulator's own documents confirmed every APP reimbursement figure (£85,000, 13 months, £100 excess never for vulnerable customers, five business days with a 35 business day limit, PSR PS25/5). It also showed that the prompt, the fictional policy and three answer keys were wrong about the deadline for a scam complaint. The Financial Ombudsman's guidance to firms says: "If a customer complains to you about the way your firm handled a fraud or scam, you must reply within 15 business days", citing DISP 1.6.2A. The key had reasoned that an authorised payment is not a Parts 6 and 7 issue and put APP scams on the 8-week clock. That reasoning was mine, it was plausible, and it was wrong. In a real bank this would have meant answering scam complaints up to five weeks late.

Fixed: prompt v4 (one sentence changed), policy CP-3.2 now names fraud and scam complaints, keys HV-001, HV-016 and HV-021 moved to 15 business days with the correction dated in their rationale. The blind v3 runs re-scored against the corrected keys drop the held-back deadline score from 80 to 100% to 60 to 80%, because the AI followed the prompt it was given. The v4 re-run is reported as the current figure and is not blind for that measure. The saved runs the site replays were regenerated on v4.

The lesson I would give an assessor: the deadline engine was deliberately code, not AI, so that a rule could never be guessed. It still carried a wrong rule, because the rule came from me. Verifying at source is a control too, and it should have run before the blind test, not after.

**Prompt v4 re-run (not blind).** Held-back set, three repeats: team 90 to 100%, deadline rule 80 to 89% (the misses are the AI saying "confirm", which sends the case to a person, plus HV-025 routed to Payments and Disputes), vulnerability 89 to 90%, policy 70 to 73%, missing information 82 to 90%, quotes verified 100%, redaction 101 of 101, about $0.006 a case. One of thirty runs failed to parse and was retried. Development set on v4: team 100%, clock 100%, vulnerability 93%, policy 66%, missing information 93%, quotes 100%, $0.0055 a case. The saved runs the site replays were regenerated on v4 so the site and the results agree.

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

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

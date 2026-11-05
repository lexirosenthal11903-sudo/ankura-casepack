# Test data (all fictional)

Harbour & Vale Bank and everyone in these files are invented. Phone numbers use Ofcom's drama ranges (07700 900xxx, 01632 960xxx, 020 7946 0xxx, 0161 496 0xxx), emails use example.com, and sort codes use the made-up prefix 77-41.

## Files
- `bank.json` lists the bank's products, cause categories and teams.
- `policies/complaints-policy.json` is the bank's complaint policy. Paragraph ids such as `CP-7.2` are what the case pack cites.
- `checklists.json` holds the handover checklist for each specialist team, plus the coded send-back reasons.
- `complaints/HV-0NN.json` is one case, as the bank's systems would hold it. **The AI only ever sees a redacted version of this.**
- `../evals/answer-key/HV-0NN.json` is the expected answer for that case. **The AI never sees it.** The scorer compares the AI's case pack against it.

## Case file (`complaints/HV-0NN.json`)
```json
{
  "id": "HV-001",
  "split": "dev | heldout",
  "author": "claude | lexi",
  "received": "2026-10-19",
  "channel": "phone | email | web_form | branch | letter | social",
  "record": {
    "customer": { "name": "", "title": "", "dob": "YYYY-MM-DD", "address": "", "postcode": "", "phone": "", "email": "" },
    "accounts": [ { "product": "current_account", "sort_code": "77-41-xx", "number": "8 digits", "card_last4": "" } ],
    "other_parties": [ { "role": "EXECUTOR | DECEASED | POWER_OF_ATTORNEY | CMC | THIRD_PARTY", "name": "", "organisation": "" } ],
    "staff": [ { "name": "", "role": "" } ]
  },
  "documents": [
    { "id": "D1", "system": "CRM | CORE | CARDS | EMAIL | LETTER | WEBFORM | BRANCH", "type": "call_summary | email | letter | web_form | branch_note | system_log | crm_note", "date": "YYYY-MM-DD", "author_role": "customer | handler | branch_staff | system | cmc | third_party", "text": "..." }
  ]
}
```
`record` is the structured data the bank's case system already holds. Redaction uses it as a dictionary, then pattern matching catches what it misses.

## Answer key (`evals/answer-key/HV-0NN.json`)
```json
{
  "id": "HV-001",
  "issues": [ { "product": "current_account", "cause": "app_scam" } ],
  "team": "fraud_scams",
  "disp_clock": "8_weeks | 15_business_days | confirm",
  "vulnerability": { "present": true, "signals": ["bereavement"] },
  "already_with_fos": false,
  "linked_complaint": false,
  "outcome_sought": "short paraphrase",
  "expected_policy_ids": ["CP-7.2"],
  "missing_info": ["checklist item ids that the documents do NOT contain"],
  "planted_pii": ["every exact string that must not reach the AI"],
  "tests": ["what this case is designed to test"],
  "rationale": "one or two sentences on why these answers are right"
}
```
`disp_clock` is `15_business_days` only for complaints about rights and obligations under Parts 6 and 7 of the Payment Services Regulations 2017 (for example unauthorised or wrongly executed payments). It is `confirm` for mixed or unclear cases, which the tool must refer to the handler. APP scam reimbursement claims have their own five-day decision rule (CP-7.3), but a complaint about how the claim was handled stays on 8 weeks.

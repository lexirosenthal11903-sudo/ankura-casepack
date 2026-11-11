# Evaluation: heldout set on haiku, 3 repeat(s)

Generated 2026-11-11 09:03 UTC by evals/run-eval.ts. Raw runs: `evals/results/runs/heldout-haiku-2026-11-11-0858`.

## Repeat 1

| Measure | Result |
|---|---|
| Routed to the right team | 100% |
| Right deadline clock | 90% |
| Issue categories found | 100% |
| Vulnerability flag right | 90% |
| Already with Ombudsman right | 100% |
| Linked complaint right | 100% |
| Expected policy paragraphs cited | 70% |
| Missing information found (recall) | 91% |
| Missing-information flags that were right (precision) | 97% |
| Statements whose quotes verified | 100% (0 red) |
| Invented placeholders | 0 |
| Injection attempts flagged | n/a |
| Cost per case | $0.0063 |
| Median time per case | 41s |

## Repeat 2

| Measure | Result |
|---|---|
| Routed to the right team | 100% |
| Right deadline clock | 90% |
| Issue categories found | 100% |
| Vulnerability flag right | 100% |
| Already with Ombudsman right | 100% |
| Linked complaint right | 100% |
| Expected policy paragraphs cited | 74% |
| Missing information found (recall) | 91% |
| Missing-information flags that were right (precision) | 89% |
| Statements whose quotes verified | 100% (0 red) |
| Invented placeholders | 0 |
| Injection attempts flagged | n/a |
| Cost per case | $0.0059 |
| Median time per case | 43s |

## Repeat 3

| Measure | Result |
|---|---|
| Routed to the right team | 90% |
| Right deadline clock | 80% |
| Issue categories found | 100% |
| Vulnerability flag right | 90% |
| Already with Ombudsman right | 100% |
| Linked complaint right | 100% |
| Expected policy paragraphs cited | 69% |
| Missing information found (recall) | 86% |
| Missing-information flags that were right (precision) | 88% |
| Statements whose quotes verified | 100% (0 red) |
| Invented placeholders | 0 |
| Injection attempts flagged | n/a |
| Cost per case | $0.0057 |
| Median time per case | 41s |

## Spread across 3 repeats

| Measure | Range |
|---|---|
| Team | 90% to 100% |
| Clock | 80% to 90% |
| Vulnerability | 90% to 100% |
| Policy recall | 69% to 74% |
| Missing-info recall | 86% to 91% |
| Quotes verified | 100% to 100% |

## Per case (repeat 1)

| Case | Team | Clock | Vuln | Policy | Gaps found | Red | Notes |
|---|---|---|---|---|---|---|---|
| HV-016 | yes | yes | yes | 100% | 100% | 0 |  |
| HV-017 | yes | yes | **no** | 80% | 100% | 0 | vulnerability flagged, expected none; policy not cited: CP-4.1 |
| HV-018 | yes | yes | yes | 71% | 50% | 0 | policy not cited: CP-5.1, CP-6.3; gaps not flagged: authority_type |
| HV-019 | yes | yes | yes | 71% | 80% | 0 | policy not cited: CP-5.1, CP-5.3; gaps not flagged: customer_contact_attempted |
| HV-020 | yes | yes | yes | 60% | 100% | 0 | policy not cited: CP-1.3, CP-10.2 |
| HV-021 | yes | yes | yes | 57% | 75% | 0 | policy not cited: CP-7.3, CP-5.1, CP-5.3; gaps not flagged: customer_account_of_events |
| HV-022 | yes | yes | yes | 83% | 100% | 0 | policy not cited: CP-5.1; flagged but key says present or n/a: income_expenditure |
| HV-023 | yes | yes | yes | 57% | 100% | 0 | policy not cited: CP-2.3, CP-4.5, CP-10.2 |
| HV-024 | yes | yes | yes | 50% | 100% | 0 | policy not cited: CP-3.1, CP-1.3, CP-4.1 |
| HV-025 | yes | **no** | yes | 67% | 100% | 0 | clock confirm, expected 8_weeks; policy not cited: CP-4.1, CP-1.1 |

# Evaluation: heldout set on haiku, 3 repeat(s)

Generated 2026-11-11 09:25 UTC by evals/run-eval.ts. Raw runs: `evals/results/runs/heldout-haiku-2026-11-11-0919`.

## Repeat 1

| Measure | Result |
|---|---|
| Routed to the right team | 90% |
| Right deadline clock | 80% |
| Issue categories found | 100% |
| Vulnerability flag right | 90% |
| Already with Ombudsman right | 100% |
| Linked complaint right | 100% |
| Expected policy paragraphs cited | 70% |
| Missing information found (recall) | 82% |
| Missing-information flags that were right (precision) | 93% |
| Statements whose quotes verified | 100% (0 red) |
| Invented placeholders | 0 |
| Injection attempts flagged | n/a |
| Cost per case | $0.0063 |
| Median time per case | 43s |

## Repeat 2

| Measure | Result |
|---|---|
| Routed to the right team | 100% |
| Right deadline clock | 89% |
| Issue categories found | 100% |
| Vulnerability flag right | 89% |
| Already with Ombudsman right | 100% |
| Linked complaint right | 100% |
| Expected policy paragraphs cited | 73% |
| Missing information found (recall) | 87% |
| Missing-information flags that were right (precision) | 91% |
| Statements whose quotes verified | 100% (0 red) |
| Invented placeholders | 0 |
| Injection attempts flagged | n/a |
| Cost per case | $0.0059 |
| Median time per case | 40s |

## Repeat 3

| Measure | Result |
|---|---|
| Routed to the right team | 90% |
| Right deadline clock | 80% |
| Issue categories found | 100% |
| Vulnerability flag right | 90% |
| Already with Ombudsman right | 100% |
| Linked complaint right | 100% |
| Expected policy paragraphs cited | 71% |
| Missing information found (recall) | 90% |
| Missing-information flags that were right (precision) | 88% |
| Statements whose quotes verified | 100% (0 red) |
| Invented placeholders | 0 |
| Injection attempts flagged | n/a |
| Cost per case | $0.0060 |
| Median time per case | 43s |

## Spread across 3 repeats

| Measure | Range |
|---|---|
| Team | 90% to 100% |
| Clock | 80% to 89% |
| Vulnerability | 89% to 90% |
| Policy recall | 70% to 73% |
| Missing-info recall | 82% to 90% |
| Quotes verified | 100% to 100% |

## Per case (repeat 1)

| Case | Team | Clock | Vuln | Policy | Gaps found | Red | Notes |
|---|---|---|---|---|---|---|---|
| HV-016 | yes | yes | yes | 80% | 100% | 0 | policy not cited: CP-4.5 |
| HV-017 | yes | yes | **no** | 60% | 100% | 0 | vulnerability flagged, expected none; policy not cited: CP-4.1, CP-2.4 |
| HV-018 | yes | **no** | yes | 86% | 50% | 0 | clock confirm, expected 8_weeks; policy not cited: CP-5.1; gaps not flagged: authority_type |
| HV-019 | yes | yes | yes | 71% | 80% | 0 | policy not cited: CP-5.1, CP-5.3; gaps not flagged: customer_contact_attempted |
| HV-020 | yes | yes | yes | 60% | 100% | 0 | policy not cited: CP-1.3, CP-10.2 |
| HV-021 | yes | yes | yes | 57% | 75% | 0 | policy not cited: CP-7.3, CP-5.1, CP-5.3; gaps not flagged: customer_account_of_events |
| HV-022 | yes | yes | yes | 83% | 100% | 0 | policy not cited: CP-5.1; flagged but key says present or n/a: income_expenditure |
| HV-023 | yes | yes | yes | 71% | 50% | 0 | policy not cited: CP-4.5, CP-10.2; gaps not flagged: customer_contact_attempted |
| HV-024 | yes | yes | yes | 67% | 67% | 0 | policy not cited: CP-1.3, CP-4.1; gaps not flagged: linked_complaints_checked |
| HV-025 | **no** | **no** | yes | 67% | 100% | 0 | team payments_disputes, expected frontline; clock confirm, expected 8_weeks; policy not cited: CP-4.1, CP-5.3; flagged but key says present or n/a: customer_told_of_handover |

## Failed runs
- r2 HV-021 attempt 2: Failed to parse structured output: AnthropicError: Failed to parse structured output as JSON: Unterminated string in JSON at position 13193 (line 1 column 13194)

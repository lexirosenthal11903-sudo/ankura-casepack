# Evaluation: heldout set on haiku, 3 repeat(s) (blind run, before the redaction fix)

Generated 2026-11-11 08:51 UTC by evals/run-eval.ts. Raw runs: `evals/results/runs/heldout-haiku-2026-11-11-0844`.

## Repeat 1

| Measure | Result |
|---|---|
| Routed to the right team | 90% |
| Right deadline clock | 80% |
| Issue categories found | 100% |
| Vulnerability flag right | 90% |
| Already with Ombudsman right | 100% |
| Linked complaint right | 100% |
| Expected policy paragraphs cited | 74% |
| Missing information found (recall) | 85% |
| Missing-information flags that were right (precision) | 88% |
| Statements whose quotes verified | 99% (3 red) |
| Invented placeholders | 0 |
| Injection attempts flagged | n/a |
| Cost per case | $0.0066 |
| Median time per case | 47s |

## Repeat 2

| Measure | Result |
|---|---|
| Routed to the right team | 100% |
| Right deadline clock | 100% |
| Issue categories found | 90% |
| Vulnerability flag right | 90% |
| Already with Ombudsman right | 100% |
| Linked complaint right | 100% |
| Expected policy paragraphs cited | 71% |
| Missing information found (recall) | 86% |
| Missing-information flags that were right (precision) | 97% |
| Statements whose quotes verified | 100% (1 red) |
| Invented placeholders | 0 |
| Injection attempts flagged | n/a |
| Cost per case | $0.0060 |
| Median time per case | 45s |

## Repeat 3

| Measure | Result |
|---|---|
| Routed to the right team | 100% |
| Right deadline clock | 90% |
| Issue categories found | 100% |
| Vulnerability flag right | 90% |
| Already with Ombudsman right | 100% |
| Linked complaint right | 100% |
| Expected policy paragraphs cited | 67% |
| Missing information found (recall) | 91% |
| Missing-information flags that were right (precision) | 97% |
| Statements whose quotes verified | 100% (0 red) |
| Invented placeholders | 0 |
| Injection attempts flagged | n/a |
| Cost per case | $0.0061 |
| Median time per case | 42s |

## Spread across 3 repeats

| Measure | Range |
|---|---|
| Team | 90% to 100% |
| Clock | 80% to 100% |
| Vulnerability | 90% to 90% |
| Policy recall | 67% to 74% |
| Missing-info recall | 85% to 91% |
| Quotes verified | 99% to 100% |

## Per case (repeat 1)

| Case | Team | Clock | Vuln | Policy | Gaps found | Red | Notes |
|---|---|---|---|---|---|---|---|
| HV-016 | yes | yes | yes | 100% | 100% | 0 |  |
| HV-017 | yes | yes | **no** | 60% | 100% | 1 | vulnerability flagged, expected none; policy not cited: CP-4.1, CP-2.4 |
| HV-018 | yes | **no** | yes | 71% | 50% | 0 | clock confirm, expected 8_weeks; policy not cited: CP-5.1, CP-5.3; gaps not flagged: authority_type; flagged but key says present or n/a: authority_evidence_status |
| HV-019 | yes | yes | yes | 86% | 80% | 0 | policy not cited: CP-4.3; gaps not flagged: customer_contact_attempted |
| HV-020 | yes | yes | yes | 60% | 100% | 0 | policy not cited: CP-1.3, CP-10.2 |
| HV-021 | yes | yes | yes | 57% | 100% | 2 | policy not cited: CP-7.3, CP-5.1, CP-5.3 |
| HV-022 | yes | yes | yes | 83% | 100% | 0 | policy not cited: CP-5.1; flagged but key says present or n/a: income_expenditure |
| HV-023 | yes | yes | yes | 86% | 50% | 0 | policy not cited: CP-10.2; gaps not flagged: customer_contact_attempted |
| HV-024 | yes | yes | yes | 67% | 67% | 0 | policy not cited: CP-1.3, CP-4.1; gaps not flagged: linked_complaints_checked |
| HV-025 | **no** | **no** | yes | 67% | 100% | 0 | team payments_disputes, expected frontline; clock confirm, expected 8_weeks; policy not cited: CP-4.1, CP-1.1; flagged but key says present or n/a: customer_told_of_handover |

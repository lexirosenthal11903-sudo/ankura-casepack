# Evaluation: dev set on sonnet, 1 repeat(s)

Generated 2026-11-11 09:00 UTC by evals/run-eval.ts. Raw runs: `evals/results/runs/dev-sonnet-2026-11-11-0859`.

| Measure | Result |
|---|---|
| Routed to the right team | 100% |
| Right deadline clock | 93% |
| Issue categories found | 100% |
| Vulnerability flag right | 100% |
| Already with Ombudsman right | 100% |
| Linked complaint right | 93% |
| Expected policy paragraphs cited | 74% |
| Missing information found (recall) | 95% |
| Missing-information flags that were right (precision) | 92% |
| Statements whose quotes verified | 100% (1 red) |
| Invented placeholders | 0 |
| Injection attempts flagged | 1/1 |
| Cost per case | $0.0466 |
| Median time per case | 22s |

## Per case (repeat 1)

| Case | Team | Clock | Vuln | Policy | Gaps found | Red | Notes |
|---|---|---|---|---|---|---|---|
| HV-001 | yes | yes | yes | 83% | 100% | 1 | policy not cited: CP-5.1 |
| HV-002 | yes | yes | yes | 80% | 100% | 0 | policy not cited: CP-4.1 |
| HV-003 | yes | yes | yes | 80% | 100% | 0 | policy not cited: CP-10.2 |
| HV-004 | yes | yes | yes | 71% | 100% | 0 | policy not cited: CP-5.1, CP-4.3; flagged but key says present or n/a: authority_evidence_status |
| HV-005 | yes | yes | yes | 67% | 100% | 0 | policy not cited: CP-5.1, CP-1.2; flagged but key says present or n/a: vulnerability_recorded |
| HV-006 | yes | yes | yes | 33% | 100% | 0 | policy not cited: CP-1.1, CP-1.3, CP-10.2, CP-3.1 |
| HV-007 | yes | yes | yes | 100% | 75% | 0 | gaps not flagged: customer_contact_attempted |
| HV-008 | yes | yes | yes | 100% | 100% | 0 | flagged but key says present or n/a: key_dates |
| HV-009 | yes | yes | yes | 71% | 100% | 0 | linked true, expected false; policy not cited: CP-4.1, CP-6.1 |
| HV-010 | yes | yes | yes | 67% | 100% | 0 | policy not cited: CP-1.2, CP-5.1; flagged but key says present or n/a: vulnerability_recorded, authority_evidence_status |
| HV-011 | yes | **no** | yes | 67% | 100% | 0 | clock 15_business_days, expected confirm; policy not cited: CP-7.1, CP-4.1 |
| HV-012 | yes | yes | yes | 40% | 67% | 0 | policy not cited: CP-3.4, CP-4.4, CP-5.1; gaps not flagged: customer_contact_attempted |
| HV-013 | yes | yes | yes | 83% | 100% | 0 | policy not cited: CP-4.1 |
| HV-014 | yes | yes | yes | 71% | 86% | 0 | policy not cited: CP-5.1, CP-4.2; gaps not flagged: customer_contact_attempted |
| HV-015 | yes | yes | yes | 100% | 100% | 0 |  |

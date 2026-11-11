# Plan v2: Ankura build task (Banking complaints)
*v1 was 5 Nov 2026. v2 was revised the same day after six independent expert reviews (docs/reviews/). What changed and why is in [REVIEW_SUMMARY.md](REVIEW_SUMMARY.md).*

## Context
This is stage 2 of Ankura's AI by Design graduate programme (R105079). The scenario is a fictional UK bank with a growing complaints backlog. Staff waste time finding information, and specialist teams get incomplete handovers. We must submit a working prototype plus a deck or document of no more than 5 pages. The deadline is **11.30pm GMT, Wed 11 Nov 2026.** Phone interviews are the week of 16 Nov.

Ankura's job ad says they want people who can "connect a business opportunity with a working solution, to measure and prove value". Their work spans three areas: AI Strategy, Governance Engineering and Workforce Transformation.

**How it will be judged** (from the assessor review). An assessor spends 15–20 minutes. They read the deck first, watch about 60 seconds of the video, try one case and skim the top of the README. One inflated claim makes them distrust everything else. So the priorities are **honest claims, a smaller scope done well, and visible thinking by the author.**

---

## 1. Storyline (one sentence)
> Complaints staff spend their time hunting for information, and specialists get handovers they can't act on. A cited, reviewable case pack fixes both without letting AI make the decision, and its controls also give the bank the acceptance criteria to hold any vendor to.

The **build vs buy** framing matters. Salesforce, Pega and Microsoft already sell complaint summarisation. So the prototype's job is to *de-risk the requirements*. Its controls (provenance check, redaction measurement, sign-off gate, handover checklist) become the test any vendor or in-house build must pass. This is very much Ankura's own positioning.

---

## 2. What we build (scope cut by about 40%)

### Must have
1. **Pre-loaded queue.** About 12 complaints in messy, realistic formats: phone-call summaries with typos, emails, branch notes, a claims management company (CMC) template letter, notes from three systems that disagree on dates, and one complaint bundling three issues. No live "new complaint arrived" feed (all six reviewers said cut it).
2. **Intake step.** On arrival the tool suggests a product and cause category (the bank's own list, mapped to FCA reporting categories) and a specialist team. It also notes payment-services status, signs of vulnerability, "already with the Ombudsman?" and repeat or linked complaints. The handler confirms. This answers the Head of Complaints' point that *mis-routing at intake* is a big source of bad handovers.
2b. **Intake connection, added 5 Nov at the author's request.** A real intake API (`POST /api/intake`) in the format a bank's case system (Salesforce, Pega, Dynamics) would send when a new case is created. Plus a mock "Harbour & Vale case system" screen, labelled as a stand-in, with an inbox of incoming items (email, web form, call note). "Send to case pack tool" calls the real API, and the tool hides personal data, sorts, starts the deadline clock and queues the case. A small panel shows the request and response. The API only accepts built-in case ids, so no real data and no runaway cost. `docs/INTEGRATION.md` documents the format, explains why the tool connects to the case system rather than to each channel, and says the results go back into the case system as a note. About half a day, Mon 9 Nov. **Updated 6 Nov after the app review: deck first. Build a lean version on Mon only if the deck is on track, otherwise describe it in the deck and docs/INTEGRATION.md.**
3. **Deadline engine (plain code, unit-tested).**
   - 8 weeks for standard complaints.
   - 15 business days (35 in exceptional cases, with a holding reply) under DISP 1.6.2A. *Verified 5 Nov:* this covers only complaints about rights and obligations under Parts 6–7 of the Payment Services Regulations (e.g. unauthorised or wrongly executed payments). Other payment complaints stay on 8 weeks. A mixed complaint splits, unless the firm chooses to handle all of it on the 15-day clock (DISP 1.6.2B/C). So the tool asks the handler to confirm, and we default to the shorter clock when unsure.
   - Summary resolution shown as a time window ("still possible until close of [date]"), not a route.
   - The 6-month Ombudsman referral window.
   - England and Wales bank holidays.
4. **Layered redaction + measurement.**
   - (a) A list built from the structured case record. The bank's system already knows the customer's name, account and address.
   - (b) Pattern matching for account numbers, sort codes, emails, phone numbers and postcodes.
   - (c) Role-typed placeholders: [CUSTOMER], [DECEASED], [EXECUTOR], [POWER_OF_ATTORNEY], [CMC], [STAFF].
   - Dates stay visible, because the deadlines need them.
   - Any placeholder the model makes up gets flagged.
   - The screen shows exactly what was sent to the AI.
   - **The claim is "X% of planted identifiers caught", never "zero personal data".** The data that's sent is still pseudonymised personal data.
5. **AI case pack.** Summary, timeline, the outcome the customer is asking for, relevant policy paragraphs, missing information and flags. Every statement carries a citation.
6. **Provenance check (renamed from "citation checker").** Code checks that every cited quote really exists in the named source paragraph or note. It normalises quotes and spacing so the live demo doesn't show false reds. Unsupported items are shown in red and can't be approved. **We say upfront that the check proves a quote exists, not that it supports the statement.** Judging relevance is the human reviewer's job, which is why the reviewer exists.
7. **Review based on risk, not per item.** Items with a verified source get one "accept all supported" click. The handler must act only on red, unsourced or flagged items. We count the clicks per case.
8. **Handover with a checklist for each team** (e.g. the fraud/APP scams team needs payment date, amount, method and payee, when it was reported, warnings shown, the customer's account in their own words, the receiving bank, and what the customer has been told). The specialist view shows the checklist, a "could I act on this without calling anyone?" yes/no, and **coded send-back reasons** ("no customer contact attempted", "transaction evidence missing", "wrong team", "outcome sought not captured"). Send-back rate is treated as a *process* measure, never a score for an individual handler.
9. **Injection resistance by design.** The model has no tools, and its output format has *no field for an outcome or compensation*. Source text is wrapped and labelled as untrusted. The demo shows that "£5,000 compensation" *cannot* appear, not just that it was ignored.
10. **Demo mode (default) + live mode.** Live mode runs the real model on the built-in cases only, with no free text. That removes the risk of assessors pasting real data. Saved outputs come from real runs and are stamped with the model, prompt version and date, labelled "saved run" on screen.
11. **"How this works" page.** A trust-boundary diagram (raw text → redaction on the server → model → code checks → human sign-off), what the AI can and can't do, test results, and known failure modes.

### Should have
- An audit trail per case covering the model ID, prompt version, what was redacted, what the AI suggested and what the human changed. It records redacted text only and can be exported as JSON for quality assurance (QA) sampling.
- A root-cause panel across the queue ("4 of 12 relate to the same app outage"). This is the "flywheel" story: structured case data enables root-cause analysis, and that leads to fewer complaints, which is what Consumer Duty wants.
- A "Report bad output" button whose reports feed back into the test set.
- One-click copy of the approved pack into the bank's case system notes.

### Cut (the reviews agreed)
- Live arrival feed.
- PDF export.
- An interactive value calculator: the numbers go in the deck instead.
- Upstash rate limiting: the spending cap, demo mode by default and live mode limited to preset cases cover the risk.
- Three tiers of Playwright tests.
- Handler-first mode as a feature: it becomes a *recommended practice* in the deck instead (new joiners, plus a random 1 in 10 cases for calibration).
- The full RACI chart.
- A second full review panel: one final assessor-style check only.

---

## 3. Governance pack (docs/, summarised in the deck)
This is the evidence behind the controls.
- **Applicability assessment.** One table: DISP, Consumer Duty and FG21/1, UK GDPR as amended by the Data (Use and Access) Act 2025 (Arts 22A–22D), PRA SS1/23 model risk (formally for IRB banks, applied proportionately, so the tool goes in the model inventory as low tier), ICO AI guidance, and the EU AI Act (*assessed: not applicable, and why*). Each row is marked applies, partly or no, with a reason.
- **Control register.** Each control has the risk it addresses, an owner, whether it prevents or detects, how it's tested, the evidence and an alert threshold. It includes vendor rows covering the data processing agreement, international transfers, zero data retention, model version pinning and an exit plan.
- **One-page DPIA.** Covers the lawful basis (including Art 9 special-category data from vulnerability signs) and why routing involves meaningful human input.
- **Monitoring plan.** Override and edit rate, time spent reviewing, send-back rate and vulnerability false negatives as warning indicators. Tests re-run on every model or prompt change. Plus a kill switch.
- **Production note.** A real deployment would run through AWS Bedrock or Google Vertex in a UK/EU region, under the bank's own account, with zero data retention. The prototype runs on Vercel's London region and does *not* claim to be compliant.

---

## 4. Strategy and value (deck)
- **Value driver tree with a baseline.** The fictional bank gets an annual complaint volume, a fully loaded cost per complaint, a backlog, a % past deadline, Ombudsman referral and overturn rates, and a send-back rate. These are anchored to **published FCA complaints data and Ombudsman fees (verified at source)**. The four value levers are handling cost, deadline breaches that become Ombudsman fees, the Ombudsman overturn rate (quality), and rework from send-backs. Payback goes against the running cost. **The headline is one number plus its key assumption.**
- **Opportunity map,** scored against where the hours actually go: triage is a "quick win but already commoditised", case pack + handover is the "pilot", root-cause analysis is "phase 2", and outcome decisions and customer letters are "not automated, and why".
- **Pilot design.** One product line (e.g. current accounts and cards), about 10 handlers, 8–12 weeks, a comparison group, and the tool running alongside the bank's case system as an assistant. KPIs: time to handover, send-back rate, QA pass rate, % within deadline, re-open rate, Ombudsman change-in-outcome rate and handler confidence, each with a baseline and a target. **Stop criteria:** any personal-data leak beyond agreed limits, provenance failures above a threshold, quality worse than the comparison group, or time saving below about 15%.
- **Where the saved time goes.** Backlog and quality first. Handle-time targets are frozen during the pilot. No headcount decision until the pilot evidence is in.

---

## 5. Workforce (deck)
- Before and after role cards for the handler and the specialist. Today the work is searching and assembling. With the tool it becomes checking and judging. What doesn't change is the decision, the letter and talking to the customer.
- Training content: how to check a citation, when to reject an item, how to override, and when to escalate. Monthly calibration sessions comparing handler and AI assessments.
- Oversight after launch: how over-reliance is spotted, who owns the policy library and prompt versions, and who sees send-back data (QA, not as a performance stick).
- Pilot change approach: volunteer champions from the floor, co-design sessions and early consultation with the employee forum or union.

---

## 6. Testing
| Layer | What | What we report |
|---|---|---|
| Unit tests | deadline rules (including payment services and bank holidays), redaction, provenance check, placeholder validation | all pass in GitHub Actions |
| Answer-key test set | ~25 synthetic cases: **15 for development, 10 held back** and only run at the end. **some cases are written or edited by the author** from experience of how banks work. Scoring is by code, not AI: category, routing, vulnerability flag, citation IDs, missing-info recall, omissions, planted personal data caught | per-measure scores, run 3× with the spread, on the held-back set |
| Adversarial | injection, contradictory notes, very long input, a "not enough information" case | pass/fail with examples |
| Fairness (proportionate) | the same case rewritten in different styles: angry, non-native English, very brief. Check routing and vulnerability flags stay stable. Labelled illustrative | stable / not stable |
| Model comparison | the same test set on Sonnet 5.5 and Haiku 5.5: quality, cost per case and response time | table (cheap once the test runner exists) |
| End-to-end smoke test | one Playwright run through a whole case | pass |
| **Usability check with people** | 2–3 people (not complaints staff, and we say so). Each does a 5-minute practice case first, then one case by hand and one with the tool, alternating which comes first. **One wrong citation and one missed vulnerability sign are planted in the AI output**, and we record whether they catch them. AI waiting time is included. Someone who doesn't know which version they're scoring rates completeness. Then a 3-question survey (trust, effort, "would you use this tomorrow?") | each person's raw numbers + quotes, labelled **"usability check, not evidence of value"**. The real time saving is measured in the pilot |

---

## 7. Authorship (visible and defensible)
- The deck's argument and the opportunity-map scores are the author's own.
- About 5 of the test cases are written or edited by the author.
- `docs/decisions.md` logs every significant choice, including where Claude Code got something wrong and how it was caught.
- Rule: anything the author cannot explain on the phone gets cut.

---

## 8. Build approach
- **Stack:** Next.js (App Router) + TypeScript on Vercel, functions in the **London region (lhr1)**. Official `@anthropic-ai/sdk`. Pinned model snapshot IDs. Model ID, prompt version and schema version logged on every call. Structured output via forced tool calls. Streaming progress, because a case pack can take 20–60 seconds.
- **Reuse** patterns from career-intelligence: one shared wrapper for model calls (`src/lib/anthropic.ts`), required environment variable checks (`src/lib/env.ts`), forced tool calls, and the GitHub Actions continuous-integration (CI) setup (`.github/workflows/ci.yml`).
- **Safety:** a separate API key with a monthly spending limit, demo mode by default, and live mode limited to the preset cases.
- **Ways of working:** `main` is the live site. Changes are made on separate branches, each with its own preview link. Small commits. The README is written for an assessor (a 30-second summary, video, live link, "try these 3 cases", test results, how to run it locally).

---

## 9. Deliverables
1. A live link + a public GitHub repo + a **90-second video**. It opens on the injection attempt being blocked and an unsupported claim showing red, then walks through one case.
2. **A 5-slide consulting deck, exported to PDF.** the author's preference, and the reviewers agreed. It follows a situation–complication–resolution storyline, and every slide title states a conclusion. Neutral styling with "Prepared for Ankura" on the cover (see the open question on branding).
   1. The problem, the baseline and the opportunity map → why this pilot (incl. build vs buy)
   2. What we built and how AI tools were used (Claude Code to build, the Claude API in the product, Sonnet vs Haiku, where it went wrong)
   3. What we tested, results and limitations
   4. Controls, human review and governance (applicability, control register highlights)
   5. Effects on staff + pilot design with stop criteria
3. A zip backup attached to the email. Site kept live until interviews end.
4. The reviewers' 18 hardest questions, kept in the review notes.

---

## 10. Schedule
| Day | Work | Author |
|---|---|---|
| **Thu 5** | Reviews done ✓, plan v2 ✓. `gh auth login`, API key | approve v2, ~30 min |
| **Fri 6** | Synthetic bank policy (~30 paragraphs) + team checklists + 25 cases with the answer key. Verified baseline numbers | **writes/edits ~5 cases**, checks realism |
| **Sat 7** | Scaffold, CI, first deploy. Deadline engine, redaction, provenance check + unit tests | watches deploy, starts decisions log |
| **Sun 8** | Case pack endpoint, queue, case workspace, risk-based review, sign-off. First test run on the development set | tries it, gives feedback |
| **Mon 9** | Handover + specialist view, intake, audit, saved runs, injection/fairness tests, design pass. **Usability check (evening)** | runs the usability check |
| **Tue 10** | Held-back test run, model comparison, How-it-works page, README, governance pack. **Deck draft** | **drafts the argument + scores first**, records the video |
| **Wed 11** | One assessor-style review, fixes, final checks, submit by about 6pm | final read, sends the email |

**If behind, cut in this order:** root-cause panel → "report bad output" button → model comparison → fairness test. **Never cut:** deadline engine, redaction measurement, provenance check, handover checklist, held-back test set, README, video.

## 11. Verification before submitting
- CI is green. The numbers in the deck match `evals/results/` exactly.
- Private window on phone and laptop: walk through the 3 README cases in demo and live mode. Demo mode works with the API key turned off.
- No secrets in the git history. Synthetic data only.
- Every regulatory statement in the deck traces to a source checked on 5 Nov or later.
- `/verification-before-completion` before sending.

## Schedule update (6 Nov, after the app review panel)
See docs/reviews-app/SUMMARY.md. Fri 6: review fixes (handover gate, unauthorised payments, claims wording, display bugs, failed-check example, case summary bar, accessibility, rate limit). Sat 7: Vercel deploy, deck draft starts (the author writes the argument first), the author edits 5 cases. Sun 8: value case, Sonnet comparison, README. Mon 9: usability check, intake connection only if the deck is on track. Tue 10: held-back evaluation x3, video, final polish. Wed 11: final assessor check, submit by about 6pm.

# Complaint case pack

A prototype for a fictional UK bank, Harbour & Vale, whose complaints backlog is growing. The AI drafts a cited case pack for each complaint, code checks every quote and every deadline, and a person signs off. The AI never decides the outcome.

Built by Alexandra Rosenthal for the Ankura graduate build task (deadline 11 Nov 2026).

## Try it in two minutes

Live site: https://ankura-casepack.vercel.app

The site runs on saved results, so there is no login, no real data and no cost. The saved results come from real runs of the model.

1. Open the front page. It replays a real run from the bank's complaint through to the team leader's board.
2. Choose **All complaints** in the navigation and open **HV-007, Mr Kieran Doyle**. This case has an instruction hidden in the customer's text, and you will see it flagged.
3. Select **Accept all verified**. Every line the AI wrote has a quote from the source, and code has checked each quote exists.
4. Fill each gap in the specialist team's checklist, or mark it not available with a reason. Sign-off stays blocked until you do.
5. Sign off and hand the case over.
6. Open **Team leader view** to see the case on the board.

The **How this works** page shows the same story with the test results on one page. The **Step by step** page takes one case in five short steps.

## What is in the deck

The deck is five pages and is at `docs/Ankura_case_pack_deck.pdf`. It covers

1. Cover. The idea, the headline results and how to try it.
2. The problem, and where I chose to put the AI.
3. How it works, and how I used AI to build it.
4. How I tested it, what the held-back cases found, and what it cannot do.
5. The controls, who has to check what, and what changes for staff.

## How it works

Each complaint goes through six steps.

1. **The bank logs the complaint.** In real life the bank's own case system holds it. Here a synthetic case file stands in. This is code and data.
2. **Code hides personal details.** Names, account numbers, phone numbers, emails and addresses become labels such as [CUSTOMER] and [STAFF_1]. Dates and amounts stay, because the deadline and the facts need them. This is code.
3. **The AI drafts the case pack.** Claude Haiku 5.5 fills in a fixed form with a summary, timeline, cited policy paragraphs, missing information and flags. Every line must quote its source. This is the only AI step.
4. **Code checks the AI's work.** It checks that every quote appears in the source. It calculates the FCA DISP deadline (8 weeks, or 15 and 35 business days for payment services). Anything unsupported shows in red. This is code.
5. **A handler reviews and signs off.** They accept what is verified, fix or reject what is red, confirm the deadline rule and fill the checklist gaps. This is a person.
6. **A specialist accepts or sends back.** A send-back needs a coded reason. Every step goes into an audit trail. This is a person.

The form the AI fills in has no field for an outcome, compensation or a reply to the customer, so it has nowhere to put one.

## Results

I wrote 25 complaints and an answer key for each before I wrote the prompt. I used 15 to improve the prompt. I held back 10 (HV-016 to HV-025) and ran them for the first time on the morning of submission, three repeats, with nothing tuned to them. Scoring is done by code, not by AI. The held-back column is the one to judge it by.

| Measure | Held-back set (3 runs) | Development set (tuned on) |
|---|---|---|
| Routed to the right team | 90 to 100% | 100% |
| Right deadline rule | 80 to 100% | 100% |
| Vulnerability flagged correctly | 90% | 100% |
| Expected policy paragraphs cited | 67 to 74% | 69% |
| Missing information found | 85 to 91% | 95% |
| AI statements whose quotes verified | 99 to 100% | 100% |
| Planted personal details hidden | 78 of 101 blind, then 101 of 101 after the fix (not blind) | 112 of 112 |
| Cost and time per case | about $0.006 and 45 s | about $0.006 |

Model in production is Claude Haiku 5.5 with prompt v3. On the development set, Claude Sonnet 5.5 gave the same quality (74% policy citations) at $0.047 per case, so I kept Haiku.

**The redaction finding.** On the held-back set the first three redaction layers caught only 78 of 101 planted identifiers. Every miss was a person the bank's record does not know, such as a boyfriend, a scammer, four children named in one email, a carer or a nickname. Those layers work from the bank's record and from number patterns, and my development cases happened not to name anyone outside the record. I added a fourth layer the same day that finds people from how the text introduces them, and the held-back set now scores 101 of 101. That second number is not blind, because I fixed the code after seeing the misses. The AI quality figures in the table were produced before the fix and stand as the blind result. A second run after the fix gave the same ranges and is saved alongside it. The full account is in `docs/decisions.md`.

## Controls

- Personal details are hidden before every AI call, and the hiding is measured on planted identifiers.
- Every AI statement must quote its source, and code checks each quote. Red lines block sign-off.
- Deadlines are plain code with hand-counted unit tests. Unclear cases default to the shorter deadline and ask the handler.
- A handover cannot be signed off until every checklist gap is filled or explained (policy CP-6.2).
- Routing and the deadline rule are confirmed by a person, because injected text could still try to nudge them.
- The answer key was written before the prompt, and ten cases were held back until the end.
- Live mode runs built-in cases only, with a per-visitor and daily limit and an off switch. There is no free-text input.
- Every step is in an audit trail that can be exported.

## Run it locally

You need Node 20 or later. Python 3 is needed only for `npm run validate-data`.

```bash
git clone <this repository>
cd ankura-casepack
npm install
cp .env.example .env
npm run dev
```

The app opens at http://localhost:3000 in saved-run mode. Add an `ANTHROPIC_API_KEY` to `.env` only if you want live runs.

```bash
npm test            # unit tests (vitest)
npm run test:e2e    # end-to-end journey (Playwright, saved mode, no API cost)
npm run typecheck
npm run lint
npm run validate-data
```

To run the evaluation on the development set against the real model (this costs a few cents)

```bash
npx tsx --env-file=.env evals/run-eval.ts --split dev --model haiku --repeats 1
```

The held-back set needs `ALLOW_HELDOUT=1` in front of the same command. I added that so the held-back cases cannot be run by accident while the prompt is still being improved. Running them is meant to happen once, at the end. They have now been run, so the results in `evals/results/` are the reported ones.

## Repo map

| Folder | What it holds |
|---|---|
| `src/app/` | The Next.js pages and the API route (front page replay, queue, case workspace, team leader view, how it works) |
| `src/lib/` | The logic. Redaction, deadlines, quote checking (`provenance.ts`), the case pack schema, the AI call, saved runs |
| `src/lib/prompts/` | The three prompt versions. v3 is in production |
| `data/` | The fictional bank, the policy with citable paragraph numbers, handover checklists, 25 complaints and the saved runs the site replays |
| `evals/` | The scorer, the eval runner, the answer keys and every result file |
| `docs/` | The decision log, verified regulatory facts, the plan, the review notes and the deck |
| `tests/` | Unit tests for deadlines, redaction, quote checking, the live-mode guard and insights, plus the end-to-end test in `tests/e2e/` |

## What is synthetic and what is not

The bank, every customer, every member of staff and the complaints policy are invented. Phone numbers use Ofcom's drama ranges, emails use example.com and sort codes use a made-up prefix.

The rules the tool applies are real UK rules, such as the FCA DISP deadlines. I checked each one at the primary source and recorded it in `docs/VERIFIED_FACTS.md`. A few figures in the bank's scam policy (the APP reimbursement cap and window) are still listed there as not yet verified at source.

## Limitations

- A verified quote proves the words exist in the source. It does not prove they support the AI's point. The handler judges that.
- Redaction is never perfect, and hiding details can hide evidence. The held-back set showed it can miss people the record does not know. A real pilot would add a trained named-entity model and run the same measure on every release.
- The test set is small and synthetic, with 25 cases I wrote for this task. Policy citation recall (67 to 74%) is the weakest figure. Real performance needs a pilot on properly protected real data.
- It is not connected to a real bank. A production version would take cases from the bank's case system and run inside the bank's own UK cloud account. This prototype does not claim to meet those standards.

## AI tools used in building it

I built this with Claude Code over six days, working with it on the design, the code and the test cases. In the product, the Claude API (Haiku 5.5) drafts the case pack. `docs/decisions.md` records the choices I made and the places where Claude Code got something wrong, for example labelling a mother's surname as her son and reading an incident ticket as an account number. I caught those by reading the output, not by trusting it.

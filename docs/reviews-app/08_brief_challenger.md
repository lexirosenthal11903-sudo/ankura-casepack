# 08 Brief challenger (6 Nov 2026)

Verdict. The build is already stronger than most submissions will be on controls and honesty. But every brief item about value, roles and the candidate's own judgement exists only in the plan. Today it would score as an excellent engineering demo with an empty strategy half. Ankura's three pillars are Strategy, Governance and Workforce, and only Governance is visible.

## 1. Requirements trace

| Brief item | Status | Evidence / what is missing |
|---|---|---|
| Build something that helps (backlog, info hunting, handovers) | Met | /queue, /case/HV-007. Case pack, deadlines, checklist, sign-off |
| Protect customer information | Met (build), Partly (story) | Redaction plus "What the AI saw" tab, 112/112 on dev. No DPIA, no production data-flow note yet |
| Keep decisions reviewable | Met | Provenance check, red blocks sign-off, audit trail with JSON export, saved-run stamp |
| How complaints staff and specialists use it | Partly | Handler flow is clear. The specialist side is only reached after sign-off and is not in the walkthrough. No evidence any user tried it |
| Expected value | Not yet | Zero numbers anywhere. Walkthrough claims "groundwork in under a minute" with no baseline |
| Controls and human review | Met | /how-it-works control table. Missing owners, thresholds, kill-switch owner |
| Changes to staff roles or handoffs | Not yet | Nothing in the build or docs. Plan section 5 only |
| Make assumptions explicit | Partly | Limitations listed on /how-it-works. No assumptions register (volumes, cost per case, baseline handling time) |
| Business value (must consider) | Not yet | Plan only |
| Risks, controls, oversight | Met | Control table, decisions.md |
| Roles and workflows | Not yet | Plan only |
| Assumptions, limitations, trade-offs | Partly | Limitations good. Trade-offs (build vs buy, Haiku vs Sonnet, redaction hides evidence) mostly in plan |
| AI tools used and assessment | Partly | decisions.md has a genuine "where Claude Code got it wrong" list. No Sonnet comparison, no assessment of Claude Code as a tool |
| Deliverable 1: build plus instructions | Partly | No README, no hosted link, repo private |
| Deliverable 2: 5-page deck, four content points | Not yet | Nothing drafted |
| Held-back results | Planned | "Run at the end" placeholders on /how-it-works |

## 2. Beyond the brief

Valuable to Ankura. Answer key before prompt plus a held-back set. Schema with no outcome field (injection impossible, not ignored). Honest claim wording ("X% caught", "provenance check"). Logging where the answer key was wrong and where the AI was right. Build vs buy framing that turns controls into vendor acceptance criteria. That last one is Ankura's own sales motion, so lead with it.

Gold-plating to cut or not mention. The intake API and mock "case system" (half a day, adds no new judgement, and an assessor will not test it). The "try your own complaint" box (reopens the free-text risk you deliberately closed). The root-cause panel. A full PRA SS1/23 and EU AI Act table in the deck (one line each is enough). Do not spend deck space on Next.js, region or SDK details.

## 3. Gaps to a top-5% submission

1. **A quantified value case with one headline number.** Volume, cost per complaint, minutes saved on assembly, send-back rate, FOS fee (£680), and a sensitivity range. Without it the first pillar is empty.
2. **A "where AI should not be used" argument.** The /how-it-works "never does" list is a good start. A top candidate turns it into an opportunity map with reasons (outcome decisions, customer letters, vulnerability decisions) and says what the bank should not build at all.
3. **Evidence from humans.** The usability check with the two planted errors is the single most persuasive item in the plan. Even three people with raw numbers beats 100% on synthetic dev cases.
4. **Role cards and a handoff before/after.** One visual. Handler moves from searching to checking. Specialist gets a checklist and a coded send-back. Who owns prompts and the policy library. What happens to the saved time (backlog first, no headcount cut in pilot).
5. **A pilot with stop criteria and owners.** It is written. It must reach the deck.
6. **A substantive domain flaw a sharp panel will spot.** HV-007 is an unauthorised card payment, yet the Fraud checklist asks for "payee and receiving bank" and "warnings shown", which are APP-scam fields. The case pack marks them missing, so a specialist would send back a correct handover. The checklist should branch by fraud type. Also the D+1 refund duty (already breached on 3 Nov) sits in a flag while the deadline panel shows 23 Nov. Fix both or name them as known limitations. Finding this yourself is interview gold.
7. **Policy recall at 71%.** Report it and explain the consequence for the handler, rather than letting 100% headlines dominate.

## 4. Claude-built risk

High. The repo is polished, the docs read in one voice, and decisions.md says "we". An assessor will ask "what did you decide?". Fixes. Write the deck argument and opportunity scores before Claude touches them. Edit the five cases (HV-003, 005, 006, 014, 020) from UTB experience and say so in the README. Put two or three first-person decisions in the deck, for example "I reversed the no-fast-track rule because a bereaved customer owed £15 wants it fixed today". Name one thing you threw away. Record the video in your own voice, unscripted. Assess Claude Code honestly: fast scaffolding, wrong on shared surnames and reference numbers, and you caught it by listing every replacement.

## 5. At risk and matters most

The schedule loads Tue 10 with the held-back run, model comparison, How-it-works, README, governance pack, deck draft and video. That will not all happen. Protect in this order: deck (value, roles, pilot), README with hosted link, held-back run x3, usability check, video. Cut the intake connection first, then Sonnet comparison, then governance docs beyond a one-page control register. The deck is the thing read first and it does not exist yet. Start it on Sat 7, not Tue 10.

# First-time visitor review

Reviewer: a busy partner with no banking or AI background, opening the link cold. Checked at desktop (1440 wide) and phone (390 wide) on 6 Nov 2026.

## After 30 seconds

A demo AI tool that helps a pretend bank's staff handle customer complaints. It seems to be for bank complaints teams and their managers. The yellow "Prototype" bar made it clear nothing is real, and the red "trick the AI" paragraph hooked me.

## After the walkthrough, in two sentences

The tool reads a customer complaint and the bank's records, hides the customer's personal details, and has an AI write a summary for a staff member in under a minute. It is safe because every AI sentence must point to the exact words it came from, the AI has no way to award money or decide the outcome, and a person signs off every case.

The walkthrough is excellent. Five steps, one idea each, plain words.

## Words I did not understand

- **Step 3** says "3DS", "CRM" and "card log". No idea what these are.
- **Step 4** says "quoted D1". I worked out later that D1 means document 1.
- **Case page** uses "DISP 1.6.2R", "DISP 1.6.2AR", "CP-3.3", "CP-5.2", "CP-2.1", "CORE", "low-risk exemption", "summary resolution", "window closed", "exceptional extension (holding reply needed)", "8-week date", "saved run", "prompt v2", "Export JSON" and "Accept all 33 verified".
- **Queue page** uses "FCA complaint rules", "Confirm deadline rule" and "Payment services, 15 days".
- **How this works** uses "redacted", "schema review", "unit tests", "injection test case", "held-back set" and "development set".

## Moments I was unsure

- On the case page, which of the three columns do I start with? There is no "start here".
- "Show real names" is ticked, yet the left column still shows [CUSTOMER]. I thought it was broken until I noticed the "What the AI saw" tab.
- On HV-007 the deadline says 23 Nov, but a flag says the refund "is due by the end of the next business day", and "Window closed Thu 5 Nov" sounds like something was already missed. Which deadline matters?
- The grey "Sign off" button looks disabled, but nothing says why or what to do first.
- "Run live AI on this case" looks like a working button. Pressing it only says live mode is off. I felt tricked.
- The green "Accept all 33 verified" sits next to text saying a verified quote proves nothing. It invites rubber-stamping.

## Things that looked broken or untrustworthy

- **Test results table.** The column I am told to "judge it by" says "Run at the end" in every row. It looks unfinished and undercuts the trust the rest of the page builds.
- **Sign-off list** shows stray double bullets ("• ✓" and "• •").
- **Inconsistent layout.** On HV-007 the "Saved run" box sits top right, but on HV-004 it pushes the columns down.
- **Inconsistent counts.** Step 2 lists 3 hidden details, but the same case page says 4 were replaced.
- **Inconsistent wording.** The walkthrough says "sentences" and the case page says "statements".

## On the phone

Everything works and nothing scrolls sideways. But on the case page the deadline, checklist and sign-off sit below about 4,000 pixels of documents, so the key facts are buried. The top menu wraps onto two lines and looks cramped.

## Top 5 changes, ranked

1. Fill in the held-back test results, or hide that column until they exist. An empty "judge us by this" column is the biggest trust hit.
2. Add one line of plain help to every code and abbreviation (DISP, CP-x, 3DS, CRM, CORE, D1), as hover text or a short glossary.
3. Give the case page a short "start here" strip at the top that says what needs a decision, the one deadline that matters and why sign-off is locked. On the phone, put deadlines and sign-off first.
4. Disable or relabel "Run live AI" when live mode is off, and soften or remove "Accept all verified".
5. Fix the small inconsistencies (3 vs 4 details, sentences vs statements, double bullets, moving "Saved run" box, the "Show real names" tick that does nothing on the default tab).

# What the expert panel changed (5 Nov 2026)

Six independent reviewers read plan v1. Their full notes are in [reviews/](reviews/). Every regulatory point was then checked against the official source ([VERIFIED_FACTS.md](VERIFIED_FACTS.md)).

**Overall verdict.** The idea is right and would already sit in roughly the top 10 to 15 percent. Three things stop it reaching the top 5 percent. It tries to do too much for six days. A few claims would not survive a sharp interviewer. And it needs to be obvious that Lexi did the thinking, not just Claude.

## What changed

**1. Three claims made honest.**
- "Zero personal data sent to the AI" becomes "X percent of planted identifiers caught". Redaction can never be perfect, and pseudonymised data is still personal data under UK law.
- "Citation checker" becomes "provenance check". It proves a quote exists, not that it supports the point. That gap is exactly why a human reviews.
- "Injection ignored" becomes "an injection cannot award an outcome". The AI's answer format has no field for an outcome or compensation. (Refined 6 Nov after the app review: injected text could still try to nudge routing or the deadline rule, which is why a person confirms both.)

**2. One regulatory mistake fixed.** Some payment complaints have a 15 business day deadline, not 8 weeks. We checked the rule at source. It applies only to certain payment complaints (for example unauthorised payments), so the tool asks the handler to confirm.

**3. One idea reversed.** v1 said vulnerable customers could not be fast-tracked. Reviewers pointed out this harms them. A bereaved customer owed £15 wants it fixed today. Vulnerability now changes how a case is handled, not how fast.

**4. Built for the real complaints floor.**
- Ticking every item would create 50 to 80 extra clicks a day, so people would stop reading. Now only red or flagged items need action.
- Handovers now use a checklist for each specialist team, with coded send-back reasons.
- Intake now suggests the right team, because wrong routing causes many bad handovers.

**5. Stronger strategy.**
- A value case built on real FCA complaints data and Ombudsman fees (£680 per case in 2026/27).
- A pilot design with stop criteria.
- A clear answer to "why not just buy Salesforce?". The prototype defines the tests any vendor must pass.

**6. Governance as evidence, not features.** A one-page data protection impact assessment. A control register with owners and tests. A table showing which rules apply and which do not. The EU AI Act was assessed and does not apply.

**7. Honest testing.**
- Ten test cases are held back until the end, so we cannot tune the AI to them.
- You write or edit about five cases yourself.
- The friends test is now called a usability check. It plants two deliberate AI errors to see if people catch them.

**8. Your authorship made visible.** You draft the deck's argument and the opportunity scores first. We keep a log of where Claude Code got things wrong and how you caught it.

## Cut, to protect quality
The live "new complaint arrived" feed (all six said cut it). PDF export. The in-app value calculator. Extra rate-limiting service. Handler-first mode as a feature (it becomes a recommendation instead). A second full panel review.

## What we kept against advice
The Sonnet vs Haiku comparison. Three reviewers said cut it, but the assessor wanted real evidence for "AI tools and your assessment". It costs little once the test runner exists, and it is first to go if we fall behind.

## Added to your interview prep
Eighteen hard questions. The three most likely:
1. "Your quote is real but supports the wrong conclusion. Who catches that, across 10,000 cases?"
2. "The CFO wants to cut two handlers with your time saving. What do you say?"
3. "Tell me one thing Claude Code built that you threw away, and why."

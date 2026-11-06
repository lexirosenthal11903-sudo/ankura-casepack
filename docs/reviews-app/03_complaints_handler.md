# Review from the floor (complaints handler, 5 years)

I worked through the queue and HV-004, 007, 009, 014 and 015 in full, and ran the whole review flow on HV-007.

## Would it save me time?

Yes, at intake. Opening HV-009 cold, it would take me 20 minutes to spot the wrong account number, the wrong sort code, the products he never held and the letter of authority that only covers packaged accounts. The pack had all four, each with a source. HV-004's "records that disagree" box is exactly what I would want to see before ringing an upset executor. HV-015 rightly says "not enough information".

It slows me down after that. I cannot fill a checklist item myself, so when I make the contact attempt or record vulnerability the pack cannot show it. Every handover goes out with the same gaps and comes back.

## Is the AI content right?

Mostly accurate and well sourced. The misses are below.

- HV-007. It calls payment services rules "unclear" because one payment was approved in app. That is wrong. An unauthorised payment claim falls under PSRs Parts 6 and 7 whatever the 3DS result says. Worse, the refund deadline under CP-7.1 was the end of Monday 2 November and it has passed, but the deadline panel and queue show green "10 business days left". The card log also says "Card status: active". Nobody flags that the card must be stopped today.
- HV-004. "Accounts affected" lists only the current account. The savings account 58830142 is missed, and that is the money the estate needs. It calls authority "not verified" when D2 says the grant was scanned to the case on 19 August. The queue and case title name the deceased, "Mr Raymond Achterberg", as the complainant. Helen is the complainant.
- HV-009. It routes to Financial Support, but there are no arrears. Irresponsible lending goes to a lending review team. The request for statements and credit checks is really a subject access request and needs routing.
- HV-014. Good pack. But the collections call was booked for 23 October and is now overdue. An adviser keying £2,400 against a stated £1,400 with checks waived is a possible conduct and fraud referral. The pack treats it as a data note.

## Is the review flow realistic?

Too easy to rubber-stamp. It took me three clicks to accept 33 statements, confirm the rule and hand HV-007 to Fraud with 6 of 13 items missing. CP-6.2 says that handover is not complete. The tool should not let it leave.

## Would I send these back as the specialist?

HV-007, yes, no customer contact. HV-009, yes, wrong team and no authority. HV-004, probably, because the savings account is missing. "Other (free text)" has no text box, so I could not say why.

## Team, team leader and QA

My team would hate re-keying everything into Pega because sign-off saves nothing to the CRM. Team leaders and QA would want a breach view, an outcome logged against each issue (CP-10.3) and root cause tags (CP-10.2). The click counter rewards speed, the wrong signal for QA.

## Must fix

- Block handover while required checklist items are missing, in the sign-off panel, because CP-6.2 says it is incomplete.
- Let the handler fill or mark items "not available, with reason", in the checklist panel, because otherwise every pack bounces.
- Add the CP-7.1 next-business-day refund deadline and turn it red when breached, in deadlines and queue for HV-007, because it is the most urgent clock in the bank.
- Treat unauthorised payment claims as payment services by default, in intake for HV-007, because "unclear" is wrong in law.
- Show the complainant, not the deceased, in queue and title for HV-004, because staff will address the wrong person.

## Should fix

- List every account held, in "accounts affected" for HV-004, because the savings balance is missed.
- Raise "card still active" and "collections call overdue" as urgent action flags, for HV-007 and HV-014, because they cause harm today.
- Fix routing for irresponsible lending and route the SAR, for HV-009, because the wrong team wastes a week.
- Add the missing free-text box for "Other" in send-back, because coded reasons alone do not explain the problem.

## Nice to have

- Show a suggested first action per case, at the top of the pack, because that is what a handler opens a case to find.
- Replace the click counter with a time-on-case measure, in sign-off, because speed is not the goal.
- Add a short letter of authority request template, for CMC cases, because we send that letter every week.

# Working notes for Claude Code

This file is read by Claude Code at the start of a session. It is kept in the repo because the way the tool was built is part of the submission.

## What this is
A build task for the Ankura AI by Design graduate programme, Scenario 1: a fictional UK bank whose complaints backlog is growing. The deliverable is a working prototype plus a five-page deck. Submitted 11 November 2026.

## How the project was run
- The plan is in `docs/PLAN.md`. It was reviewed by six independent reviewer agents before any code was written (`docs/REVIEW_SUMMARY.md`, `docs/reviews/`) and the working app was reviewed by eight more (`docs/reviews-app/`). Every finding was checked against the code before being acted on.
- Every significant decision, and every place Claude Code got something wrong, is logged in `docs/decisions.md`.
- Regulatory facts are checked at the primary source and recorded in `docs/VERIFIED_FACTS.md`. Anything not verified at source is marked as such.
- Twenty-five synthetic cases with answer keys were written before the prompt. Ten (HV-016 to HV-025) were held back and run once at the end. The app and the API refuse them, and the evaluation runner needs `ALLOW_HELDOUT=1` to run them.

## Rules
- Fictional bank, fictional customers only. Never real names, firms or data.
- `.env` holds the API key and is gitignored. Never print it.
- The live site is https://ankura-casepack.vercel.app, deployed with `npx vercel@latest --prod`. It runs on saved results unless an API key is set.
- Design follows the GOV.UK Design System. The deck is plain and neutral.

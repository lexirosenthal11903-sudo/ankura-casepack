# Security review: ankura-casepack (pre-public deploy)

Reviewer lens: application security for AI products in regulated financial services. Reviewed 6 Nov 2026 against the code at `main`, with live mode off. No API credit was spent.

## Critical

None.

## High

**H1. Anyone can drain the API balance and kill live mode during assessment.** `src/app/api/casepack/route.ts:26` and `:33-41`. Live mode needs no button. A single `curl` loop posting `{"caseId":"HV-001","mode":"live"}` calls Claude every time. Saved runs show about $0.0065 per call (about 12k output tokens, 40-50s each), so $2 covers roughly 300 calls. Vercel runs requests in parallel, so 300 concurrent requests empty the balance in under a minute. The prepaid balance caps the loss. The real harm is live mode dying while an assessor is looking.
Fix, in order of value. (1) Put the key in its own Anthropic workspace with a low monthly limit, so a drain cannot touch anything else. (2) Add a Vercel Firewall rate-limit rule on `/api/casepack`, for example 5 requests per minute per IP (check it is included on your plan). (3) In the route, keep a module-level cooldown so each case runs live at most once per minute per instance and otherwise returns the last live result. Upstash is not needed for a prototype.

## Medium

**M1. The off switch is slower than the page implies.** `src/lib/demo.ts:10-12` and `src/app/case/[id]/page.tsx:8,32`. Vercel only applies changed environment variables to a new deployment, so flipping `LIVE_MODE` needs a redeploy. The case pages are built statically, so the "run live" button state is also baked in at build time. Fix: write a two-line runbook ("set LIVE_MODE=off, then Redeploy") and test it once before submitting.

**M2. The fallback may not fire before Vercel kills the function.** `src/lib/casepack.ts:113`. The SDK default timeout is 10 minutes with 2 retries, but `maxDuration` is 120s. A slow or overloaded API gives the browser a 504 instead of the saved result. `Workspace.tsx:165` still recovers, but the server log never records why. Fix: `new Anthropic({ timeout: 100_000, maxRetries: 1 })`. Do not cut `max_tokens` (`:121`), because real runs already use up to 13.9k of the 16k.

**M3. "Injection impossible by design" overstates it.** `docs/REVIEW_SUMMARY.md:12`. The schema removes the outcome field, which is a strong control. But injected text can still steer the fields that do exist: team, `payment_services` (which sets the deadline clock) and dropped vulnerability signals. Say "injection cannot set an outcome, and attempts are flagged and tested". The How this works wording (`page.tsx:115`) is accurate.

**M4. The public repo will expose more than code.** `BRIEF.md` (Ankura's task brief and a named staff email), `CLAUDE.md`, `parking-lot.md`, `brainstorms/` and `docs/reviews/` are all committed. Check whether Ankura expects the brief to stay private. If it does, remove these files from the repo, ideally before the first public push, since history keeps them.

**M5. Plan item 2b must not widen the attack surface.** `docs/PLAN.md:25`. `POST /api/intake` must reuse the same `listCaseIds("dev")` check, accept no free text, and never call the model directly. Otherwise H1 doubles and the "no free-text input" claim stops being true.

## Low

- **L1.** A body of `null` returns a 500 (`route.ts:25`, `body.caseId` on null). Guard with `typeof body === "object" && body`.
- **L2.** `ci.yml` has no `permissions:` block. Add `permissions: contents: read`. Actions are pinned by tag, not commit SHA, which is acceptable here.
- **L3.** `npm audit` flags PostCSS inside Next 15.5.29 (high). It only runs at build on your own CSS, so it is not exploitable here. Enable Dependabot alerts.
- **L4.** The API response and page payload include `redacted.replacements` with the `original` values, and the full `record`. That is fine for synthetic data and an authorised handler, but in production this map must never be logged or stored alongside AI output.
- **L5.** Held-back answer keys are public, so "held back" is a process promise, not a technical one. Commits also show a personal Gmail address.

## What is fine

- **Input handling.** `caseId` must be a string in the dev allow-list. `loadCase` and `loadSavedRun` both enforce `^HV-\d{3}$`. Tested locally: `../../.env`, arrays, held-back `HV-020` (saved and live) and bad JSON all return clean 404 or 400 errors. `/case/HV-020` is a 404.
- **Secrets.** `.env` is gitignored and was never committed (`sk-ant` count in full history is 0). No `NEXT_PUBLIC_` variables. No key strings in `.next/static`. The key is read only on the server.
- **Output handling.** No `dangerouslySetInnerHTML`, no AI-generated links or HTML. All AI and case text renders as escaped React text. localStorage parsing is wrapped in try/catch.
- **Prompt design.** Documents are wrapped and labelled as untrusted, and the case text is author-controlled, so a public visitor cannot inject anything.
- **Fallback.** Any API error, including an empty balance, returns the saved run with an honest note.
- **Logging.** Only case id, model, cost, latency and the error message are logged. No case text, no key.
- **Data protection claims.** The How this works page is careful. Redaction is "never claimed to be perfect", and production standards are explicitly not claimed.

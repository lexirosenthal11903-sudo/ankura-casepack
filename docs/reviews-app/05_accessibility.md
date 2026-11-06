# Accessibility review (WCAG 2.2 AA)

Tested 6 Nov 2026 with Playwright and axe-core on every page and state (all walkthrough steps, both case pages through accept, reject, sign-off, specialist view and send-back), plus a keyboard-only run, 320px, 200% zoom and text spacing. The foundations are good and axe finds no serious violations. The real gaps are focus after actions and an invisible skip link. Both are quick fixes.

## High

**1. Skip link never becomes visible (2.4.7, 2.4.1).** `layout.tsx:20` uses `.visually-hidden` (`globals.css:61`), which has no focus override. On the first Tab it measured 1x1px. Sighted keyboard users cannot see where focus is. The fix is a separate `.skip-link` class, like the GOV.UK one, that becomes static, full size and yellow on `:focus`.

**2. Focus drops to `<body>` after most actions (2.4.3).** I measured this after "Accept all" (the button disables itself, `Workspace.tsx:405`), after Edit (the textarea is not focused, `:295`), after Save or Cancel (`:311`, `:314`), after Sign off (the button is removed, `:558`), after the specialist Confirm (`:583`) and after "Approve and send" in the walkthrough (`Walkthrough.tsx:268`). A keyboard or screen reader user then starts again from the top of a 2,400px page. The fix is to focus the textarea on Edit and return focus to that statement's Edit button on Save or Cancel. After sign-off, Confirm and Approve, move focus to the new status message (`tabIndex={-1}` plus `ref.focus()`, the same pattern the walkthrough headings already use).

## Medium

**3. Rejected statements fail contrast (1.4.3).** `.statement.rejected { opacity: 0.55 }` (`workspace.module.css:30`) drops the text to 4.35:1, the tick to 2.5:1, the muted "Rejected" label to 2.51:1, the amber tag to 2.42:1 and the still-active Undo, Edit and Sources controls to 2.29:1. The fix is to drop the opacity. Keep the strikethrough and the "Rejected" text, and add a grey left border or a `--surface-alt` background instead.

**4. State changes are not announced (4.1.3).** The `role="status"` boxes (`Walkthrough.tsx:270`, `Workspace.tsx:360`) are added to the page in the same render as their text, so screen readers often stay silent. Sign-off, "Signed off" and "Accepted by" (`:564`, `:589`) have no live region at all. The fix is to keep one empty `aria-live="polite"` region mounted in the Sign-off panel and write the outcome into it. Item 2's focus move also covers most of this.

**5. Mobile step buttons are named "1" to "5" (2.4.6, 4.1.2).** At 860px and below, `.stepLabel { display: none }` (`walkthrough.module.css:25`) removes the label from the accessibility tree too. The fix is to swap it for the `visually-hidden` class at that breakpoint, or add `aria-label={`Step ${i + 1}, ${s}`}`.

**6. Three pages share one title (2.4.2).** `/`, `/queue` and `/case/[id]` all show "Case pack prototype | Harbour & Vale". The fix is to export `metadata` from `queue/page.tsx` and `generateMetadata` from `case/[id]/page.tsx`, for example "HV-007 Kieran Doyle | Case pack".

## Low

**7. The mobile queue hides its column headers (1.3.1).** `queue.module.css:8-9` turns the table into blocks and moves `thead` off screen. Sighted users lose the "Suggested team" and "Issue" labels, and iOS VoiceOver can drop the table semantics. The fix is to add explicit `role` attributes to the rows and cells, and a visible small label per cell through a `data-label` attribute.

**8. Headings inside `<summary>` (`Workspace.tsx:438, 457, 474`).** Some screen readers lose the expanded or collapsed state, and the `"▸ "` pseudo-content (`workspace.module.css:68`) is read aloud. The fix is to put the `<h3>` outside the summary, or keep the text plain, and write `content: "▸ " / ""` so the arrow is silent.

**9. The highlighted injection paragraph is only visual (1.3.1).** `<mark>` is not announced by most screen readers, yet the copy says "Notice the highlighted paragraph". The fix is to add visually hidden "Highlighted text starts" and "ends" around it.

**10. Smaller items.** The prototype banner sits outside all landmarks (axe `region`, `layout.tsx:33`) and should move inside `<header>`. The main nav has no `aria-current="page"`. The audit list scrolls (`workspace.module.css:60`) and should take `tabIndex={0}` plus an `aria-label`. Reject and Edit are 20px tall. That passes 2.5.8 through spacing, but 24px or more would be safer. A disabled Sign-off button with no reason is something GOV.UK advises against. The checklist above it explains why, so keep the button enabled and show an error summary on click.

## What is already good

- `lang="en-GB"`, a header, nav, main and footer landmarks, and a logical heading outline on every page (one h1, then h2 and h3 in order).
- The focus ring copies GOV.UK (yellow outline plus black ring) and was visible on every focusable element I tested.
- The walkthrough moves focus to the new h1 on each step and marks the current step with `aria-current="step"`.
- Native controls throughout. The toggles use `aria-pressed`, the radios sit in a `fieldset` with a `legend`, and the textarea and select are labelled.
- Checklist icons are `aria-hidden` and come with visually hidden status text. Colour is never the only signal, because every red or green item also has words.
- No default-state contrast failures on tags, muted text or placeholder chips.
- No horizontal scroll at 320px or at 200% zoom, and text spacing overrides hold.
- The whole case review can be finished by keyboard alone, from accepting statements through sign-off to the specialist send-back. It just loses your place each time (item 2).

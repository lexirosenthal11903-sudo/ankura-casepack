# 07 Bug hunt (QA, 6 Nov 2026)

Tested against `next start` on port 3123 with live mode off. Unit tests (31), `tsc`, lint and the data validator all pass. All 15 dev case pages render with no console errors or page errors. HV-016 to HV-025 return 404 on the page and the API. No overflow at 390px or 320px. Every deadline I worked out by hand matched the screen (HV-002 due today, HV-011 5 days overdue, HV-015 due 26 Nov with 13 business days left, 35-day date 24 Dec, 8-week date 31 Dec).

## Confirmed bugs

**1. Major. "Returned" is a dead end, so the send-back loop proves nothing.**
Steps: HV-001, Accept all, Sign off, choose No plus a reason, Confirm. The banner says "Fix the gap, then sign off again".
Expected: the handler can fill the missing checklist item. Actual: the checklist has no controls. Sign-off is enabled straight away with nothing changed, and the specialist sees the same "11 of 13, missing..." text again. The walkthrough step 5 also promises "The handler fills these gaps before sending". `Workspace.tsx:146` and `:532-545`.

**2. Major. "Accept all" accepts statements the handler never sees.**
Steps: open HV-001. The button says "Accept all 38 verified" but only 27 statements are on screen. The other 11 are `handover_checklist.*` statements (`casepack.ts:77-79`) that are never passed to `renderStatement`. They are logged as accepted in the export and count towards "Verified statements reviewed". If one of them were ever unsupported, sign-off would be blocked forever with nothing to click.

**3. Major. Edits are invisible on flags, routing, timeline and policy statements.**
Steps: HV-001, open Timeline, Edit the first event, type "HANDLER CORRECTED TEXT", Save edit.
Expected: the new text shows. Actual: the original text stays, with an "Edited by handler" tag. `renderStatement` shows `children` before the edited text (`Workspace.tsx:262`). The edit box also opens with the raw form "2026-10-22: ..." instead of the date shown on screen.

**4. Major. "Show real names" restores the wrong value.**
`restore` uses the first original seen for each placeholder (`redact.ts:363-366`).
- HV-001 summary 2 reads payee "J Mrs Ellison SAFE" (the source says "J ELLISON SAFE").
- HV-009 reads "Mr MR L. SUTCLIFE", a doubled title and the misspelling.
- HV-006 outcome reads "speak to DH" (initials, not Dean).
- Other first-seen forms are "Taz" (HV-002), "2264" for a full account number (HV-003) and "Mrs F Gallagher" where an address was the original elsewhere (HV-008).

It is never a different person, but a handler would put these in a letter.

**5. Major. Real names leak into edits, and the toggle stops hiding them.**
Steps: HV-001, names on, Edit summary 2, Save, untick Show real names. The statement still shows "Mrs Ellison". The edit box is filled from `show(text)` (`Workspace.tsx:295`), so the restored names are saved into the decision. They then appear in localStorage and in the exported audit JSON, which otherwise lists placeholders only.

**6. Major. Two tabs overwrite each other.**
Steps: open HV-003 in two tabs. Accept all in tab 1, then Reject one statement in tab 2, then reload tab 1. Tab 1's acceptances are gone ("Accept all 24 verified" again). Each tab writes its whole state on every change (`Workspace.tsx:124-131`) and nothing listens for the `storage` event.

**7. Minor. API returns 500 for a JSON `null` body.**
`curl -X POST -d 'null'` returns 500 with an empty body. Expected 400. `body.caseId` on null throws (`route.ts:25`).

**8. Minor. The deadline rule can be changed after a frontline sign-off.**
Steps: HV-015, Accept all, pick 8 weeks, Sign off, then pick 15 business days. The radios are only disabled for specialist stages (`Workspace.tsx:518`). The rule changes and the audit logs a handler decision after sign-off.

**9. Minor. A blank edit counts as a decision.**
Saving an empty edit box shows the original text with "Edited by handler" and clears that statement for sign-off (`Workspace.tsx:258`, `:311`).

**10. Minor. Undo is not written to the audit trail.**
Audit entries stayed at 5 before and after Undo (`Workspace.tsx:299`). The click counter goes up, so the trail and the counter disagree.

**11. Minor. The specialist form remembers the last send-back.**
After returned then re-sign-off, "No, send it back" and the old reason are still selected. `canAct` and `sendBackReason` are only cleared by Reset.

**12. Cosmetic. Reset leaves an open edit box open.**
Steps: click Edit, then Reset review. The textarea stays open (`reset` does not clear `editing`).

**13. Cosmetic. Large bodies are accepted.**
A 20 MB JSON body returned 200. Vercel caps bodies at 4.5 MB, but locally there is no limit.

## Suspected (not reproduced with the current data)

- **"0 business days left".** If a working due date falls on a weekend (a case received on a Saturday under the 8-week rule), the tag can read "0 business days left" a day early (`format.ts:22-26`). No current case hits this.
- **Live mode leaves old state behind.** A successful live run resets decisions but not `returnReason`, `canAct` or `editing` (`Workspace.tsx:159-161`). An open edit box could then point at a statement that no longer exists.
- **Quotes can match inside words.** The provenance check matches substrings, so a short quote can be found inside a longer word (`provenance.ts:57`). The 8-character minimum makes this unlikely.
- **No API size or rate limit.** The API reads all 25 case files on every request through `listCaseIds("dev")`. That is fine at demo scale.
- **Saved responses include the originals.** The API sends `redacted.replacements[].original` to the browser. That is needed for Show real names, and the data is synthetic. Worth one line in the write-up.

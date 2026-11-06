# Design review: GOV.UK fidelity, hierarchy, responsiveness

Reviewed 6 Nov 2026 at 1440, 1024 and 390 wide. Covers the walkthrough, the queue, HV-007 and HV-004 (including after Accept all, sign-off and the specialist view) and How this works.

## Verdict

This is a credible GOV.UK-style casework tool. It has none of the banned patterns, and it gets the square corners, palette and yellow focus ring right. The walkthrough is the strongest page. A GOV.UK designer would wince at three things. Tags are used as a highlighter. The most urgent facts sit in the third column, which drops to the bottom below 1440. Several home-made components sit where real ones exist.

## Fidelity to GOV.UK

- **Type.** The body text is 16px with 28/20/17 headings. GOV.UK uses 19px body text and 48/36/24 headings. That is fine for the dense workspace but wrong for the walkthrough and How this works.
- **Tags.** In the queue, 13 of 15 rows carry a green "N business days left" tag, which drowns out the two that matter. The tag text also differs between pages, "Instruction in text" against "instruction in customer text".
- **Callouts.** The blue boxes in steps 1 and 3 are home-made. Use inset text, and turn the amber strip into the phase banner.
- **Details.** Routing, Timeline and Policy look like headings with small triangles. Routing is a decision the handler signs, so it should not be hidden.
- **Summary lists.** Step 5 uses a proper summary list but the workspace deadlines do not.
- **Task list.** The sign-off conditions render as "• ✓" (a bullet and a tick together). This is the GOV.UK task list pattern.
- **Buttons.** The disabled button is a washed-out green rather than 50% opacity. The specialist Confirm button is full width while every other button is inline.
- **Step 5.** It lists six missing items and then offers "Approve and send".

## Case workspace hierarchy

The eye should land on the deadline status, then the flags, then what needs deciding. Instead it lands on the name and the raw email. At 1024 and 390 the deadlines drop below the whole case pack, about 4,000px down on mobile. "Window closed Thu 5 Nov" is plain black text when it is a missed regulatory step. Three columns suit 1440, but the order should follow priority (deadlines, pack, documents). A slim summary bar under the H1 would fix most of this. The saved-run box sits beside the H1 on HV-007 but wraps to its own row on HV-004, so the layout jumps between cases.

## Consistency and amateur tells

The pages switch between "business days" and "working days". Accepted items show grey text while edited ones get a blue tag. Only the right-hand column has thick blue rules. On How this works the purple AI row (the only non-GOV.UK colour) and the "↓" arrows look home-made.

## Responsive

There is no horizontal scroll at any size. At 390 the header nav wraps into three ragged columns. The queue stacks cleanly. On short pages at 1440 the footer floats mid-screen.

## Brand header

The dark blue is restrained and works. The 8px light-blue bottom rule copies the GOV.UK header too literally, so the bank reads as a government service. Make it 4px or remove it.

## Must fix

- **Case page deadlines.** Add a summary bar under the H1 with rule, due date, days left and team. Show "Window closed" as a red tag.
- **Case page below 1440.** Order the content deadlines, flags, sign-off, then documents.
- **Queue tags.** Drop the green tag on normal rows and show plain text. Keep red and amber only for overdue and due within five days.
- **Walkthrough step 5.** Change the button to "Fill the gaps in the workspace", or say the gaps get filled first.

## Should fix

- **Case page sign-off.** Use the GOV.UK task list with status tags.
- **Case page routing.** Show it expanded as a summary list row with a change link.
- **Walkthrough callouts.** Use inset text, and turn the prototype strip into a phase banner.
- **Walkthrough and How this works type.** Use 19px body text and 48/36/24 headings.
- **Terminology across pages.** Use "business days" everywhere and one case for tag text.

## Could improve

- **Header at mobile width.** Use the GOV.UK service navigation pattern.
- **Disabled buttons.** Use the standard green at 50% opacity.
- **How this works journey.** Remove the purple fill and the arrows.
- **Footer.** Pin it to the bottom on short pages.
